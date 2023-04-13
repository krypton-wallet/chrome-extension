import React, { useState } from "react";
import { NextPage } from "next";
import { Button, Form, Input, Result } from "antd";
import Link from "next/link";
import { ArrowLeftOutlined } from "@ant-design/icons";
import styles from "../../components/Layout/index.module.css";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  TransactionInstruction,
  clusterApiUrl,
} from "@solana/web3.js";

import BN from "bn.js";
import { useRouter } from "next/router";
import { useGlobalState } from "../../context";
import { StyledForm } from "../../styles/StyledComponents.styles";
import { isNumber } from "../../utils";

//import {str2hex,init,getConfig,setRNG,share} from "secrets.js-grempe"
import { combine, split } from "shamirs-secret-sharing-ts";
import * as aesjs from "aes-js";
import base58 from "bs58";
import { MAX_GUARDIANS } from "../../utils/constants";

const RegenStealth: NextPage = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const { account, setAccount, balance, network } = useGlobalState();
  const [finished, setFinished] = useState<boolean>(false);
  const connection = new Connection(clusterApiUrl(network), "confirmed");

  const [form] = Form.useForm();
  const router = useRouter();

  const handleCancel = () => {
    router.push("/stealth");
  };

  const handleOk = async (values: any) => {
    setLoading(true);
    console.log("WTFFFF");
    if (!account) {
      return;
    }
    console.log("stealth scan: ", account.stealth.priv_scan);
    console.log("stealth spend: ", account.stealth.priv_spend);

    const pda_account = await connection.getAccountInfo(
      new PublicKey(account.pda) ?? PublicKey.default
    );
    const pda_data = pda_account?.data ?? Buffer.from("");
    const threshold = new BN(pda_data.subarray(0, 1), "le").toNumber();
    const guardian_len = new BN(pda_data.subarray(1, 5), "le").toNumber();
    const priv_scan_enc = base58.encode(
      pda_data.subarray(33 * guardian_len + 13, 33 * guardian_len + 45)
    );
    const priv_spend_enc = base58.encode(
      pda_data.subarray(33 * guardian_len + 49, 33 * guardian_len + 81)
    );
    console.log("full data: ", pda_data);
    console.log(
      "something: ",
      pda_data.subarray(33 * guardian_len + 9, 33 * guardian_len + 13)
    );
    console.log("something2: ", priv_scan_enc);

    console.log("threshold: ", threshold);
    console.log("guardian length: ", guardian_len);



      let shard1 = Buffer.from(base58.decode(values.shard1));
      let shard2 = Buffer.from(base58.decode(values.shard2));


    let shards = [shard1,shard2];
    
    const result = combine(shards);
    console.log("result: ", result);
    const aesCtr = new aesjs.ModeOfOperation.ctr(result);
    const res2 = aesCtr.decrypt(base58.decode(priv_scan_enc));
    console.log("privscan: ", base58.encode(res2));
    const res3 = aesCtr.decrypt(base58.decode(priv_spend_enc));
    console.log("privspend: ", base58.encode(res3));

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
            name="shard1"
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
              placeholder="Shard 1"
              style={{
                minWidth: "300px",
                backgroundColor: "rgb(34, 34, 34)",
                color: "#d3d3d3",
                border: "1px solid #d3d3d3",
              }}
            />
          </Form.Item>
          <Form.Item
            name="shard2"
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
              placeholder="Shard 2"
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
