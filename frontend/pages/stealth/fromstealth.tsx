import React, { useMemo, useState } from "react";
import { NextPage } from "next";
import { Button, Form, Input, Result, Switch } from "antd";
import Link from "next/link";
import { ArrowLeftOutlined } from "@ant-design/icons";

import styles from "../../components/Layout/index.module.css";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  clusterApiUrl,
} from "@solana/web3.js";

import BN from "bn.js";
import { useRouter } from "next/router";
import { useGlobalState } from "../../context";
import { StyledForm } from "../../styles/StyledComponents.styles";
import { StealthSigner, KeypairSigner, Signer } from "../../types/account";
import { sendAndConfirmTransactionWithAccount, isNumber } from "../../utils";
import { stealthTransferIx } from "solana-stealth";

const FromStealth: NextPage = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [stealthMode, setStealthMode] = useState<boolean>(false);
  const { network, account, stealth, stealthBalance } = useGlobalState();
  const [finished, setFinished] = useState<boolean>(false);

  const [form] = Form.useForm();
  const router = useRouter();

  const connection = useMemo(
    () => new Connection(clusterApiUrl(network), "confirmed"),
    [network]
  );

  const handleCancel = () => {
    router.push("/stealth");
  };

  const handleOk = async (values: any) => {
    if (!account || !stealth) {
      return;
    }

    setLoading(true);
    console.log(values);
    console.log("stealth:",stealth);

    const amount = Number(values.amount) * LAMPORTS_PER_SOL;

    let stealthsig = new StealthSigner(stealth);
    /* TRANSACTION: Transfer Native SOL */
    console.log("amt: ", amount);
    console.log("stealth: ", stealth);
    console.log("account: ", account.pk);

    const pk = await stealthsig.getPublicKey();
    const recentBlockhash = await connection.getLatestBlockhash();
    const transferSOLTx = new Transaction({
      feePayer: pk,
      ...recentBlockhash,
    });
    let newaccount = account as Signer;
    if (!newaccount) {
      newaccount = new KeypairSigner(new Keypair());
    }

    if(stealthMode){
      const sendIx = await stealthTransferIx(
        pk,
        values.scankey,
        values.spendkey,
        amount
      );
      transferSOLTx.add(sendIx);
    }else{
      const dest = new PublicKey(values.pk);
      transferSOLTx.add(
        SystemProgram.transfer({
          fromPubkey: pk,
          toPubkey: dest,
          lamports: amount,
        })
      );
    }

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
                  } else if (Number(value) > (stealthBalance ?? 0)) {
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
            balance: {stealthBalance!}
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

export default FromStealth;
