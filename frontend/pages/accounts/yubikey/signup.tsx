import { Button, Form, Select, Table } from "antd";
import { NextPage } from "next";
import { useRouter, withRouter } from "next/router";
import React, { useState } from "react";
import { useGlobalState } from "../../../context";
import {
  KeyOutlined,
  ArrowLeftOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import {
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

const YubikeySignup: NextPage = () => {
  const router = useRouter();
  const {
    yubikeyInfo: info,
    walletProgramId,
    network,
    setBalance,
    setAccount,
    setPDA,
  } = useGlobalState();
  const [loading, setLoading] = useState<boolean>(false);

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

  const handleOk = async (values: any) => {
    setLoading(true);
    console.log("=====STARTING SIGNING UP======");
    const feePayer = new YubikeySigner(info?.aid!);
    const ybPublicKey = await feePayer.getPublicKey();
    const profile_pda = PublicKey.findProgramAddressSync(
      [Buffer.from("profile", "utf-8"), ybPublicKey.toBuffer()],
      walletProgramId
    );
    const thres = Number(values.thres);
    console.log("input values: ", values)
    console.log("input thres: ", thres);
    setAccount(feePayer);
    setPDA(profile_pda[0]);

    const connection = new Connection("https://api.devnet.solana.com/");
    var count = 0;

    chrome.storage.sync.get("y_counter", (res) => {
      count = res["y_counter"];
    });

    chrome.storage.sync.get("y_accounts", (res) => {
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
        chrome.storage.sync.set({
          y_accounts: values,
          y_counter: count + 1,
          y_id: count,
        });
      } else {
        return false;
      }
    });

    chrome.storage.sync.set({ pk: ybPublicKey.toBase58(), mode: 1 });

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

    refreshBalance(network, feePayer)
      .then((updatedBalance) => {
        console.log("updated balance: ", updatedBalance);
        setBalance(updatedBalance);
      })
      .catch((err) => {
        console.log(err);
      });

    router.push("/wallet");
  };

  // Demo code that runs once component is loaded.
  // Transfer SOL from big yubi to small yubi using yubikey version of sendAndConfirmTransaction.
  // useEffect(() => {
  //   const bigYubi = "D2760001240103040006205304730000";
  //   const smallYubi = "D2760001240103040006223637020000";

  //   const demo = async () => {
  //     const from = new PublicKey(await getPubkey(bigYubi));
  //     const to = new PublicKey(await getPubkey(smallYubi));

  //     const connection = new Connection("https://api.devnet.solana.com/");

  //     const recentBlockhash = await connection.getLatestBlockhash();
  //     let transaction = new Transaction({
  //       feePayer: from,
  //       ...recentBlockhash,
  //     }).add(
  //       SystemProgram.transfer({
  //         fromPubkey: from,
  //         toPubkey: to,
  //         lamports: 1000,
  //       })
  //     );

      // const sig = await sendAndConfirmTransactionWithAccount(
      //   connection,
      //   transaction,

      //   /// Example of initializing YubikeySigner with callbacks that open
      //   /// global modals to collect pin from user and prompt for touch
      //   /// confirmation. Uses the functions provided in useGlobalModalContext()
      //   /// to control global modals.
      //   [new YubikeySigner(
      //     bigYubi,
      //     (isRetry: boolean) => {
      //       const promise = new Promise<string>((resolve, reject) => {
      //         showModal(
      //           <PinentryModal
      //             title={"Please unlock your YubiKey"}
      //             description={`Enter PIN for YubiKey ${bigYubi}`}
      //             isRetry={isRetry}
      //             onSubmitPin={(pin: string) => {
      //               hideModal();
      //               resolve(pin);
      //             }}
      //             onCancel={() => {
      //               hideModal();
      //               reject("User cancelled");
      //             }}
      //           ></PinentryModal>
      //         );
      //       })
      //       return promise;
      //     },
      //     () => {
      //       showModal(
      //         <TouchConfirmModal
      //           onCancel={() => {
      //             hideModal();
      //             console.log("User cancelled touch");
      //           }}
      //         ></TouchConfirmModal>);
      //     },
      //     hideModal,
      //   )],
      // );

  //     return sig;
  //   };

  //   demo().then((sig) => console.log(`SIGNATURE: ${sig}`));
  // }, []);

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
      {!loading && (
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
      )}
      {loading && (
        <LoadingOutlined
          style={{ fontSize: 24, color: "#fff", marginTop: "25px" }}
          spin
        />
      )}
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
