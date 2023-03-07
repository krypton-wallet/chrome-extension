import React, { useEffect } from "react";
import type { NextPage } from "next";
import Head from "next/head";
import CreateAccount from "../components/CreateAccount";
import styled from "styled-components";
import LoginAccount from "../components/LoginAccount";
import RestoreAccount from "../components/RestoreAccount";
import {
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SendOptions,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import { useRouter } from "next/router";
import { useGlobalState } from "../context";
import bs58 from "bs58";
import { initialize } from '../../wallet-standard';
import { Solmate, SolmateEvent } from '../../wallet-standard/src/window';

const Home: NextPage = () => {
  const router = useRouter();
  const {
    network,
    balance,
    setBalance,
    account,
    setAccount,
    setPDA,
    setProgramId,
  } = useGlobalState();
  const programId = new PublicKey(
    "2aJqX3GKRPAsfByeMkL7y9SqAGmCQEnakbuHJBdxGaDL"
  );

  useEffect(() => {
    setProgramId(programId);
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
        programId ?? PublicKey.default
      );
      setPDA(profile_pda[0]);
      //console.log("PDA: ", profile_pda[0].toBase58());

      /*
      const solmate: Solmate = {
        publicKey: currKeypair.publicKey,
        connect: function (options?: { onlyIfTrusted?: boolean | undefined; } | undefined): Promise<{ publicKey: PublicKey; }> {
          throw new Error("Function not implemented.");
        },
        disconnect: function (): Promise<void> {
          throw new Error("Function not implemented.");
        },
        signAndSendTransaction: function <T extends Transaction | VersionedTransaction>(transaction: T, options?: SendOptions | undefined): Promise<{ signature: string; }> {
          throw new Error("Function not implemented.");
        },
        signTransaction: function <T extends Transaction | VersionedTransaction>(transaction: T): Promise<T> {
          throw new Error("Function not implemented.");
        },
        signAllTransactions: function <T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]> {
          throw new Error("Function not implemented.");
        },
        signMessage: function (message: Uint8Array): Promise<{ signature: Uint8Array; }> {
          throw new Error("Function not implemented.");
        },
        on: function <E extends keyof SolmateEvent>(event: E, listener: SolmateEvent[E], context?: any): void {
          throw new Error("Function not implemented.");
        },
        off: function <E extends keyof SolmateEvent>(event: E, listener: SolmateEvent[E], context?: any): void {
          throw new Error("Function not implemented.");
        }
      }
      initialize(solmate)
      try {
        Object.defineProperty(window, 'solmate', { value: solmate })
        console.log('here')
      }
      catch (error) {
        console.error(error);
      }
      */
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
