import { Cluster, clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, sendAndConfirmRawTransaction, Transaction } from "@solana/web3.js";
import { message } from "antd";
import bs58 from "bs58";
import { Signer } from "../types/account";

const programId = new PublicKey(
  "2aJqX3GKRPAsfByeMkL7y9SqAGmCQEnakbuHJBdxGaDL"
);

// implement a function that gets an account's balance
const refreshBalance = async (network: Cluster | undefined, account: Signer | null) => {
  // This line ensures the function returns before running if no account has been set
  if (!account) return 0;

  try {
    const connection = new Connection(clusterApiUrl(network), "confirmed");
    const publicKey = await account.getPublicKey();
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
const handleAirdrop = async (network: Cluster, account: Signer | null) => {
  // This line ensures the function returns before running if no account has been set
  if (!account) return;

  try {
    const connection = new Connection(clusterApiUrl(network), "confirmed");
    const publicKey = await account.getPublicKey();
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

function isNumber(value: string | number): boolean
{
   return ((value != null) &&
           (value !== '') &&
           !isNaN(Number(value.toString())));
}

const displayAddress = (address: string) =>
    `${address.slice(0, 4)}...${address.slice(-4)}`;

function containsPk(obj: string, list: Array<PublicKey>) {
  var i;
  for (i = 0; i < list.length; i++) {
    console.log("list item: ", list[i].toBase58())
    console.log("obj: ", obj)
      if (list[i].toBase58() == obj) {
          return true;
      }
  }
  return false;
}

/*
 * Sign transaction with the given account.
 * Also use that account as the fee payer.
 * Then send and confirm the signed transaction.
 */
const sendAndConfirmTransactionWithAccount = async (
  connection: Connection,
  transaction: Transaction,
  signers: Signer[],
) => {
  const transactionBuffer = transaction.serializeMessage();
  
  signers.forEach(async (signer) => {
  const signature = await signer.signMessage(transactionBuffer);
  transaction.addSignature(await signer.getPublicKey(), Buffer.from(signature));
  })
  const finalSignature = bs58.encode(new Uint8Array(transaction.signature!));

  // TODO: Add assert or other error checking for this
  const isVerifiedSignature = transaction.verifySignatures();
  console.log(`The signatures were verifed: ${isVerifiedSignature}`);

  const rawTransaction = transaction.serialize();
  const latestBlockHash = await connection.getLatestBlockhash();
  const txid = await sendAndConfirmRawTransaction(connection, rawTransaction, {
    blockhash: latestBlockHash.blockhash,
    lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
    signature: finalSignature,
  });

  if (txid != finalSignature) {
    console.log("SOMETHING WRONG: TXID != SIGNATURE!!!!!!!!!!!");
    console.log(txid);
    console.log(finalSignature);
  }

  return txid;
}

export { refreshBalance, handleAirdrop, isNumber, displayAddress, containsPk, sendAndConfirmTransactionWithAccount };
