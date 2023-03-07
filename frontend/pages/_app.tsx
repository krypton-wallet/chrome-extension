import React, { useState } from "react";
import { Cluster, Keypair, PublicKey } from "@solana/web3.js";
import "antd/dist/antd.css";
import "../styles/globals.css";
import type { AppProps } from "next/app";
import { GlobalContext } from "../context";
import Layout from "../components/Layout";

function MyApp({ Component, pageProps }: AppProps) {
  const [network, setNetwork] = useState<Cluster | undefined>("devnet");
  const [account, setAccount] = useState<Keypair | null>(null);
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [guardians, setGuardians] = useState<Array<PublicKey>>([]);
  const [pda, setPDA] = useState<PublicKey | null>(null);
  const [walletProgramId, setWalletProgramId] = useState<PublicKey>(
    new PublicKey("2aJqX3GKRPAsfByeMkL7y9SqAGmCQEnakbuHJBdxGaDL")
  );
  const [recoverPk, setRecoverPk] = useState<PublicKey | null>(null);
  const [tokens, setTokens] = useState<Array<[PublicKey, bigint, number]>>([]);

  return (
    <GlobalContext.Provider
      value={{
        network,
        setNetwork,
        account,
        setAccount,
        mnemonic,
        setMnemonic,
        balance,
        setBalance,
        guardians,
        setGuardians,
        pda,
        setPDA,
        walletProgramId,
        setWalletProgramId,
        recoverPk,
        setRecoverPk,
        tokens,
        setTokens,
      }}
    >
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </GlobalContext.Provider>
  );
}
export default MyApp;
