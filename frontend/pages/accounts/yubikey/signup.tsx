import { Button, Checkbox, Form, Select, Steps, Table } from "antd";
import { NextPage } from "next";
import { useRouter, withRouter } from "next/router";
import React, { useState } from "react";
import { useGlobalState } from "../../../context";
import {
  KeyOutlined,
  ArrowLeftOutlined,
  LoadingOutlined,
  CheckCircleFilled,
} from "@ant-design/icons";
import {
  generateAvatar,
  refreshBalance,
  sendAndConfirmTransactionWithAccount,
} from "../../../utils";
import bs58 from "bs58";
import { StyledForm } from "../../../styles/StyledComponents.styles";
import Link from "next/link";
import styles from "../../../components/Layout/index.module.css";
import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmRawTransaction,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { YubikeySigner } from "../../../types/account";
import BN from "bn.js";
import { useGlobalModalContext } from "../../../components/GlobalModal";
import PinentryModal from "../../../components/GlobalModal/PinentryModal";
import TouchConfirmModal from "../../../components/GlobalModal/TouchConfirmModal";
import { getAvatar } from "../../../utils/avatar";

const YubikeySignup: NextPage = () => {
  const router = useRouter();
  const {
    yubikeyInfo: info,
    walletProgramId,
    network,
    setBalance,
    setAccount,
    setPDA,
    setAvatar,
  } = useGlobalState();
  const [loading, setLoading] = useState<boolean>(false);
  const [current, setCurrent] = useState(0);
  const [steps, setSteps] = useState([
    "Confirming your signup...",
    "Initializing social wallet...",
  ]);
  const genSteps = [
    "Initializing avatar...",
    "Finding the environment...",
    "Picking the oufit...",
    "Fixing the hair...",
    "Choosing the eyes...",
    "Perfecting the smile...",
    "Adding finishing touches...",
  ];
  const [gen, setGen] = useState(0);
  const [shouldGen, setShouldGen] = useState<boolean>(false);

  const infoTable = [
    {
      key: "1",
      name: "Manufacturer",
      value: info?.manufacturer,
    },
    {
      key: "2",
      name: "Serial",
      value: info?.serialNumber,
    },
    {
      key: "3",
      name: "Manufacturer",
      value: info?.manufacturer,
    },
    {
      key: "4",
      name: "Manufacturer",
      value: info?.manufacturer,
    },
  ];
  const columns = [
    {
      title: "Key",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Value",
      dataIndex: "value",
      key: "value",
    },
  ];

  const [form] = Form.useForm();
  form.setFieldsValue({ thres: "2" });

  const handleChange = (value: string) => {
    form.setFieldsValue({ thres: value });
  };

  const handleCheckboxChange = (e: { target: { checked: boolean } }) => {
    setShouldGen(e.target.checked);
  };

  const { showModal, hideModal } = useGlobalModalContext();

  const handleOk = async (values: any) => {
    if (shouldGen) {
      setSteps((prev) => [...prev, "Generating unique avatar..."]);
    }
    setLoading(true);
    console.log("=====STARTING SIGNING UP======");
    const feePayer = new YubikeySigner(
      info?.aid!,
      (isRetry: boolean) => {
        const promise = new Promise<string>((resolve, reject) => {
          showModal(
            <PinentryModal
              title={`Please unlock YubiKey no. ${(
                info!.aid as string
              ).substring(20, 28)}`}
              isRetry={isRetry}
              onSubmitPin={(pin: string) => {
                hideModal();
                resolve(pin);
              }}
              onCancel={() => {
                hideModal();
                reject("User cancelled");
              }}
            ></PinentryModal>
          );
        });
        return promise;
      },
      () => {
        showModal(
          <TouchConfirmModal
            onCancel={() => {
              hideModal();
              console.log("User cancelled touch");
            }}
          ></TouchConfirmModal>
        );
      },
      hideModal
    );
    const ybPublicKey = await feePayer.getPublicKey();
    const profile_pda = PublicKey.findProgramAddressSync(
      [Buffer.from("profile", "utf-8"), ybPublicKey.toBuffer()],
      walletProgramId
    );
    const thres = Number(values.thres);
    console.log("input values: ", values);
    console.log("input thres: ", thres);
    setAccount(feePayer);
    setPDA(profile_pda[0]);

    const connection = new Connection("https://api.devnet.solana.com/");
    var count = 0;

    chrome.storage.local.get("y_counter", (res) => {
      count = res["y_counter"];
    });

    chrome.storage.local.get("y_accounts", (res) => {
      var accountRes = res["y_accounts"];
      if (accountRes != null) {
        var old = JSON.parse(accountRes);
        old[count] = {
          name: "Yubikey " + count.toString(),
          aid: info?.aid,
          manufacturer: info?.manufacturer,
          pk: ybPublicKey.toBase58(),
          pda: profile_pda[0].toBase58(),
        };
        var values = JSON.stringify(old);
        chrome.storage.local.set({
          y_accounts: values,
          y_counter: count + 1,
          y_id: count,
        });
      } else {
        return false;
      }
    });

    chrome.storage.local.set({ pk: ybPublicKey.toBase58(), mode: 1 });

    console.log("pk: ", ybPublicKey.toBase58());
    console.log("PDA: ", profile_pda[0].toBase58());
    console.log("program id: ", walletProgramId.toBase58());

    console.log("Requesting Airdrop of 0.2 SOL...");
    const signature = await connection.requestAirdrop(ybPublicKey, 2e8);
    await connection.confirmTransaction(signature, "finalized");
    console.log("Airdrop received");

    // instr 1: initialize social recovery wallet
    const idx = Buffer.from(new Uint8Array([0]));
    const acct_len = Buffer.from(new Uint8Array(new BN(0).toArray("le", 1)));
    const recovery_threshold = Buffer.from(
      new Uint8Array(new BN(thres).toArray("le", 1))
    );

    const initializeSocialWalletIx = new TransactionInstruction({
      keys: [
        {
          pubkey: profile_pda[0],
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: ybPublicKey,
          isSigner: true,
          isWritable: true,
        },
        {
          pubkey: SystemProgram.programId,
          isSigner: false,
          isWritable: false,
        },
      ],
      programId: walletProgramId,
      data: Buffer.concat([idx, acct_len, recovery_threshold]),
    });
    console.log("Initializing social wallet...");
    setCurrent((prev) => prev + 1);

    const recentBlockhash = await connection.getLatestBlockhash();
    let tx = new Transaction({
      feePayer: ybPublicKey,
      ...recentBlockhash,
    });
    tx.add(initializeSocialWalletIx);

    let txid = await sendAndConfirmTransactionWithAccount(
      connection,
      tx,
      [feePayer],
      {
        skipPreflight: true,
        preflightCommitment: "confirmed",
        commitment: "confirmed",
      }
    );
    console.log(`https://explorer.solana.com/tx/${txid}?cluster=devnet\n`);

    // Generating Avatar
    if (shouldGen) {
      console.log(`generating avatar for ${profile_pda[0]}...`);
      setCurrent((prev) => prev + 1);
      const avatarPK = await generateAvatar(
        connection,
        feePayer,
        profile_pda[0],
        () => setGen((prev) => prev + 1)
      );
      const avatarData = await getAvatar(connection, avatarPK);
      const avatarSVG = `data:image/svg+xml;base64,${avatarData?.toString(
        "base64"
      )}`;
      setAvatar(avatarSVG);
      chrome.storage.local.get("y_accounts", (res) => {
        const accountRes = res["y_accounts"];
        if (accountRes != null) {
          const old = JSON.parse(accountRes);
          old[count].avatar = avatarPK.toBase58();
          const values = JSON.stringify(old);
          chrome.storage.local.set({
            y_accounts: values,
          });
        } else {
          return false;
        }
      });
    } else {
      setAvatar(undefined);
    }
    setCurrent((prev) => prev + 1);

    refreshBalance(network, feePayer)
      .then((updatedBalance) => {
        console.log("updated balance: ", updatedBalance);
        setBalance(updatedBalance);
      })
      .catch((err) => {
        console.log(err);
      });

    setTimeout(() => router.push("/wallet"), 1000);
  };

  if (loading) {
    return (
      <>
        <Steps
          direction="vertical"
          size="small"
          current={current}
          style={{ margin: "auto" }}
        >
          {steps.map((item, idx) => {
            return (
              <Steps.Step
                key={item}
                title={
                  <span
                    style={{
                      color:
                        current === idx
                          ? "#fff"
                          : current > idx
                          ? "#415bf5"
                          : "#b3b3b3",
                    }}
                  >
                    {item}
                  </span>
                }
                style={{ width: "fit-content", marginLeft: "2rem" }}
                icon={
                  current === idx ? (
                    <LoadingOutlined style={{ color: "#fff" }} spin />
                  ) : current > idx ? (
                    <div
                      style={{ borderRadius: "50%", backgroundColor: "#fff" }}
                    >
                      <CheckCircleFilled style={{ color: "#415bf5" }} />
                    </div>
                  ) : (
                    <CheckCircleFilled style={{ color: "#b3b3b3" }} />
                  )
                }
              />
            );
          })}
        </Steps>
        {shouldGen && current >= steps.length - 1 && (
          <Steps
            direction="vertical"
            size="small"
            current={gen}
            progressDot
            style={{ marginLeft: "20%" }}
          >
            {genSteps.map((item, idx) => {
              return (
                <Steps.Step
                  key={item}
                  title={
                    <span
                      style={{
                        color:
                          gen === idx
                            ? "#fff"
                            : gen > idx
                            ? "#415bf5"
                            : "#b3b3b3",
                      }}
                    >
                      {item}
                    </span>
                  }
                  style={{ width: "fit-content", marginLeft: "2rem" }}
                />
              );
            })}
          </Steps>
        )}
      </>
    );
  }

  return (
    <>
      <h1 className={"title"}>Initialize YubiKey Wallet</h1>
      <div>
        <KeyOutlined style={{ fontSize: "50px", color: "#fff" }} />
        <Table
          dataSource={infoTable}
          columns={columns}
          pagination={false}
          showHeader={false}
        />
      </div>
      <p style={{ textAlign: "center" }}>
        Select how many guardians are required to recover your wallet
      </p>
      <StyledForm
        form={form}
        layout="vertical"
        autoComplete="off"
        requiredMark={false}
        onFinish={handleOk}
      >
        <div style={{ overflow: "hidden" }}>
          <Form.Item name="thres">
            <Select
              defaultValue="2"
              style={{ width: 150 }}
              onChange={handleChange}
              options={[
                { value: "2", label: "2" },
                { value: "3", label: "3" },
                { value: "4", label: "4" },
                { value: "5", label: "5" },
              ]}
            />
          </Form.Item>
        </div>
        <Form.Item>
          <Checkbox
            checked={shouldGen}
            onChange={handleCheckboxChange}
            style={{ color: "#fff" }}
          >
            <p>Generate unique avatar for your PublicKey?</p>
          </Checkbox>
        </Form.Item>

        <Form.Item shouldUpdate className="submit">
          {() => (
            <Button htmlType="submit" type="primary">
              Generate
            </Button>
          )}
        </Form.Item>
        <Link href="/" passHref>
          <a className={styles.back}>
            <ArrowLeftOutlined /> Back Home
          </a>
        </Link>
      </StyledForm>
    </>
  );
};

export default withRouter(YubikeySignup);

/*
<h2 style={{ fontWeight: "bold", color: "#fff" }}>{`${info?.manufacturer} Card (no. ${info?.serialNumber})`}</h2>
      <p style={{ color: "#bbb" }}><b>OpenPGP AID:</b> {info?.aid}</p>
      <p style={{ color: "#bbb" }}><b>Signing algorithm:</b> {info?.signingAlgo}</p>
      <p style={{ color: "#bbb" }}><b>Public key:</b> {displayAddress(bs58.encode(info?.pubkeyBytes ?? []))}</p>
*/
