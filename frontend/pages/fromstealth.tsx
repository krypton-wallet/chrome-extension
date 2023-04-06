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
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { useGlobalState } from "../context";

import BN from "bn.js";
import { useRouter } from "next/router";
import { isNumber, sendAndConfirmTransactionWithAccount } from "../utils";
import { KeypairSigner, StealthSigner } from "../types/account";

const Transfer: NextPage = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const { walletProgramId, account, setAccount, stealth, stealthBalance } =
    useGlobalState();
  const [finished, setFinished] = useState<boolean>(false);
  const connection = new Connection("https://api.devnet.solana.com/");

  const [form] = Form.useForm();
  const router = useRouter();

  const handleCancel = () => {
    router.push("/stealth");
  };

  const handleOk = async (values: any) => {
    setLoading(true);
    console.log(values);
    const dest_pda = new PublicKey(values.pk);
    const amount = Number(values.amount) * LAMPORTS_PER_SOL;
    const connection = new Connection("https://api.devnet.solana.com/");


    let stealthsig = new StealthSigner(stealth!);
    /* TRANSACTION: Transfer Native SOL */
    const idx = Buffer.from(new Uint8Array([7]));
    console.log("amt: ", amount);
    console.log("stealth: ", stealth!);
    console.log("account: ", (await account!.getPublicKey()).toBase58());
    const amountBuf = Buffer.from(
      new Uint8Array(new BN(amount).toArray("le", 8))
    );
    //console.log("amt bn: ", new BN(amount))
    const recoveryModeBuf = Buffer.from(new Uint8Array([0]));

    const pk = await stealthsig.getPublicKey();
    const recentBlockhash = await connection.getLatestBlockhash();
    const transferSOLTx = new Transaction({
      feePayer: await stealthsig!.getPublicKey(), 
      ...recentBlockhash,
    });
    let newaccount = account;
    if (!newaccount) {
      newaccount = new KeypairSigner(new Keypair());
    }
    transferSOLTx.add(
      SystemProgram.transfer({
        fromPubkey: await stealthsig.getPublicKey(),
        toPubkey: dest_pda,
        lamports: amount
      }
      )
    );

    console.log("Transfering native SOL...");
    

    let transfer_sol_txid = await sendAndConfirmTransactionWithAccount(
      connection,
      transferSOLTx,
      [stealthsig],
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
            name="pk"
            rules={[
              {
                required: true,
                message: "Please enter the recipient's address",
              },
              {
                async validator(_, value) {
                  const pdaInfo = await connection.getAccountInfo(
                    new PublicKey(value)
                  );
                  if (pdaInfo) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Invalid public key"));
                },
              },
            ]}
          >
            <Input
              placeholder="Recipient's Address"
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
                  if (Number(value) > (stealthBalance ?? 0)) {
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
