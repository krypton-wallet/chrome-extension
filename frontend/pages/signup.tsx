import React, { useEffect, useState } from "react";
import { NextPage } from "next";
import { Button, Form, Select } from "antd";
import { useGlobalState } from "../context";
import { LoadingOutlined, ArrowLeftOutlined } from "@ant-design/icons";
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
} from "@solana/web3.js";
import Paragraph from "antd/lib/skeleton/Paragraph";
import { Box, StyledForm } from "../styles/StyledComponents.styles";
import form from "antd/lib/form";

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
import { refreshBalance } from "../utils";
import Link from "next/link";
import styles from "../components/Layout/index.module.css";

const BN = require("bn.js");

const Signup: NextPage = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [visible, setVisible] = useState<boolean>(false);
  const { setAccount, account, setPDA, walletProgramId, network, setBalance } =
    useGlobalState();

  const router = useRouter();
  const [form] = Form.useForm();
  form.setFieldsValue({ thres: "2" });

  const handleChange = (value: string) => {
    form.setFieldsValue({ thres: value });
  };

  const handleOk = async (values: any) => {
    setLoading(true);
    console.log("=====STARTING SIGNING UP======");
    const feePayer = new Keypair();
    const profile_pda = PublicKey.findProgramAddressSync(
      [Buffer.from("profile", "utf-8"), feePayer.publicKey.toBuffer()],
      walletProgramId
    );
    const thres = Number(values.thres);
    console.log("input thres: ", thres);
    setAccount(feePayer);
    setPDA(profile_pda[0]);

    const connection = new Connection("https://api.devnet.solana.com/");
    const secretKey = base58.encode(feePayer.secretKey);
    const publicKey = feePayer.publicKey.toBase58();
    var count = 0;

    chrome.storage.sync.get("counter", (res) => {
      count = res["counter"];
    });

    chrome.storage.sync.get("accounts", (res) => {
      var accountRes = res["accounts"];
      if (accountRes != null) {
        var old = JSON.parse(accountRes);
        old[count] = {
          name: "Account " + count.toString(),
          sk: secretKey,
          pk: publicKey,
          pda: profile_pda[0].toBase58()
        };
        var values = JSON.stringify(old);
        chrome.storage.sync.set({ accounts: values, counter: count + 1, currId: count });
      } else {
        return false;
      }
    });

    chrome.storage.sync.set({ sk: base58.encode(feePayer.secretKey) });

    console.log("pk: ", feePayer.publicKey.toBase58());
    console.log("PDA: ", profile_pda[0].toBase58());
    console.log("program id: ", walletProgramId.toBase58());

    console.log("Requesting Airdrop of 0.2 SOL...");
    const signature = await connection.requestAirdrop(feePayer.publicKey, 2e8);
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
    let tx = new Transaction();
    tx.add(initializeSocialWalletIx);

    let txid = await sendAndConfirmTransaction(connection, tx, [feePayer], {
      skipPreflight: true,
      preflightCommitment: "confirmed",
      commitment: "confirmed",
    });
    console.log(`https://explorer.solana.com/tx/${txid}?cluster=devnet\n`);

    // CREATE TOKEN ACCOUNT & AIRDROP for TESTING!

    console.log("Creating mint account...");
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

    console.log(profile_pda)

    console.log("Getting associated token address...");
    const associatedToken = await getAssociatedTokenAddress(
      customMint,
      profile_pda[0],
      true,
      TOKEN_PROGRAM_ID
    );

    console.log("Creating token account for mint...");
    const createTA_tx = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        feePayer.publicKey,
        associatedToken,
        profile_pda[0],
        customMint,
        TOKEN_PROGRAM_ID
      )
    );

    await sendAndConfirmTransaction(connection, createTA_tx, [feePayer], {
      skipPreflight: true,
      preflightCommitment: "confirmed",
      commitment: "confirmed",
    });

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
    const createNFT_TA_tx = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        feePayer.publicKey,
        associatedNFTToken,
        profile_pda[0],
        nftMint,
        TOKEN_PROGRAM_ID
      )
    );

    await sendAndConfirmTransaction(connection, createNFT_TA_tx, [feePayer], {
      skipPreflight: true,
      preflightCommitment: "confirmed",
      commitment: "confirmed",
    });

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

    // console.log("Creating token account for native SOL...");
    // const senderSOLTokenAccount = await getOrCreateAssociatedTokenAccount(
    //   connection,
    //   feePayer,
    //   sol_pk,
    //   profile_pda[0],
    //   true
    // );
    // console.log(
    //   "token account created: " +
    //     senderSOLTokenAccount.address.toBase58() +
    //     "\n"
    // );

    // // transfer SOL to sender token account (MINTING)
    // const transferSOLtoSender = SystemProgram.transfer({
    //   fromPubkey: feePayer.publicKey,
    //   toPubkey: senderSOLTokenAccount.address,
    //   lamports: 1e8,
    // });

    // tx = new Transaction()
    //   .add(transferSOLtoSender)
    //   .add(createSyncNativeInstruction(senderSOLTokenAccount.address));

    // console.log("Transfer SOL to sender account...");
    // let getSOL_txid = await sendAndConfirmTransaction(
    //   connection,
    //   tx,
    //   [feePayer],
    //   {
    //     skipPreflight: true,
    //     preflightCommitment: "confirmed",
    //     commitment: "confirmed",
    //   }
    // );
    // console.log(
    //   `https://explorer.solana.com/tx/${getSOL_txid}?cluster=devnet\n`
    // );

    // const senderSOLTokenAccountBalance =
    //   await connection.getTokenAccountBalance(senderSOLTokenAccount.address);
    // console.log(
    //   `Sender SOL Token Account Balance: ${senderSOLTokenAccountBalance.value.amount}\n`
    // );

    // const senderTokenAccountBalance = await connection.getTokenAccountBalance(
    //   associatedToken
    // );
    // console.log(
    //   `Sender Token Account Balance: ${senderTokenAccountBalance.value.amount}\n`
    // );

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

  return (
    <>
      <h1 className={"title"}>Create New Wallet</h1>

      {!loading && (
        <p style={{ textAlign: "center" }}>
          Select how many guardians are required to recover your wallet & click{" "}
          <b>Generate</b> to create new keypair
        </p>
      )}
      {loading && <p>Confirming your signup...</p>}
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
        <LoadingOutlined style={{ fontSize: 24, color: "#fff" }} spin />
      )}
    </>
  );
};

export default Signup;
