import React, { useEffect, useState } from "react";
import { NextPage } from "next";
import { Button, Tooltip, Drawer, Typography, List, Avatar } from "antd";
import { useGlobalState } from "../context";
import { useRouter } from "next/router";
import TransactionLayout from "../components/TransactionLayout";
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
import bs58 from "bs58";

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
  } = useGlobalState();
  const [spinning, setSpinning] = useState<boolean>(true);
  const [fungibleTokens, setFungibleTokens] = useState<
    Array<[PublicKey, bigint, number]>
  >([]);
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
        walletProgramId
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

    // Fetching all tokens from PDA and filter out fungible tokens
    const getTokens = async () => {
      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
      console.log("account: ", account?.publicKey.toBase58());
      const profile_pda = PublicKey.findProgramAddressSync(
        [
          Buffer.from("profile", "utf-8"),
          account?.publicKey.toBuffer() ?? new Buffer(""),
        ],
        walletProgramId
      );
      setPDA(profile_pda[0]);
      console.log("PDA: ", profile_pda[0].toBase58());

      let tokens_tmp: Array<[PublicKey, bigint, number]> = [];
      let fungible_tokens_tmp: Array<[PublicKey, bigint, number]> = [
        [PublicKey.default, BigInt(0), 0],
      ];
      let allTA_res = await connection.getTokenAccountsByOwner(profile_pda[0], {
        programId: TOKEN_PROGRAM_ID,
      });

      for (const e of allTA_res.value) {
        const oldTokenAccount = e.pubkey;
        const accountInfo = AccountLayout.decode(e.account.data);

        const mint = new PublicKey(accountInfo.mint);
        const amount = accountInfo.amount;
        const mintData = await connection.getTokenSupply(mint);
        const decimals = mintData.value.decimals;

        console.log(`Token Account: ${oldTokenAccount.toBase58()}`);
        console.log(`mint: ${mint}`);
        console.log(`amount: ${amount}`);
        console.log(`decimals: ${decimals}`);
        tokens_tmp.push([mint, amount, decimals]);
        if (decimals > 0) {
          fungible_tokens_tmp.push([mint, amount, decimals]);
        }
      }
      setTokens(tokens_tmp);
      setFungibleTokens(fungible_tokens_tmp);
      setSpinning(false);
    };
    getTokens();
  }, [balance, router, network]);

  const airdrop = async () => {
    setAirdropLoading(true);
    const updatedBalance = await handleAirdrop(network ?? "devnet", account);
    if (typeof updatedBalance === "number") {
      setBalance(updatedBalance);
    }
    setAirdropLoading(false);
  };

  const handleSend = () => {
    router.push("/transfer");
  };

  return (
    <>
      {account && (
        <Dashboard>
          <h1 style={{ marginBottom: 0, color: "#fff" }}>Dashboard</h1>

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
            {network === "devnet" && account && (
              <>
                <Button
                  type="primary"
                  shape="default"
                  onClick={airdrop}
                  style={{ width: "140px", height: "40px", fontSize: "17px" }}
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
            <Button
              type="primary"
              shape="default"
              style={{ width: "140px", height: "40px", fontSize: "17px" }}
              onClick={handleSend}
            >
              Send
            </Button>
          </div>

          <div
            style={{
              marginLeft: "30px",
              marginRight: "30px",
              marginTop: "30px",
              width: "80%",
              padding: "0.2rem 0.7rem",
              backgroundColor: "rgb(42, 42, 42)",
            }}
          >
            <List
              dataSource={fungibleTokens}
              loading={spinning}
              renderItem={(item) => (
                <List.Item
                  key={item[0].toBase58()}
                  onClick={() => {
                    if(item[0] == PublicKey.default) {
                      handleSend()
                    } else {
                      router.push({
                        pathname: '/token/[pk]',
                        query: { pk: item[0].toBase58() ?? null },
                      });
                    }
                  }}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        src={
                          item[0] == PublicKey.default
                            ? "/static/images/solana.png"
                            : "/static/images/token.png"
                        }
                      />
                    }
                    title={
                      item[0] == PublicKey.default ? "Solana" : "Unknown Token"
                    }
                    description={
                      item[0] == PublicKey.default
                        ? `${balance} SOL`
                        : displayAddress(item[0].toBase58())
                    }
                  />
                  {item[0] != PublicKey.default && (
                    <p>
                      {(Number(item[1]) / Math.pow(10, item[2])).toString()}
                    </p>
                  )}
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
