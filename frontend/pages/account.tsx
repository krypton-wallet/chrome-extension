import React, { useEffect, useState } from "react";
import { NextPage } from "next";
import { Typography } from "antd";
import { useGlobalState } from "../context";
import {
  Dashboard,
} from "../styles/StyledComponents.styles";
import {
  PublicKey,
} from "@solana/web3.js";
import bs58 from "bs58";

const { Paragraph } = Typography;
const programId = new PublicKey(
  "2aJqX3GKRPAsfByeMkL7y9SqAGmCQEnakbuHJBdxGaDL"
);

const Account: NextPage = () => {
  const { account, pda } =
    useGlobalState();

  const displayAddress = (address: string) =>
    `${address.slice(0, 4)}...${address.slice(-4)}`;

  return (
    <>
      {account && (
        <Dashboard>
          <h1>Account Info</h1>

          <Paragraph
            copyable={{ text: account.publicKey.toBase58(), tooltips: `Copy` }}
          >
            {`Keypair Pubkey: ${displayAddress(account.publicKey.toBase58())}`}
          </Paragraph>

          <Paragraph
            copyable={{ text: pda?.toBase58(), tooltips: `Copy` }}
          >
            {`Wallet(PDA) Pubkey: ${displayAddress(pda?.toBase58() ?? "")}`}
          </Paragraph>
        </Dashboard>
      )}
    </>
  );
};

export default Account;