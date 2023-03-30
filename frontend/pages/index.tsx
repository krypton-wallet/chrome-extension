import React, { useEffect, useState } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import CreateAccount from "../components/CreateAccount";
import styled from "styled-components";
import { Keypair, PublicKey } from "@solana/web3.js";
import { useRouter } from "next/router";
import { useGlobalState } from "../context";
import bs58 from "bs58";
import { KeypairSigner } from "../types/account";

const Home: NextPage = () => {
  const router = useRouter();
  const { walletProgramId, account, setAccount, setPDA } = useGlobalState();
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    chrome.storage.sync.get(["sk"]).then(async (result) => {
      if (result.sk == undefined) {
        chrome.storage.sync.set({ counter: 1, currId: 1, accounts: "{}" });
        setVisible(true);
        return;
      }
      const currKeypair = Keypair.fromSecretKey(bs58.decode(result.sk));
      setAccount(new KeypairSigner(currKeypair));
      const profile_pda = PublicKey.findProgramAddressSync(
        [Buffer.from("profile", "utf-8"), currKeypair.publicKey.toBuffer()],
        walletProgramId
      );
      setPDA(profile_pda[0]);
      router.push("/wallet");
    });
  }, []);

  return (
    <>
      <Head>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
        <meta charSet="utf-8" />
        <title>SolMate</title>
        <meta
          name="description"
          content="Web3 tutorial for Solana crypto wallet."
        />
        <link rel="icon" href="/solmate_logo.ico" />
      </Head>
      {!visible && (
        <div style={{ minWidth: "600px", minHeight: "500px" }}></div>
      )}
      {visible && (
        <>
          <HomeTitle>
            a{" "}
            <a href="https://solana.com/" className="gradient-text">
              Solana
            </a>{" "}
            smart contract wallet with multisig social recovery
          </HomeTitle>
          <HomeGrid>
            <CreateAccount />
          </HomeGrid>
        </>
      )}
    </>
  );
};

const HomeTitle = styled.h1`
  padding: 0 3rem;
  margin: 1.7rem 1rem;
  line-height: 1.25;
  font-size: 1.7rem;
  font-weight: normal;
  text-align: center;
  color: #fff;
  & > a {
    color: #fff;
    text-decoration: none;

    &:hover,
    &:focus,
    &:active {
      text-decoration: underline;
    }
  }
`;

const HomeGrid = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  max-width: 2000px;
  width: 100%;
  height: 100%;
`;

export default Home;
