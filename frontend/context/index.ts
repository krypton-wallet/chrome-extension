import React, { createContext, useContext } from "react";
import { Keypair, Cluster, PublicKey } from "@solana/web3.js";
import { PgpCardInfo } from "bloss-js";
import { Signer } from "../types/account";

export type GlobalContextType = {
  network: Cluster | undefined;
  setNetwork: React.Dispatch<React.SetStateAction<Cluster | undefined>>;
  account: Signer | null;
  setAccount: React.Dispatch<React.SetStateAction<Signer | null>>;
  mnemonic: string | null;
  setMnemonic: React.Dispatch<React.SetStateAction<string | null>>;
  balance: number | null;
  setBalance: React.Dispatch<React.SetStateAction<number | null>>;
  guardians: Array<PublicKey>;
  setGuardians: React.Dispatch<React.SetStateAction<Array<PublicKey>>>;
  pda: PublicKey | null;
  setPDA: React.Dispatch<React.SetStateAction<PublicKey | null>>;
  walletProgramId: PublicKey;
  setWalletProgramId: React.Dispatch<React.SetStateAction<PublicKey>>;
  recoverPk: PublicKey | null;
  setRecoverPk: React.Dispatch<React.SetStateAction<PublicKey | null>>;
  tokens: Array<[PublicKey, bigint, number]>;
  setTokens: React.Dispatch<React.SetStateAction<Array<[PublicKey, bigint, number]>>>;
  currId: number | null;
  setCurrId: React.Dispatch<React.SetStateAction<number | null>>;
  yubikeyInfo: PgpCardInfo | null;
  setYubikeyInfo: React.Dispatch<React.SetStateAction<PgpCardInfo | null>>;
  stealth: string | null;
  setStealth: React.Dispatch<React.SetStateAction<string | null>>;
  stealthBalance: number | null;
  setStealthBalance: React.Dispatch<React.SetStateAction<number | null>>;
  privScan: string | null;
  setPrivScan: React.Dispatch<React.SetStateAction<string | null>>;
  privSpend: string | null;
  setPrivSpend: React.Dispatch<React.SetStateAction<string | null>>;
};

export const GlobalContext = createContext<GlobalContextType>({
  network: "devnet",
  setNetwork: () => null,
  account: null,
  setAccount: () => null,
  mnemonic: null,
  setMnemonic: () => null,
  balance: null,
  setBalance: () => null,
  guardians: [],
  setGuardians: () => null,
  pda: null,
  setPDA: () => null,
  walletProgramId: new PublicKey("2aJqX3GKRPAsfByeMkL7y9SqAGmCQEnakbuHJBdxGaDL"),
  setWalletProgramId: () => null,
  recoverPk: null,
  setRecoverPk: () => null,
  tokens: [],
  setTokens: () => null,
  currId: 1,
  setCurrId: () => null,
  yubikeyInfo: null,
  setYubikeyInfo: () => null,
  stealth: null,
  setStealth: () => null,
  stealthBalance: null,
  setStealthBalance: () => null,
  privScan: null,
  setPrivScan: () => null,
  privSpend: null,
  setPrivSpend: () => null,

});

export const useGlobalState = () => useContext(GlobalContext);
