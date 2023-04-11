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

//import {str2hex, share, setRNG,init, _isSetRNG , _getRNG, getConfig,} from "secret-sharing.js"
import { split, combine  } from 'shamirs-secret-sharing-ts'
import base58 from "bs58";
//import {str2hex,init,getConfig,setRNG,share} from "secrets.js-grempe"

const RegenStealth: NextPage = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const { walletProgramId, account, setAccount, pda, balance, privScan,privSpend, setPrivScan, setPrivSpend } =
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
    console.log("WTFFFF")
    console.log(values);
    const scankey = new PublicKey(values.scankey);
    const spendkey = new PublicKey(values.spendkey);
    
    console.log("trying to set rng");
   // setRNG("nodeCryptoRandomBytes");

    scankey.toString()
    //init(8,"nodeCryptoRandomBytes");
    console.log("before  str2hex");
    let secret = scankey.toString();
    //let secret = privScan!;

    
    
    console.log("waiting");
    //await new Promise(r => setTimeout(r, 30000));

    console.log("before shares");
     let shares = split(secret,{shares: 10, threshold: 2});
     console.log(shares);
     for (const j of shares){
      console.log(base58.encode(j));
     }


     let secret2 = "arbitrary";
     let shares2 = split(secret2,{shares: 10, threshold: 2});
     console.log(shares2);

     let secret3 = "len";
     let shares3 = split(secret3,{shares: 10, threshold: 2});
     console.log(shares3);


     let secret4 = "reaaaalllllllly looooooooooooooooooooooooooooooooong";
     let shares4 = split(secret4,{shares: 10, threshold: 2});
     console.log(shares4);


    
    setLoading(false);
    setFinished(true);
  };

  return (
    <>
      <h1 className={"title"}>RegenStealth</h1>

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

export default RegenStealth;
