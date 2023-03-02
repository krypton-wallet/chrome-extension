import React, { ReactElement, useEffect, useState } from "react";
import { Button, Result, Typography } from "antd";
import { Box } from "../../styles/StyledComponents.styles";
import { LoadingOutlined } from "@ant-design/icons";
import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  AccountLayout,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { useGlobalState } from "../../context";
import Axios from "axios";
import base58 from "bs58";

const BN = require("bn.js");

const { Paragraph, Text } = Typography;

const RecoverBox = ({ old_pk }: { old_pk: PublicKey }): ReactElement => {
  const { account } = useGlobalState();
  const [loading, setLoading] = useState<boolean>(false);
  const [finished, setFinished] = useState<boolean>(false);
  const [succeeded, setSucceeded] = useState<boolean>(false);
  const [msg, setMsg] = useState<any>("");
  const connection = new Connection("https://api.devnet.solana.com/");
  const programId = new PublicKey(
    "2aJqX3GKRPAsfByeMkL7y9SqAGmCQEnakbuHJBdxGaDL"
  );

  const onRecover = async () => {
    try {
      console.log("\n=====RECOVERING======");
      console.log("Signer: ", account?.publicKey.toBase58());
      setLoading(true);
      const res = await Axios.get(
        "http://localhost:5000/api/getFromPk/" + old_pk
      );
      const res_data = res.data[0];
      if (res_data == undefined) {
        throw new Error("Invalid signing request!");
      }

      let transactionBased64 = res_data.transaction;
      let transaction = Transaction.from(
        Buffer.from(transactionBased64, "base64")
      );
      console.log("SIGNATURES");
      for (var i = 0; i < transaction.signatures.length; i++) {
        console.log(
          `pk ${i}: ${transaction.signatures[
            i
          ].publicKey.toBase58()} \nsignature ${i}: `,
          transaction.signatures[i].signature?.toString("base64")
        );
      }

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
          new PublicKey(res_data.new_pk).toBuffer(),
        ],
        programId
      );
      let allTA_res = await connection.getTokenAccountsByOwner(profile_pda[0], {
        programId: TOKEN_PROGRAM_ID,
      });

      let transferCloseTx = new Transaction();

      allTA_res.value.forEach(async (e) => {
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
          account ?? new Keypair(),
          mint,
          new_profile_pda[0],
          true
        );
        console.log(`New Token Account: ${newTokenAccount.address.toBase58()}`);

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
              pubkey: account?.publicKey ?? PublicKey.default,
              isSigner: true,
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

      await new Promise((resolve) => setTimeout(resolve, 7000));

      /* TRANSACTION: Transfer Native SOL */
      const idx3 = Buffer.from(new Uint8Array([7]));
      const amountBuf1 = Buffer.from(
        new Uint8Array(new BN(Number(1)).toArray("le", 8))
      );
      const recoveryModeBuf1 = Buffer.from(new Uint8Array([1]));
      const transferSOLTx = new Transaction().add(
        new TransactionInstruction({
          keys: [
            {
              pubkey: profile_pda[0],
              isSigner: false,
              isWritable: true,
            },
            {
              pubkey: new_profile_pda[0],
              isSigner: false,
              isWritable: true,
            },
            {
              pubkey: account?.publicKey ?? PublicKey.default,
              isSigner: true,
              isWritable: true,
            },
          ],
          programId,
          data: Buffer.concat([idx3, amountBuf1, recoveryModeBuf1]),
        })
      );

      console.log("Transfering native SOL...");
      let transfer_sol_txid = await sendAndConfirmTransaction(
        connection,
        transferSOLTx,
        [account ?? new Keypair()],
        {
          skipPreflight: true,
          preflightCommitment: "confirmed",
          commitment: "confirmed",
        }
      );
      console.log(
        `https://explorer.solana.com/tx/${transfer_sol_txid}?cluster=devnet\n`
      );

      /* TRANSACTION: Transfer and close all token accounts */
      console.log("Transfering and closing...");
      let transfer_txid = await sendAndConfirmTransaction(
        connection,
        transferCloseTx,
        [account ?? new Keypair()],
        {
          skipPreflight: true,
          preflightCommitment: "confirmed",
          commitment: "confirmed",
        }
      );
      console.log(
        `https://explorer.solana.com/tx/${transfer_txid}?cluster=devnet\n`
      );

      await Axios.delete("http://localhost:5000/api/delete/" + old_pk);

      console.log("RECOVERY COMPLETED! LET'S GOOOOO!");

      setSucceeded(true);
    } catch (err: any) {
      setSucceeded(false);
      setMsg(err.toString());
      console.error(err);
    }
    setFinished(true);
    setLoading(false);
  };

  return (
    <Box>
      {!finished && (
        <>
          <Paragraph style={{textAlign: 'center', fontSize: '16px', marginBottom: '0'}}>Click <b>Recover</b> to complete recovering</Paragraph>
          <Paragraph style={{textAlign: 'center', fontSize: '12px'}}>{old_pk.toBase58()}</Paragraph>
          {!loading && (
            <Button type="primary" onClick={onRecover}>
              Recover
            </Button>
          )}
          {loading && <LoadingOutlined style={{ fontSize: 24, color: "#fff" }} spin />}
        </>
      )}
      {finished && (
        <>
          {succeeded && (
            <Result
              status="success"
              title="Successfully Recovered!"
              subTitle="Start using your new wallet now"
            />
          )}
          {!succeeded && (
            <Result
              status="error"
              title="Recovery Failed"
              subTitle="Please check the error logs below"
            >
              <div className="desc" style={{ textAlign: "center" }}>
                <Text type="danger">{msg}</Text>
              </div>
            </Result>
          )}
        </>
      )}
    </Box>
  );
};

export default RecoverBox;
