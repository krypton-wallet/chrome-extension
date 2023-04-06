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
import { useGlobalState } from "../context";
import { useRouter } from "next/router";
import { refreshBalance, handleAirdrop, displayAddress } from "../utils";
import { ArrowRightOutlined, LoadingOutlined } from "@ant-design/icons";
import {
  Dashboard,
  Airdrop,
  Question,
} from "../styles/StyledComponents.styles";
import {
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import { AccountLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { StealthSigner } from "../types/account";

const { Paragraph } = Typography;

const Wallet: NextPage = () => {
  const {
    network,
    balance,
    setBalance,
    account,
    setAccount,
    pda,
    setPDA,
    walletProgramId,
    setTokens,
    currId,
    setCurrId,
    setStealth,
    setStealthBalance
  } = useGlobalState();
  const [spinning, setSpinning] = useState<boolean>(true);
  const [fungibleTokens, setFungibleTokens] = useState<
    Array<[PublicKey, bigint, number]>
  >([]);
  const [stealthAccounts, setStealthAccounts] = useState<
    Array<[string,number,PublicKey]>
  >([]);
  //const [account, setAccount] = useState<Keypair>(new Keypair());
  const [airdropLoading, setAirdropLoading] = useState<boolean>(false);

  const router = useRouter();

  useEffect(() => {
    console.log("============STEALTH PAGE=================");

    

    // if (!account) {
    //   router.push("/");
    //   return;
    // }
    refreshBalance(network, account)
      .then((updatedBalance) => {
        setBalance(updatedBalance);
      })
      .catch((err) => {
        console.log(err);
      });

    // Fetching all tokens from PDA and filter out fungible tokens
    const getTokens = async () => {
      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
      let s_accs2: Array<[string, number, PublicKey]> = [];
    chrome.storage.local
      .get(["currId", "accounts", "y_accounts", "mode", "y_id"])
      .then(async (result) => {
        if (result["mode"] == 0) {
          const id = result["currId"];
          const accountObj = JSON.parse(result["accounts"]);
          const s_accs = accountObj[id]["stealth_accounts"];
          for (let i = 0; i < s_accs.length; i++) {
            console.log("here");
            const str = s_accs[i];
            console.log(str);
            const ss = new StealthSigner(str);
            console.log(ss);
            const pubkey: PublicKey = await ss.getPublicKey();
            console.log("here");
            const info = await connection.getAccountInfo(pubkey);
            console.log("here");
            s_accs2.push([str, info?.lamports! / LAMPORTS_PER_SOL ,pubkey])
          }
          console.log("shhh: ", s_accs2);
          setStealthAccounts(s_accs2);
        }
      })
    };
    getTokens();
  }, [balance, router, network, currId]);



  const handleSend = () => {
    router.push("/fromstealth");
  };

  const handleSend2 = () => {
    router.push("/tostealth");
  };

  const handleAddAccount = () => {
    router.push("/addstealth");
  }

  console.log("shhh2: ", stealthAccounts);
  return (
    <>
      {account && (
        <Dashboard>
          <h1 style={{ marginBottom: 0, color: "#fff" }}>Stealth</h1>

          <Paragraph
            copyable={{ text: pda?.toBase58(), tooltips: `Copy` }}
            style={{ margin: 0, color: "#fff" }}
          >
            {`${displayAddress(pda?.toBase58() ?? "")}`}
          </Paragraph>

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
              onClick={handleSend2}
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
                    handleSend();
                  }}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        src={
                          "/static/images/solana.png"
                          
                        }
                      />
                    }
                    title={
                      displayAddress(item[2].toBase58())
                    }
                    description={  
                          `${item[1]} SOL`
                         
                    }
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

export default Wallet;
