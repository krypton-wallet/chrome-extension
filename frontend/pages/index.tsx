import React, { useEffect } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import CreateAccount from "../components/CreateAccount";
import styled from "styled-components";
import { Keypair, PublicKey } from "@solana/web3.js";
import { useRouter } from "next/router";
import { useGlobalState } from "../context";
import bs58 from "bs58";

const Home: NextPage = () => {
  const router = useRouter();
  const { walletProgramId, account, setAccount, setPDA } = useGlobalState();

  useEffect(() => {
    chrome.storage.sync.get(["sk"]).then(async (result) => {
      if (result.sk == undefined) {
        router.push("/");
        return;
      }
      //console.log("Value currently is " + result.sk);
      const currKeypair = Keypair.fromSecretKey(bs58.decode(result.sk));
      setAccount(currKeypair);
      //console.log("account: ", account?.publicKey.toBase58());
      const profile_pda = PublicKey.findProgramAddressSync(
        [
          Buffer.from("profile", "utf-8"),
          account?.publicKey.toBuffer() ?? new Buffer(""),
        ],
        walletProgramId
      );
      setPDA(profile_pda[0]);
      //console.log("PDA: ", profile_pda[0].toBase58());
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
  );
};

const HomeTitle = styled.h1`
  padding: 0 3rem;
  margin: 1.5rem 1rem;
  line-height: 1.25;
  font-size: 1.45rem;
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
`;

export default Home;
