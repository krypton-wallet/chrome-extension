import {
  Cluster,
  clusterApiUrl,
  ConfirmOptions,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmRawTransaction,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import { message } from "antd";
import BN from "bn.js";
import bs58 from "bs58";
import { generateAvatar } from "./avatar";
import {
  AVATAR_PROGRAM_ID,
  DATA_PROGRAM_ID,
  PDA_SEED,
} from "./avatar/constants";
import { svgPKs } from "./avatar/svg-pubkeys";
import { KeypairSigner, Signer, YubikeySigner } from "../types/account";
import {
  GlobalModalContext,
  useGlobalModalContext,
} from "../components/GlobalModal";
import PinentryModal from "../components/GlobalModal/PinentryModal";
import TouchConfirmModal from "../components/GlobalModal/TouchConfirmModal";
import { PDA_RENT_EXEMPT_FEE } from "./constants";

const programId = new PublicKey("2aJqX3GKRPAsfByeMkL7y9SqAGmCQEnakbuHJBdxGaDL");

// implement a function that gets an account's balance
const refreshBalance = async (
  network: Cluster | undefined,
  account: Signer | null
) => {
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
    return (balance - PDA_RENT_EXEMPT_FEE) / LAMPORTS_PER_SOL;
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
    const confirmation = await connection.requestAirdrop(
      profile_pda[0],
      LAMPORTS_PER_SOL
    );
    const result = await connection.confirmTransaction(
      confirmation,
      "confirmed"
    );
    const balance = await refreshBalance(network, account);
    return balance;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown Error";
    message.error(`Airdrop failed: ${errorMessage}`);
  }
};

function isNumber(value: string | number): boolean {
  return value != null && value !== "" && !isNaN(Number(value.toString()));
}

const displayAddress = (address: string) =>
  `${address.slice(0, 4)}...${address.slice(-4)}`;

function containsPk(obj: string, list: Array<PublicKey>) {
  var i;
  for (i = 0; i < list.length; i++) {
    console.log("list item: ", list[i].toBase58());
    console.log("obj: ", obj);
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
  options?: ConfirmOptions &
    Readonly<{
      abortSignal?: AbortSignal;
    }>
) => {
  const transactionBuffer = transaction.serializeMessage();

  for (const signer of signers) {
    const signature = await signer.signMessage(transactionBuffer);
    transaction.addSignature(
      await signer.getPublicKey(),
      Buffer.from(signature)
    );
  }
  const finalSignature = bs58.encode(new Uint8Array(transaction.signature!));

  // TODO: Add assert or other error checking for this
  const isVerifiedSignature = transaction.verifySignatures();
  console.log(`The signatures were verified: ${isVerifiedSignature}`);

  const rawTransaction = transaction.serialize();
  const latestBlockHash = await connection.getLatestBlockhash();
  const txid = await sendAndConfirmRawTransaction(
    connection,
    rawTransaction,
    {
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: finalSignature,
    },
    options
  );

  if (txid != finalSignature) {
    console.log("SOMETHING WRONG: TXID != SIGNATURE!!!!!!!!!!!");
    console.log(txid);
    console.log(finalSignature);
  }

  return txid;
};

const partialSign = async (
  tx: Transaction | VersionedTransaction,
  signer: Signer
) => {
  let transactionBuffer;
  if (typeof (tx as any).serializeMessage === "function") {
    transactionBuffer = (tx as any).serializeMessage();
  } else {
    transactionBuffer = (tx as any).message.serialize();
  }
  const signature = await signer.signMessage(transactionBuffer);
  tx.addSignature(await signer.getPublicKey(), Buffer.from(signature));
};

const getSignerFromPkString = async (
  pk: string,
  context: GlobalModalContext
): Promise<Signer> => {
  const promise = new Promise<Signer>((resolve, reject) => {
    chrome.storage.local
      .get(["mode", "accounts", "y_accounts"])
      .then(async (result) => {
        // standard
        if (result.mode == 0) {
          const accountObj = JSON.parse(result["accounts"]);
          for (var id in accountObj) {
            console.log("actual: ", accountObj[id]["pk"]);
            console.log("desired: ", pk);
            if (accountObj[id].pk == pk) {
              const newKeypair = Keypair.fromSecretKey(
                bs58.decode(accountObj[id].sk)
              );
              console.log("Standard keypair FOUND!");
              resolve(new KeypairSigner(newKeypair));
            }
          }
          console.log("Standard keypair not found");
        }

        // yubikey
        // TODO: Detoxify this
        else if (result.mode == 1) {
          const accountObj = JSON.parse(result["y_accounts"]);
          for (var id in accountObj) {
            console.log("actual: ", accountObj[id]["pk"]);
            console.log("desired: ", pk);
            if (accountObj[id]["pk"] == pk) {
              const tmpKeypair = new YubikeySigner(
                accountObj[id]["aid"],
                (isRetry: boolean) => {
                  const promise = new Promise<string>((resolve, reject) => {
                    context.showModal(
                      <PinentryModal
                        title={"Please unlock your YubiKey"}
                        isRetry={isRetry}
                        onSubmitPin={(pin: string) => {
                          context.hideModal();
                          resolve(pin);
                        }}
                        onCancel={() => {
                          context.hideModal();
                          reject("User cancelled");
                        }}
                      ></PinentryModal>
                    );
                  });
                  return promise;
                },
                () => {
                  context.showModal(
                    <TouchConfirmModal
                      onCancel={() => {
                        context.hideModal();
                        console.log("User cancelled touch");
                      }}
                    ></TouchConfirmModal>
                  );
                },
                context.hideModal
              );
              console.log("Yubikey keypair FOUND!");
              resolve(tmpKeypair);
            }
          }
          console.log("Yubikey keypair not found");
        }
      });
  });
  return promise;
};

export {
  refreshBalance,
  handleAirdrop,
  isNumber,
  displayAddress,
  containsPk,
  sendAndConfirmTransactionWithAccount,
  partialSign,
  getSignerFromPkString,
  generateAvatar,
};
