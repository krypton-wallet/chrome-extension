import React, { useEffect, useState } from "react";
import { NextPage } from "next";
import { Button, Checkbox, Form, Select, Steps } from "antd";
import { useGlobalState } from "../context";
import {
  LoadingOutlined,
  ArrowLeftOutlined,
  CheckCircleFilled,
} from "@ant-design/icons";
import { useRouter } from "next/router";

import {
  Connection,
  Keypair,
  NONCE_ACCOUNT_LENGTH,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { StyledForm } from "../styles/StyledComponents.styles";

import {
  getOrCreateAssociatedTokenAccount,
  AccountLayout,
  TOKEN_PROGRAM_ID,
  createSyncNativeInstruction,
  mintTo,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  getAccount,
  createMint,
  createSetAuthorityInstruction,
  AuthorityType,
  setAuthority,
} from "@solana/spl-token";
import base58 from "bs58";
import {
  generateAvatar,
  refreshBalance,
  sendAndConfirmTransactionWithAccount,
} from "../utils";
import Link from "next/link";
import styles from "../components/Layout/index.module.css";
import { KeypairSigner } from "../types/account";
import BN from "bn.js";
import { getAvatar } from "../utils/avatar";
import { REFILL_TO_BALANCE, TEST_INITIAL_BALANCE_FAILURE } from "../utils/constants";

const Signup: NextPage = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [current, setCurrent] = useState(0);
  const [steps, setSteps] = useState([
    "Confirming your signup...",
    "Initializing social wallet...",
    "Creating mint account...",
    "Creating token account for mint...",
    "Minting to NFT token account...",
    "Disabling future minting...",
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
  const [visible, setVisible] = useState<boolean>(false);
  const [shouldGen, setShouldGen] = useState<boolean>(false);
  const {
    setAccount,
    account,
    setPDA,
    walletProgramId,
    network,
    setBalance,
    setAvatar,
  } = useGlobalState();

  const router = useRouter();
  const [form] = Form.useForm();
  form.setFieldsValue({ thres: "2" });

  const handleChange = (value: string) => {
    form.setFieldsValue({ thres: value });
  };

  const handleCheckboxChange = (e: { target: { checked: boolean } }) => {
    setShouldGen(e.target.checked);
  };

  const handleOk = async (values: any) => {
    if (shouldGen) {
      setSteps((prev) => [...prev, "Generating unique avatar..."]);
    }
    setLoading(true);
    console.log("=====STARTING SIGNING UP======");
    const feePayer = new Keypair();
    const profile_pda = PublicKey.findProgramAddressSync(
      [Buffer.from("profile", "utf-8"), feePayer.publicKey.toBuffer()],
      walletProgramId
    );
    const thres = Number(values.thres);
    console.log("input thres: ", thres);
    setAccount(new KeypairSigner(feePayer));
    setPDA(profile_pda[0]);

    const connection = new Connection("https://api.devnet.solana.com/");
    const secretKey = base58.encode(feePayer.secretKey);
    const publicKey = feePayer.publicKey.toBase58();
    var count = 0;

    chrome.storage.local.get("counter", (res) => {
      count = res["counter"];
    });

    chrome.storage.local.get("accounts", (res) => {
      var accountRes = res["accounts"];
      if (accountRes != null) {
        var old = JSON.parse(accountRes);
        old[count] = {
          name: "Account " + count.toString(),
          sk: secretKey,
          pk: publicKey,
          pda: profile_pda[0].toBase58(),
        };
        var values = JSON.stringify(old);
        chrome.storage.local.set({
          accounts: values,
          counter: count + 1,
          currId: count,
        });
      } else {
        return false;
      }
    });

    chrome.storage.local.set({ pk: feePayer.publicKey.toBase58(), mode: 0 });

    console.log("pk: ", feePayer.publicKey.toBase58());
    console.log("PDA: ", profile_pda[0].toBase58());
    console.log("program id: ", walletProgramId.toBase58());

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
          pubkey: feePayer.publicKey,
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
    const messageV0 = new TransactionMessage({
      payerKey: feePayer.publicKey,
      recentBlockhash: recentBlockhash.blockhash,
      instructions: [initializeSocialWalletIx],
    }).compileToV0Message();
    const tx = new VersionedTransaction(messageV0);
    tx.sign([feePayer]);

    // const fee = (await connection.getFeeForMessage(messageV0)).value;
    // console.log("txFEE: ", fee)
    // const rent_exempt_fee = await connection.getMinimumBalanceForRentExemption(0);
    // console.log("rent exempt FEE: ", rent_exempt_fee);
    // const rent_exempt_fee_PDA = await connection.getMinimumBalanceForRentExemption(325);
    // console.log("rent exempt PDA FEE: ", rent_exempt_fee_PDA);

    console.log("Requesting Airdrop of 0.2 SOL...");
    const signature = await connection.requestAirdrop(
      feePayer.publicKey,
      REFILL_TO_BALANCE
    );
    await connection.confirmTransaction(signature, "finalized");
    console.log("Airdrop received");

    let txid = await connection.sendTransaction(tx);

    // let tx = new Transaction({
    //   feePayer: feePayer.publicKey,
    //   ...recentBlockhash,
    // });
    // tx.add(initializeSocialWalletIx);

    // let txid = await sendAndConfirmTransactionWithAccount(
    //   connection,
    //   tx,
    //   [new KeypairSigner(feePayer)],
    //   {
    //     skipPreflight: true,
    //     preflightCommitment: "confirmed",
    //     commitment: "confirmed",
    //   }
    // );
    console.log(`https://explorer.solana.com/tx/${txid}?cluster=devnet\n`);

    // CREATE TOKEN ACCOUNT & AIRDROP for TESTING!

    console.log("Creating mint account...");
    setCurrent((prev) => prev + 1);
    const customMint = await createMint(
      connection,
      feePayer,
      feePayer.publicKey,
      null,
      9
    );
    console.log("Mint created: ", customMint.toBase58());

    // Create Token Account for custom mint
    // console.log("Creating token account for mint...");
    // const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
    //   connection,
    //   feePayer,
    //   customMint,
    //   profile_pda[0],
    //   true
    // );
    // console.log(
    //   "token account created: " + senderTokenAccount.address.toBase58() + "\n"
    // );

    console.log(profile_pda);

    console.log("Getting associated token address...");
    const associatedToken = await getAssociatedTokenAddress(
      customMint,
      profile_pda[0],
      true,
      TOKEN_PROGRAM_ID
    );

    console.log("Creating token account for mint...");
    setCurrent((prev) => prev + 1);
    const recentBlockhash1 = await connection.getLatestBlockhash();
    const createTA_tx = new Transaction({
      feePayer: feePayer.publicKey,
      ...recentBlockhash1,
    });
    createTA_tx.add(
      createAssociatedTokenAccountInstruction(
        feePayer.publicKey,
        associatedToken,
        profile_pda[0],
        customMint,
        TOKEN_PROGRAM_ID
      )
    );

    await sendAndConfirmTransactionWithAccount(
      connection,
      createTA_tx,
      [new KeypairSigner(feePayer)],
      {
        skipPreflight: true,
        preflightCommitment: "confirmed",
        commitment: "confirmed",
      }
    );

    console.log("Getting sender token account...");
    const senderTokenAccount = await getAccount(
      connection,
      associatedToken,
      "confirmed",
      TOKEN_PROGRAM_ID
    );

    console.log(
      "token account created: " + senderTokenAccount.address.toBase58() + "\n"
    );

    // Mint to token account (MINTING)
    console.log("Minting to token account...");
    await mintTo(
      connection,
      feePayer,
      customMint,
      associatedToken,
      feePayer,
      6e9,
      [],
      {
        skipPreflight: true,
        preflightCommitment: "confirmed",
        commitment: "confirmed",
      },
      TOKEN_PROGRAM_ID
    );
    console.log("Minted!\n");

    // CREATING NFT

    console.log("Creating nft mint account...");
    const nftMint = await createMint(
      connection,
      feePayer,
      feePayer.publicKey,
      null,
      0
    );
    console.log("NFT created: ", nftMint.toBase58());

    console.log("Getting associated token address...");
    const associatedNFTToken = await getAssociatedTokenAddress(
      nftMint,
      profile_pda[0],
      true,
      TOKEN_PROGRAM_ID
    );

    console.log("Creating token account for NFT...");
    const recentBlockhash2 = await connection.getLatestBlockhash();
    const createNFT_TA_tx = new Transaction({
      feePayer: feePayer.publicKey,
      ...recentBlockhash2,
    });
    createNFT_TA_tx.add(
      createAssociatedTokenAccountInstruction(
        feePayer.publicKey,
        associatedNFTToken,
        profile_pda[0],
        nftMint,
        TOKEN_PROGRAM_ID
      )
    );

    await sendAndConfirmTransactionWithAccount(
      connection,
      createNFT_TA_tx,
      [new KeypairSigner(feePayer)],
      {
        skipPreflight: true,
        preflightCommitment: "confirmed",
        commitment: "confirmed",
      }
    );

    console.log("Getting sender token account...");
    const senderNFTTokenAccount = await getAccount(
      connection,
      associatedNFTToken,
      "confirmed",
      TOKEN_PROGRAM_ID
    );

    console.log(
      "NFT token account created: " +
        senderNFTTokenAccount.address.toBase58() +
        "\n"
    );

    // Mint to NFT token account (MINTING)
    console.log("Minting to NFT token account...");
    setCurrent((prev) => prev + 1);
    await mintTo(
      connection,
      feePayer,
      nftMint,
      associatedNFTToken,
      feePayer,
      1,
      [],
      {
        skipPreflight: true,
        preflightCommitment: "confirmed",
        commitment: "confirmed",
      },
      TOKEN_PROGRAM_ID
    );
    console.log("Minted!\n");

    console.log("Disabling future minting...");
    setCurrent((prev) => prev + 1);
    await setAuthority(
      connection,
      feePayer,
      nftMint,
      feePayer,
      AuthorityType.MintTokens,
      null,
      [],
      {
        skipPreflight: true,
        preflightCommitment: "confirmed",
        commitment: "confirmed",
      },
      TOKEN_PROGRAM_ID
    );
    console.log("Disabled!");

    // Generating Avatar
    if (shouldGen) {
      console.log(`generating avatar for ${profile_pda[0]}...`);
      setCurrent((prev) => prev + 1);
      const avatarPK = await generateAvatar(
        connection,
        new KeypairSigner(feePayer),
        profile_pda[0],
        () => setGen((prev) => prev + 1)
      );
      const avatarData = await getAvatar(connection, avatarPK);
      const avatarSVG = `data:image/svg+xml;base64,${avatarData?.toString(
        "base64"
      )}`;
      setAvatar(avatarSVG);
      chrome.storage.local.get("accounts", (res) => {
        const accountRes = res["accounts"];
        if (accountRes != null) {
          const old = JSON.parse(accountRes);
          old[count].avatar = avatarPK.toBase58();
          const values = JSON.stringify(old);
          chrome.storage.local.set({
            accounts: values,
          });
        } else {
          return false;
        }
      });
    } else {
      setAvatar(undefined);
    }
    setCurrent((prev) => prev + 1);

    refreshBalance(network, new KeypairSigner(feePayer))
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
      <h1 className={"title"}>Create New Wallet</h1>

      <p style={{ textAlign: "center" }}>
        Select how many guardians are required to recover your wallet & click{" "}
        <b>Generate</b> to create new keypair
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

export default Signup;
