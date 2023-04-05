import React, { useState } from "react";
import { NextPage } from "next";
import { Button, Form, Input, Result } from "antd";
import Link from "next/link";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { StyledForm } from "../styles/StyledComponents.styles";
import styles from "../components/Layout/index.module.css";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { useGlobalState } from "../context";

import BN from "bn.js";
import { useRouter } from "next/router";
import { isNumber, sendAndConfirmTransactionWithAccount } from "../utils";
import { KeypairSigner } from "../types/account";
import { senderGenAddress, stealthTransferIx } from "solana-stealth";

const Transfer: NextPage = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const { walletProgramId, account, setAccount, pda, balance } =
    useGlobalState();
  const [finished, setFinished] = useState<boolean>(false);
  const connection = new Connection("https://api.devnet.solana.com/");

  const [form] = Form.useForm();
  const router = useRouter();

  const handleCancel = () => {
    router.push("/wallet");
  };

  const handleOk = async (values: any) => {
    setLoading(true);
    console.log(values);
    const scankey = new PublicKey(values.scankey);
    const spendkey = new PublicKey(values.spendkey);
    
    let notifyix = await stealthTransferIx(await account!.getPublicKey(),scankey.toBase58(),spendkey.toBase58(),0);
    let dest = notifyix.keys[1].pubkey;

    const amount = Number(values.amount) * LAMPORTS_PER_SOL;
    const connection = new Connection("https://api.devnet.solana.com/");

    /* TRANSACTION: Transfer Native SOL */
    const idx = Buffer.from(new Uint8Array([7]));
    console.log("amt: ", amount);
    console.log("pda: ", pda?.toBase58());
    console.log("account: ", (await account!.getPublicKey()).toBase58());
    const amountBuf = Buffer.from(
      new Uint8Array(new BN(amount).toArray("le", 8))
    );
    //console.log("amt bn: ", new BN(amount))
    const recoveryModeBuf = Buffer.from(new Uint8Array([0]));

    const recentBlockhash = await connection.getLatestBlockhash();
    const transferSOLTx = new Transaction({
      feePayer: await account!.getPublicKey(),
      ...recentBlockhash,
    });
    let newaccount = account;
    if (!newaccount) {
      newaccount = new KeypairSigner(new Keypair());
    }


    
    transferSOLTx.add(
      new TransactionInstruction({
        keys: [
          {
            pubkey: pda ?? PublicKey.default,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: dest,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: await account!.getPublicKey(),
            isSigner: true,
            isWritable: true,
          },
        ],
        programId: walletProgramId,
        data: Buffer.concat([idx, amountBuf, recoveryModeBuf]),
      })
    );
    transferSOLTx.add(notifyix);



    console.log("Transfering native SOL...");
    let transfer_sol_txid = await sendAndConfirmTransactionWithAccount(
      connection,
      transferSOLTx,
      [newaccount],
      {
        skipPreflight: true,
        preflightCommitment: "confirmed",
        commitment: "confirmed",
      }
    );
    console.log(
      `https://explorer.solana.com/tx/${transfer_sol_txid}?cluster=devnet\n`
    );

    setLoading(false);
    setFinished(true);
  };

  return (
    <>
      <h1 className={"title"}>Send SOL</h1>

      {!finished && (
        <StyledForm
          form={form}
          layout="vertical"
          requiredMark={false}
          onFinish={handleOk}
        >
          <Form.Item
            name="scankey"
            rules={[
              {
                required: true,
                message: "Please enter the recipient's scan key",
              },
              // {
              //   async validator(_, value) {
              //     const pdaInfo = await connection.getAccountInfo(
              //       new PublicKey(value)
              //     );
              //     if (pdaInfo) {
              //       return Promise.resolve();
              //     }
              //     return Promise.reject(new Error("Invalid public key"));
              //   },
              // },
            ]}
          >
            <Input
              placeholder="Recipient's Scan Key"
              style={{
                minWidth: "300px",
                backgroundColor: "rgb(34, 34, 34)",
                color: "#d3d3d3",
                border: "1px solid #d3d3d3",
              }}
            />
          </Form.Item>
          <Form.Item
            name="spendkey"
            rules={[
              {
                required: true,
                message: "Please enter the recipient's spend key",
              },
              // {
              //   async validator(_, value) {
              //     const pdaInfo = await connection.getAccountInfo(
              //       new PublicKey(value)
              //     );
              //     if (pdaInfo) {
              //       return Promise.resolve();
              //     }
              //     return Promise.reject(new Error("Invalid public key"));
              //   },
              // },
            ]}
          >
            <Input
              placeholder="Recipient's Spend Key"
              style={{
                minWidth: "300px",
                backgroundColor: "rgb(34, 34, 34)",
                color: "#d3d3d3",
                border: "1px solid #d3d3d3",
              }}
            />
          </Form.Item>

          <Form.Item
            name="amount"
            rules={[
              {
                required: true,
                message: "Please enter amount in SOL",
              },
              {
                validator(_, value) {
                  if (!isNumber(value)) {
                    return Promise.reject(new Error("Not a number"));
                  }
                  if (Number(value) > (balance ?? 0)) {
                    return Promise.reject(
                      new Error("Cannot transfer more SOL than balance")
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input
              placeholder=""
              suffix="SOL"
              style={{
                backgroundColor: "rgb(34, 34, 34)",
                color: "#d3d3d3",
                border: "1px solid #d3d3d3",
              }}
            />
          </Form.Item>

          <div
            style={{
              display: "flex",
              columnGap: "20px",
              justifyContent: "space-between",
              marginTop: "1px",
              marginBottom: "10px",
              alignItems: "flex-end",
            }}
          >
            <Button
              type="default"
              shape="default"
              style={{ width: "140px", height: "40px", fontSize: "17px" }}
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Form.Item shouldUpdate className="submit">
              {() => (
                <Button
                  htmlType="submit"
                  type="primary"
                  loading={loading}
                  style={{ width: "140px", height: "40px", fontSize: "17px" }}
                >
                  Send
                </Button>
              )}
            </Form.Item>
          </div>
        </StyledForm>
      )}
      {finished && (
        <>
          <Result status="success" title="Sent!" />
          <Link href="/stealth" passHref>
            <a className={styles.back}>
              <ArrowLeftOutlined /> Back Home
            </a>
          </Link>
        </>
      )}
    </>
  );
};

export default Transfer;
