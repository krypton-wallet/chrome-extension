import { Cluster, clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { message } from "antd";

const programId = new PublicKey(
  "2aJqX3GKRPAsfByeMkL7y9SqAGmCQEnakbuHJBdxGaDL"
);

// implement a function that gets an account's balance
const refreshBalance = async (network: Cluster | undefined, account: Keypair | null) => {
  // This line ensures the function returns before running if no account has been set
  if (!account) return 0;

  try {
    const connection = new Connection(clusterApiUrl(network), "confirmed");
    const publicKey = account.publicKey;
    const profile_pda = PublicKey.findProgramAddressSync(
      [Buffer.from("profile", "utf-8"), publicKey.toBuffer()],
      programId
    );
    const balance = await connection.getBalance(profile_pda[0]);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown Error";
    message.error(`Balance refresh failed: ${errorMessage}`);
    return 0;
  }
};

// implement a function that airdrops SOL into devnet account
const handleAirdrop = async (network: Cluster, account: Keypair | null) => {
  // This line ensures the function returns before running if no account has been set
  if (!account) return;

  try {
    const connection = new Connection(clusterApiUrl(network), "confirmed");
    const publicKey = account.publicKey;
    const profile_pda = PublicKey.findProgramAddressSync(
      [Buffer.from("profile", "utf-8"), publicKey.toBuffer()],
      programId
    );
    const confirmation = await connection.requestAirdrop(profile_pda[0], LAMPORTS_PER_SOL);
    const result = await connection.confirmTransaction(confirmation, "confirmed");
    const balance = await refreshBalance(network, account);
    return balance; 
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown Error";
    message.error(`Airdrop failed: ${errorMessage}`);
  }
};

export { refreshBalance, handleAirdrop };
