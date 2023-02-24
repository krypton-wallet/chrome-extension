import React, { useEffect, useState } from "react";
import { NextPage } from "next";
import { Button, Tooltip, Drawer, Typography } from "antd";
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
} from "@solana/web3.js";
import bs58 from "bs58";

const { Paragraph } = Typography;

const Wallet: NextPage = () => {
  const { network, balance, setBalance, account, setAccount } =
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
      console.log("Value currently is " + result.sk);
      const currKeypair = Keypair.fromSecretKey(bs58.decode(result.sk));
      setAccount(currKeypair);
      const connection = new Connection(clusterApiUrl(network), "confirmed");
      const balance1 = await connection.getBalance(currKeypair.publicKey);
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
          <h1>Dashboard</h1>

          <Paragraph
            copyable={{ text: account.publicKey.toString(), tooltips: `Copy` }}
          >
            {`Account: ${displayAddress(account.publicKey.toString())}`}
          </Paragraph>

          <p>
            Connected to{" "}
            {network &&
              (network === "mainnet-beta"
                ? network.charAt(0).toUpperCase() + network.slice(1, 7)
                : network.charAt(0).toUpperCase() + network.slice(1))}
          </p>
          {airdropLoading ? (
            <h2>
              <LoadingOutlined spin />
            </h2>
          ) : (
            <h2>
              {balance} <span>SOL</span>
            </h2>
          )}

          {network === "devnet" && account && (
            <>
              <Airdrop onClick={airdrop}>Airdrop</Airdrop>
              <Tooltip
                title="Click to receive 1 devnet SOL into your account"
                placement={"right"}
              >
                <Question>?</Question>
              </Tooltip>
            </>
          )}

          {/* <Button type="primary" onClick={showModal}>
            Send <ArrowRightOutlined />
          </Button>

          <Drawer
            title="Send Funds"
            placement="bottom"
            onClose={handleClose}
            visible={visible}
            height={"55vh"}
          >
            <TransactionLayout />
          </Drawer> */}
        </Dashboard>
      )}
    </>
  );
};

export default Wallet;
