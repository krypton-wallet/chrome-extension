import React, { useEffect, useState } from "react";
import { NextPage } from "next";
import { useRouter } from "next/router";
import { Form, Input, Button } from "antd";
import { useGlobalState } from "../../../context";
import { ArrowLeftOutlined } from "@ant-design/icons";
import styled from "styled-components";
import { displayAddress } from "../../../utils";
import { Connection, PublicKey } from "@solana/web3.js";
import styles from "../../../components/Layout/index.module.css";
import {
  getOrCreateAssociatedTokenAccount,
  AccountLayout,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  getAccount,
  transferChecked,
  getMint,
} from "@solana/spl-token";
import Link from "next/link";

// Import the Keypair class from Solana's web3.js library:

const Token: NextPage = () => {
  const router = useRouter();
  const { pda } = useGlobalState();
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [decimals, setDecimals] = useState<number>(1);
  let { pk } = router.query;
  if (!pk) {
    pk = "";
  }
  if (Array.isArray(pk)) {
    pk = pk[0];
  }
  const mint_pk = pk ? new PublicKey(pk) : PublicKey.default;
  const connection = new Connection("https://api.devnet.solana.com/");

  useEffect(() => {
    const getMintInfo = async () => {
      console.log("Getting src token account...");
      const srcAssociatedToken = await getAssociatedTokenAddress(
        mint_pk,
        pda ?? PublicKey.default,
        true,
        TOKEN_PROGRAM_ID
      );
      const srcTokenAccount = await getAccount(
        connection,
        srcAssociatedToken,
        "confirmed",
        TOKEN_PROGRAM_ID
      );
      console.log(`Src Token Account: ${srcTokenAccount.address.toBase58()}`);

      const tokenAccountData = await getAccount(
        connection,
        srcTokenAccount.address
      );
      const balance = Number(tokenAccountData.amount);
      const mintData = await getMint(connection, mint_pk);
      const decimals = Number(mintData.decimals);
      setTokenBalance(balance);
      setDecimals(decimals);
      console.log("DESIRED BALANCE: ", balance)
      console.log("CURRENT BALANCE: ", tokenBalance)
    };
    getMintInfo();
  }, [router]);

  const handleClick = () => {
    router.push({
      pathname: "/token/[pk]/send",
      query: { pk: pk },
    });
  };

  return (
    <>
      <h2 className={"title"}>{displayAddress(pk)}</h2>
      <img
        style={{
          alignItems: "center",
          width: "23%",
          height: "20%",
          margin: "20px 20px",
        }}
        src="/static/images/token.png"
      ></img>
      {/* <p>{tokenBalance / Math.pow(10, decimals)} tokens</p> */}
      <Button
        type="primary"
        //   loading={loading}
        style={{ width: "140px", height: "40px", fontSize: "17px" }}
        onClick={handleClick}
      >
        Send
      </Button>
      <Link href="/wallet" passHref>
        <a className={styles.back}>
          <ArrowLeftOutlined /> Back Home
        </a>
      </Link>
    </>
  );
};

export default Token;
