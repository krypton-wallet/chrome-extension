import React, { useEffect, useState } from "react";
import { NextPage } from "next";
import { Button, Tooltip, Drawer, Typography, List, Avatar } from "antd";
import { useGlobalState } from "../context";
import { useRouter } from "next/router";
import TransactionLayout from "../components/TransactionLayout";
import { refreshBalance, handleAirdrop } from "../utils";
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
import bs58 from "bs58";

const { Paragraph } = Typography;
const programId = new PublicKey("2aJqX3GKRPAsfByeMkL7y9SqAGmCQEnakbuHJBdxGaDL");

const Wallet: NextPage = () => {
  const { network, balance, setBalance, account, setAccount, pda, setPDA } =
    useGlobalState();
  const [visible, setVisible] = useState<boolean>(false);
  //const [account, setAccount] = useState<Keypair>(new Keypair());
  const [airdropLoading, setAirdropLoading] = useState<boolean>(false);

  const router = useRouter();

  useEffect(() => {
    console.log("Balance at start: ", balance);
    chrome.storage.sync.get(["sk"]).then(async (result) => {
      if (result.sk == undefined) {
        router.push("/");
        return;
      }
      const currKeypair = Keypair.fromSecretKey(bs58.decode(result.sk));
      setAccount(currKeypair);
      const profile_pda = PublicKey.findProgramAddressSync(
        [Buffer.from("profile", "utf-8"), currKeypair.publicKey.toBuffer()],
        programId
      );
      setPDA(profile_pda[0]);
      const connection = new Connection(clusterApiUrl(network), "confirmed");
      const balance1 = await connection.getBalance(profile_pda[0]);
      setBalance(balance1 / LAMPORTS_PER_SOL);
      //await new Promise((resolve) => setTimeout(resolve, 5000));
    });

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
  }, [balance, router, network]);

  const airdrop = async () => {
    setAirdropLoading(true);
    const updatedBalance = await handleAirdrop(network ?? "devnet", account);
    if (typeof updatedBalance === "number") {
      setBalance(updatedBalance);
    }
    setAirdropLoading(false);
  };

  const showModal = () => {
    setVisible(true);
  };

  const handleClose = () => {
    setVisible(false);
  };

  const displayAddress = (address: string) =>
    `${address.slice(0, 4)}...${address.slice(-4)}`;

  return (
    <>
      {account && (
        <Dashboard>
          <h1 style={{ marginBottom: 0, color: '#fff' }}>Dashboard</h1>

          <Paragraph
            copyable={{ text: pda?.toBase58(), tooltips: `Copy` }}
            style={{ margin: 0, color: '#fff' }}
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
            {network === "devnet" && account && (
              <>
                <Button
                  type="primary"
                  shape="default"
                  onClick={airdrop}
                  style={{ width: "140px", height: '40px', fontSize: '17px' }}
                  loading={airdropLoading}
                >
                  Airdrop
                </Button>
                <Tooltip
                  title="Click to receive 1 devnet SOL into your account"
                  placement="right"
                ></Tooltip>
              </>
            )}
            <Button type="primary" shape="default" style={{ width: "140px", height: '40px', fontSize: '17px' }}>
              Send
            </Button>
          </div>

          <div
            style={{
              marginLeft: "30px",
              marginRight: "30px",
              marginTop: '30px',
              width: '80%',
              padding: "0.2rem 0.7rem",
              backgroundColor: "rgb(42, 42, 42)"
            }}
          >
            <List>
              <List.Item key="sol">
                <List.Item.Meta
                  avatar={<Avatar src={"/solana.png"} />}
                  title="Solana"
                  description={`${balance} SOL`}
                />
              </List.Item>
            </List>
          </div>

        </Dashboard>
      )}
    </>
  );
};

export default Wallet;
