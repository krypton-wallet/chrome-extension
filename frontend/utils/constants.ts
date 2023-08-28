import { Cluster, PublicKey, clusterApiUrl } from "@solana/web3.js";

export const WALLET_PROGRAM_ID = new PublicKey(
  "2aJqX3GKRPAsfByeMkL7y9SqAGmCQEnakbuHJBdxGaDL"
);
export const CJ_ID = new PublicKey(
  "F1TiLbWFWuKtYhZpzPqiBuTqzpRx4Eb14eaME6XPvP7p"
);
export const TX_FEE = 5000;
export const MIN_KEYPAIR_BALANCE = 1e8;
export const REFILL_TO_BALANCE = 2e8;
export const PDA_RENT_EXEMPT_FEE = 3152880;
export const KEYPAIR_RENT_EXEMPT_FEE = 890880;
export const TEST_INITIAL_BALANCE_FAILURE = 110204700;
export const TEST_INITIAL_BALANCE_FAILURE_WITHOUT_MINTING = 103157881;
export const MAINNET_RPC_URL = "<REPLACE WITH OWN MAINNET RPC URL>";
export const DEVNET_RPC_URL = "http://localhost:8899";
export const TESTNET_RPC_URL = clusterApiUrl("testnet");
export const RPC_URL = (network: Cluster | undefined) => {
  if (network === "mainnet-beta") {
    return MAINNET_RPC_URL;
  } else if (network === "devnet") {
    return DEVNET_RPC_URL;
  } else {
    return TESTNET_RPC_URL;
  }
};
export const MAX_GUARDIANS = 10;

export const PDA_DATA_LEN = 32 + 1 + 4 + 34 * 10 + 32 * 2 + 32;
export const PK_SIZE = 32;
