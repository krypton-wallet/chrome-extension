import { KryptonAccount } from "../../types/account";
import * as aesjs from "aes-js";
import base58 from "bs58";
import BN from "bn.js";
import { Cluster, clusterApiUrl, Connection, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { MAX_GUARDIANS, WALLET_PROGRAM_ID } from "../constants";
import { sendAndConfirmTransactionWithAccount } from "..";
import { split } from "shamirs-secret-sharing-ts";
import { parseDataFromPDA } from "../../types/pda";

export const genShards = async (encryption_key: Buffer, account: KryptonAccount, network: Cluster | undefined)
: Promise<[KryptonAccount, string[]]> => {
  const aesCtr = new aesjs.ModeOfOperation.ctr(encryption_key);
    const encrypted = aesCtr.encrypt(base58.decode(account.stealth.priv_scan));
    const encrypted2 = aesCtr.encrypt(
      base58.decode(account.stealth.priv_spend)
    );

    const messageLen = Buffer.from(
      new Uint8Array(new BN(encrypted.length).toArray("le", 4))
    );
    console.log("message len: ", messageLen);
    console.log("message: ", encrypted);
    const message3 = encrypted;
    const messageLen2 = Buffer.from(
      new Uint8Array(new BN(encrypted2.length).toArray("le", 4))
    );
    console.log("message len2: ", messageLen2);
    console.log("message: ", encrypted2);
    const message2 = encrypted2;

    const publicKey = new PublicKey(account.pk);
    console.log("Regenerating shards for account " + publicKey + "...");
    const connection = new Connection(clusterApiUrl(network), "confirmed");
    const latestBlockhash = await connection.getLatestBlockhash();
    const idx8 = Buffer.from(new Uint8Array([8]));
    const updateSecretsIx = new TransactionInstruction({
      keys: [
        {
          pubkey: new PublicKey(account.pda) ?? PublicKey.default,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: publicKey,
          isSigner: true,
          isWritable: true,
        },
      ],
      programId: WALLET_PROGRAM_ID,
      data: Buffer.concat([idx8, messageLen, message3, messageLen2, message2]),
    });
    console.log("Regenerating shards...");

    const tx = new Transaction({
      feePayer: publicKey,
      ...latestBlockhash,
    });
    tx.add(updateSecretsIx);

    const txid = await sendAndConfirmTransactionWithAccount(
      connection,
      tx,
      [account],
      {
        skipPreflight: true,
        preflightCommitment: "confirmed",
        commitment: "confirmed",
      }
    );
    console.log(`https://explorer.solana.com/tx/${txid}?cluster=${network}`);

    console.log("updating internal shard representation");
    const pda_account = await connection.getAccountInfo(
      new PublicKey(account.pda) ?? PublicKey.default
    );
    const pda_data = pda_account?.data ?? Buffer.from("");
    const pdaDataObj = parseDataFromPDA(pda_data);
    const threshold = pdaDataObj.recoveryThreshold;
    const shares = split(encryption_key, { shares: MAX_GUARDIANS, threshold });
    const shards = shares.map((share) => base58.encode(share));
    await chrome.storage.local
      .get(["currId", "accounts", "y_accounts", "mode", "y_id"])
      .then(async (result) => {
        const id = result["mode"] === 0 ? result["currId"] : result["y_id"];
        const old =
          result["mode"] === 0
            ? JSON.parse(result["accounts"])
            : JSON.parse(result["y_accounts"]);
        const { shards: _, ...rest } = old[id];
        old[id] = {
          shards,
          ...rest,
        };
        const accs = JSON.stringify(old);

        if (result["mode"] === 0) {
          chrome.storage.local.set({
            accounts: accs,
          });
        } else if (result["mode"] === 1) {
          chrome.storage.local.set({
            y_accounts: accs,
          });
        }
      });
    const prevAccount = account;
    prevAccount.stealth.shards = shards;
    return [prevAccount,shards];
}