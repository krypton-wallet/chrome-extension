import React, { useEffect, useState } from "react";
import { NextPage } from "next";
import { Button, Form, Input, Result, Switch } from "antd";
import Link from "next/link";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { StyledForm } from "../styles/StyledComponents.styles";
import styles from "../components/Layout/index.module.css";
import {
  clusterApiUrl,
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
import { KeypairSigner, Signer } from "../types/account";
import { WALLET_PROGRAM_ID } from "../utils/constants";
import { stealthTransferIx } from "solana-stealth";

const Transfer: NextPage = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [stealthMode, setStealthMode] = useState<boolean>(false);
  const { account, network, balance } = useGlobalState();
  const [finished, setFinished] = useState<boolean>(false);
  const connection = new Connection(clusterApiUrl(network), "confirmed");

  const [form] = Form.useForm();
  const router = useRouter();

  const handleCancel = () => {
    router.push("/wallet");
  };

  const handleOk = async (values: any) => {
    console.log("ok2", account);
    if (!account) {
      return;
    }

    setLoading(true);
    console.log(values);

    let dest_pda: PublicKey;
    let notifyIx: TransactionInstruction;
    if (stealthMode){
      notifyIx = await stealthTransferIx(
        new PublicKey(account.pk),
        values.scankey,
        values.spendkey,
        0
      );
      dest_pda = notifyIx.keys[1].pubkey;
    }else{
      dest_pda = new PublicKey(values.pk);
    }
    const amount = Number(values.amount) * LAMPORTS_PER_SOL;
    const connection = new Connection(clusterApiUrl(network), "confirmed");

    /* TRANSACTION: Transfer Native SOL */
    const idx = Buffer.from(new Uint8Array([7]));
    console.log("amt: ", amount);
    console.log("pda: ", account.pda);
    console.log("account: ", account.pk);
    const amountBuf = Buffer.from(
      new Uint8Array(new BN(amount).toArray("le", 8))
    );
    //console.log("amt bn: ", new BN(amount))
    const recoveryModeBuf = Buffer.from(new Uint8Array([0]));

    const recentBlockhash = await connection.getLatestBlockhash();
    // TODO:  Check if Yubikey is connected
    const transferSOLTx = new Transaction({
      feePayer: await account.getPublicKey(),
      ...recentBlockhash,
    });
    let newaccount = account as Signer;
    if (!newaccount) {
      newaccount = new KeypairSigner(new Keypair());
    }
    transferSOLTx.add(
      new TransactionInstruction({
        keys: [
          {
            pubkey: new PublicKey(account.pda) ?? PublicKey.default,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: dest_pda,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: new PublicKey(account.pk),
            isSigner: true,
            isWritable: true,
          },
        ],
        programId: WALLET_PROGRAM_ID,
        data: Buffer.concat([idx, amountBuf, recoveryModeBuf]),
      })
    );

    if (stealthMode){ 
      transferSOLTx.add(notifyIx!)
    }

    console.log("Transfering native SOL...");
    const transfer_sol_txid = await sendAndConfirmTransactionWithAccount(
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
      `https://explorer.solana.com/tx/${transfer_sol_txid}?cluster=${network}\n`
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
          <div style={{ display: "flex", justifyContent: "center" }}>
            <p style={{ marginRight: "10px" }}>Stealth Mode: </p>
            <Switch
              checkedChildren="on"
              unCheckedChildren="off"
              checked={stealthMode}
              onChange={() => setStealthMode((prev) => !prev)}
            />
          </div>
          {!stealthMode && (
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
          )}
          {stealthMode && (
            <Form.Item
              name="scankey"
              rules={[
                {
                  required: true,
                  message: "Please enter the recipient's scan key",
                },
                {
                  async validator(_, value) {
                    const pdaInfo = new PublicKey(value);
                    if (pdaInfo) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error("Invalid public key"));
                  },
                },
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
          )}
          {stealthMode && (
            <Form.Item
              name="spendkey"
              rules={[
                {
                  required: true,
                  message: "Please enter the recipient's spend key",
                },
                {
                  async validator(_, value) {
                    const pdaInfo = new PublicKey(value);
                    if (pdaInfo) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error("Invalid public key"));
                  },
                },
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
          )}

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
                  } else if (Number(value) <= 0) {
                    return Promise.reject(new Error("Amount must be positive"));
                  } else if (Number(value) > (balance ?? 0)) {
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

          <span
            style={{
              opacity: "60%",
              color: "white",
              marginTop: "2px",
              alignSelf: "flex-end",
            }}
          >
            balance: {balance!}
          </span>

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
          <Link href="/wallet" passHref>
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
