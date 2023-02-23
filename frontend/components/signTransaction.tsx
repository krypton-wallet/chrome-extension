import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { Button } from "antd";
import bs58 from "bs58";
import { FC, Props, useContext } from "react";
import React, { useCallback } from "react";
import Axios from "axios";
import { useGlobalState } from "../context";

import BN from "bn.js";

import {
  getOrCreateAssociatedTokenAccount,
  AccountLayout,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import base58 from "bs58";

export const SignTransaction: FC<{ pk: string | string[] | undefined }> = (
  pk_obj
) => {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const programId = new PublicKey(
    "2aJqX3GKRPAsfByeMkL7y9SqAGmCQEnakbuHJBdxGaDL"
  );

  const onClick = useCallback(async () => {
    try {
      if (!publicKey) throw new Error("Wallet not connected!");
      if (!signTransaction)
        throw new Error("Wallet does not support transaction signing!");

      const pk = pk_obj.pk;
      console.log("PK to recover: ", pk);

      const res = await Axios.get("http://localhost:5000/api/getFromPk/" + pk);
      const res_data = res.data[0];
      if (res_data == undefined) {
        throw new Error("Invalid signing request!");
      }

      const executor = Keypair.fromSecretKey(base58.decode(res_data.executor));
      console.log("PK new: ", res_data.newpk);
      console.log("Executor: ", executor.publicKey.toBase58());

      let transactionBased64 = res_data.transaction;
      let transaction = Transaction.from(
        Buffer.from(transactionBased64, "base64")
      );
      console.log("OLD SIGNATURES");
      for (var i = 0; i < transaction.signatures.length; i++) {
        console.log(
          `pk ${i}: ${transaction.signatures[
            i
          ].publicKey.toBase58()} \nsignature ${i}: `,
          transaction.signatures[i].signature?.toString("base64")
        );
      }

      console.log("Signing to recover...");
      transaction = await signTransaction(transaction);

      console.log("NEW SIGNATURES");
      for (var i = 0; i < transaction.signatures.length; i++) {
        console.log(
          `pk ${i}: ${transaction.signatures[
            i
          ].publicKey.toBase58()} \nsignature ${i}: `,
          transaction.signatures[i].signature?.toString("base64")
        );
      }

      // If signature threshold is reached, then we can verify the signatures &
      // transfer+close
      if (res_data.signed_cnt + 1 >= res_data.thres) {
        if (!transaction.verifySignatures())
          throw new Error(`Transaction signature invalid! `);
        console.log("Transaction signature valid! ");

        // Serialize the transaction to send it using connection.sendEncodedTransaction
        // We have to do this because connection.sendTransaction uses sign (and rejects if we pass it no new signers)
        const serialized = transaction.serialize({
          requireAllSignatures: true,
          verifySignatures: true,
        });
        console.log("Transaction serialized!");

        /* TRANSACTION: Transfer and close all token accounts */
        const profile_pda = PublicKey.findProgramAddressSync(
          [
            Buffer.from("profile", "utf-8"),
            new PublicKey(res_data.pk).toBuffer(),
          ],
          programId
        );
        const new_profile_pda = PublicKey.findProgramAddressSync(
          [
            Buffer.from("profile", "utf-8"),
            new PublicKey(res_data.newpk).toBuffer(),
          ],
          programId
        );
        let res = await connection.getTokenAccountsByOwner(profile_pda[0], {
          programId: TOKEN_PROGRAM_ID,
        });

        let transferCloseTx = new Transaction();
        console.log("Requesting Airdrop of 1 SOL to executor...");
        const signature1 = await connection.requestAirdrop(
          executor.publicKey,
          1e9
        );
        await connection.confirmTransaction(signature1, "finalized");
        console.log("Airdrop received");

        res.value.forEach(async (e) => {
          const oldTokenAccount = e.pubkey;
          const accountInfo = AccountLayout.decode(e.account.data);

          const mint = new PublicKey(accountInfo.mint);
          const amount = accountInfo.amount;
          const recoveryMode = 1;

          console.log(`Old Token Account: ${oldTokenAccount.toBase58()}`);
          console.log(`mint: ${mint}`);
          console.log(`amount: ${amount}`);
          console.log(`recovery mode: ${recoveryMode}\n`);

          const newTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            executor,
            mint,
            new_profile_pda[0],
            true
          );
          console.log(
            `New Token Account: ${newTokenAccount.address.toBase58()}`
          );

          const idx2 = Buffer.from(new Uint8Array([6]));
          const amountBuf = Buffer.from(
            new Uint8Array(new BN(Number(amount)).toArray("le", 8))
          );
          const recoveryModeBuf = Buffer.from(new Uint8Array([recoveryMode]));
          const transferAndCloseIx = new TransactionInstruction({
            keys: [
              {
                pubkey: profile_pda[0],
                isSigner: false,
                isWritable: true,
              },
              {
                pubkey: new PublicKey(res_data.pk),
                isSigner: false,
                isWritable: true,
              },
              {
                pubkey: oldTokenAccount,
                isSigner: false,
                isWritable: true,
              },
              {
                pubkey: newTokenAccount.address,
                isSigner: false,
                isWritable: true,
              },
              {
                pubkey: TOKEN_PROGRAM_ID,
                isSigner: false,
                isWritable: false,
              },
              {
                pubkey: executor.publicKey,
                isSigner: true,
                isWritable: true,
              },
            ],
            programId,
            data: Buffer.concat([idx2, amountBuf, recoveryModeBuf]),
          });

          transferCloseTx.add(transferAndCloseIx);
        });

        /* TRANSACTION: Recover Transaction */
        // Send the transaction
        const signature = await connection.sendEncodedTransaction(
          serialized.toString("base64")
        );
        console.log("Recovering Wallet: ");
        console.log(
          `https://explorer.solana.com/tx/${signature}?cluster=devnet\n`
        );

        // Wait for it to finish
        await connection.confirmTransaction(signature, "confirmed");

        await new Promise((resolve) => setTimeout(resolve, 5000));

        // transfer and close
        console.log("Transfering and closing...");
        let transfer_txid = await sendAndConfirmTransaction(
          connection,
          transferCloseTx,
          [executor],
          {
            skipPreflight: true,
            preflightCommitment: "confirmed",
            commitment: "confirmed",
          }
        );
        console.log(
          `https://explorer.solana.com/tx/${transfer_txid}?cluster=devnet\n`
        );

        console.log("RECOVERY COMPLETED! LET'S GOOOOO!");
        await Axios.delete("http://localhost:5000/api/delete/" + pk);
      } else {
        const serializedTx = transaction.serialize({
          requireAllSignatures: false,
        });
        const txBased64 = serializedTx.toString("base64");
        await Axios.post("http://localhost:5000/api/update", {
          pk: pk,
          new_transaction: txBased64,
        }).then((res) => {
          console.log(res);
        });
      }
    } catch (err: unknown) {
      console.error(err);
    }
  }, [publicKey, signTransaction, connection]);

  return <Button onClick={onClick}>Sign Transaction</Button>;
};
