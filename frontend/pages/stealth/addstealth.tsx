import React, { useMemo, useState } from "react";
import { NextPage } from "next";
import { Button, Form, Input, Result } from "antd";
import Link from "next/link";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { StyledForm } from "../../styles/StyledComponents.styles";
import styles from "../../components/Layout/index.module.css";
import {
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmRawTransaction,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { useGlobalState } from "../../context";

import { useRouter } from "next/router";
import { isNumber, sendAndConfirmTransactionWithAccount } from "../../utils";
import { KeypairSigner, StealthSigner } from "../../types/account";

const AddStealth: NextPage = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const { account, setAccount, balance, network } = useGlobalState();
  const [finished, setFinished] = useState<boolean>(false);
  const [failed, setFailed] = useState<boolean>(false);

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
    if (!account || !account.stealth) {
      router.push("/");
      return;
    }

    await chrome.storage.local
      .get(["currId", "accounts", "y_accounts", "mode", "y_id"])
      .then(async (result) => {
        const id = result["mode"] === 0 ? result["currId"] : result["y_id"];
        const old =
          result["mode"] === 0
            ? JSON.parse(result["accounts"])
            : JSON.parse(result["y_accounts"]);
        let stealth_accs: string[] = [];
        if (account.stealth_accounts && account.stealth_accounts.length > 0) {
          stealth_accs = account.stealth_accounts;
        }
        try {
          const signer = new StealthSigner(values.sk);
          await connection.getAccountInfo(await signer.getPublicKey());
          stealth_accs.push(values.sk);
        } catch (error) {
          console.log("error");
          setFinished(true);
          setFailed(true);
          return;
        }
        const { stealth_accounts: _, ...rest } = old[id];
        old[id] = {
          stealth_accounts: stealth_accs,
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
    // TODO: maybe setAccount
    console.log(values);
    setFinished(true);
  };

  return (
    <>
      <h1 className={"title"}>Add Stealth Account</h1>

      {!finished && (
        <StyledForm
          form={form}
          layout="vertical"
          requiredMark={false}
          onFinish={handleOk}
        >
          <Form.Item
            name="sk"
            rules={[
              {
                required: true,
                message: "Please enter the private key",
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
              placeholder="Private Key"
              style={{
                minWidth: "300px",
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
      {finished && !failed && (
        <>
          <Result status="success" title="Added!" />
          <Link href="/stealth" passHref>
            <a className={styles.back}>
              <ArrowLeftOutlined /> Back Home
            </a>
          </Link>
        </>
      )}
      {finished && failed && (
        <>
          <Result status="error" title="Invalid key" />
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

export default AddStealth;
