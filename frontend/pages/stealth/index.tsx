import React, { useEffect, useState } from "react";
import { NextPage } from "next";
import {
  Button,
  Tooltip,
  Typography,
  List,
  Avatar,
  Skeleton,
  Empty,
} from "antd";
import { useRouter } from "next/router";

import { ArrowRightOutlined, LoadingOutlined } from "@ant-design/icons";
import {
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import { useGlobalState } from "../../context";
import { Dashboard } from "../../styles/StyledComponents.styles";
import { StealthSigner } from "../../types/account";
import { displayAddress } from "../../utils";
import Paragraph from "antd/lib/typography/Paragraph";

const Stealth: NextPage = () => {
  const { network, account, setStealth, setStealthBalance } = useGlobalState();
  const [spinning, setSpinning] = useState<boolean>(true);
  const [publicScan, setPublicScan] = useState<string>("");
  const [publicSpend, setPublicSpend] = useState<string>("");
  const [stealthAccounts, setStealthAccounts] = useState<
    Array<[string, number | undefined, PublicKey]>
  >([]);
  const router = useRouter();

  useEffect(() => {
    console.log("============STEALTH PAGE=================");
    setSpinning(true);

    console.log("acc: ", account);
    if (!account) {
      router.push("/");
      return;
    }

    const getStealthAccounts = async () => {
      
      
      const scan = new StealthSigner(account.stealth.priv_scan);
      const scan_key = await scan.getPublicKey();
      setPublicScan(scan_key.toBase58());

      const spend = new StealthSigner(account.stealth.priv_spend);
      const spend_key = await spend.getPublicKey();
      setPublicSpend(spend_key.toBase58());
      
      if (!account.stealth_accounts || account.stealth_accounts.length <= 0) {
        setStealthAccounts([]);
        setSpinning(false);
        return;
      }

      const connection = new Connection(clusterApiUrl(network), "confirmed");
      const stealth_accs: Array<[string, number | undefined, PublicKey]> = [];
      for (const priv of account.stealth_accounts) {
        const signer = new StealthSigner(priv);
        const pubkey = await signer.getPublicKey();
        let lamps = (await connection.getAccountInfo(pubkey))?.lamports;
        if (lamps) {
          lamps /= LAMPORTS_PER_SOL;
        }
        stealth_accs.push([priv, lamps, pubkey]);
      }

      

      setStealthAccounts(stealth_accs);
      setSpinning(false);
    };
    getStealthAccounts();
  }, [account, network, router]);

  const handleSendFromStealth = () => {
    router.push("/stealth/fromstealth");
  };

  const handleSendToStealth = () => {
    router.push("/stealth/tostealth");
  };

  const handleAddAccount = () => {
    router.push("/stealth/addstealth");
  };

  console.log("shhh2: ", stealthAccounts);
  return (
    <>
      {account && (
        <Dashboard>
          <h1 style={{ marginBottom: 0, color: "#fff" }}>Stealth</h1>
          <Paragraph
            copyable={{ text: account.pda, tooltips: `Copy` }}
            style={{ margin: 0, color: "#fff" }}
          >
            {`${displayAddress(account.pda)}`}
          </Paragraph>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "45%",
            }}
          >
            <p
              style={{ color: "#bababa", margin: "0" }}
            >{`Public scan key: `}</p>
            <Paragraph
              copyable={{ text: publicScan, tooltips: `Copy` }}
              style={{ margin: 0, color: "#fff" }}
            >
              {`${displayAddress(publicScan)}`}
            </Paragraph>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "45%",
            }}
          >
            <p
              style={{ color: "#bababa", margin: "0" }}
            >{`Public spend key: `}</p>
            <Paragraph
              copyable={{ text: publicSpend, tooltips: `Copy` }}
              style={{ margin: 0, color: "#fff" }}
            >
              {`${displayAddress(publicSpend)}`}
            </Paragraph>
          </div>
          <div
            style={{
              display: "flex",
              columnGap: "10px",
              justifyContent: "space-between",
              marginTop: "15px",
              marginBottom: "10px",
            }}
          >
            <Button
              type="primary"
              shape="default"
              onClick={handleAddAccount}
              style={{ width: "140px", height: "40px", fontSize: "17px" }}
            >
              Add Account
            </Button>
            <Tooltip
              title="Click to receive 1 devnet SOL into your account"
              placement="right"
            ></Tooltip>
            <Button
              type="primary"
              shape="default"
              style={{ width: "140px", height: "40px", fontSize: "17px" }}
              onClick={handleSendToStealth}
            >
              Send
            </Button>
          </div>

          <div
            style={{
              marginLeft: "30px",
              marginRight: "30px",
              marginTop: "23px",
              width: "77%",
              padding: "0.2rem 0.7rem",
              backgroundColor: "rgb(42, 42, 42)",
              overflowY: "auto",
              maxHeight: "275px",
            }}
          >
            <List
              dataSource={stealthAccounts}
              locale={{
                emptyText: spinning ? <Skeleton active={true} /> : <Empty />,
              }}
              renderItem={(item) => (
                <List.Item
                  key={item[0]}
                  onClick={() => {
                    setStealth(item[0]);
                    setStealthBalance(item[1]);
                    handleSendFromStealth();
                  }}
                >
                  <List.Item.Meta
                    avatar={<Avatar src={"/static/images/solana.png"} />}
                    title={displayAddress(item[2].toBase58())}
                    description={`${item[1] ? item[1] : "-"} SOL`}
                  />
                </List.Item>
              )}
            />
          </div>
        </Dashboard>
      )}
    </>
  );
};

export default Stealth;
