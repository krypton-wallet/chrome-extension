import React, { useEffect, useState } from "react";
import { NextPage } from "next";
import { List, Avatar, Button, Skeleton, Empty } from "antd";
import { useGlobalState } from "../../context";
import {
  UserAddOutlined,
  ArrowLeftOutlined,
  MoreOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { AccountLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { displayAddress } from "../../utils";
import { useRouter } from "next/router";
import {
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import bs58 from "bs58";
import Link from "next/link";
import styles from "../../components/Layout/index.module.css";
import { KeypairSigner } from "../../types/account";
import { getAvatar } from "../../utils/avatar";

const AccountList: NextPage = () => {
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
    setAvatar,
  } = useGlobalState();

  const [accounts, setAccounts] = useState<
    Array<[number, string, string, string?]>
  >([]);
  const [spinning, setSpinning] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    // Fetching all accounts from chrome storage
    chrome.storage.sync.get("accounts").then(async (result) => {
      const accountObj = JSON.parse(result["accounts"]);
      let accountTmp: Array<[number, string, string, string?]> = [];
      for (var id in accountObj) {
        const name = accountObj[id].name;
        const pda = accountObj[id].pda;
        if (accountObj[id].avatar) {
          const connection = new Connection("https://api.devnet.solana.com/");
          const avatarData = await getAvatar(
            connection,
            new PublicKey(accountObj[id].avatar)
          );
          const avatarSVG = `data:image/svg+xml;base64,${avatarData?.toString(
            "base64"
          )}`;
          accountTmp.push([Number(id), name, pda, avatarSVG]);
        } else {
          accountTmp.push([Number(id), name, pda]);
        }
      }
      setAccounts(accountTmp);
      setSpinning(false);
    });
  }, []);

  const handleAddAccount = () => {
    router.push("/accounts/onboard");
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center" }}>
        <Link href="/wallet" passHref>
          <a
            style={{
              position: "absolute",
              left: "30px",
              top: "30px",
              fontSize: "16px",
            }}
          >
            <CloseOutlined />
          </a>
        </Link>

        <h1 className={"title"}>Accounts</h1>
      </div>
      <div className={"tokenlist"}>
        <List
          dataSource={accounts}
          locale={{
            emptyText: spinning ? <Skeleton active={true} /> : <Empty />,
          }}
          renderItem={(item) => (
            <List.Item
              key={item[2]}
              onClick={async () => {
                console.log("=============SWITCHING ACCOUNT===============");
                const id = item[0];
                chrome.storage.sync.set({ currId: id });
                // router.push({
                //   pathname: "/accounts/[id]",
                //   query: { id: item[2] },
                // });
                setCurrId(id);
                if (item.length > 3) {
                  setAvatar(item[3]);
                } else {
                  setAvatar(undefined);
                }

                chrome.storage.sync.get(["accounts"]).then(async (result) => {
                  const accountObj = JSON.parse(result["accounts"]);
                  const secretKey = accountObj[id]["sk"];
                  chrome.storage.sync.set({ sk: secretKey });

                  const currKeypair = Keypair.fromSecretKey(
                    bs58.decode(secretKey)
                  );
                  setAccount(new KeypairSigner(currKeypair));
                  const profile_pda = PublicKey.findProgramAddressSync(
                    [
                      Buffer.from("profile", "utf-8"),
                      currKeypair.publicKey.toBuffer(),
                    ],
                    walletProgramId
                  );
                  setPDA(profile_pda[0]);
                  const connection = new Connection(
                    clusterApiUrl(network),
                    "confirmed"
                  );
                  const balance1 = await connection.getBalance(profile_pda[0]);
                  setBalance(balance1 / LAMPORTS_PER_SOL);
                });
                await new Promise((resolve) => setTimeout(resolve, 60));

                router.push("/wallet");
              }}
            >
              <List.Item.Meta
                avatar={
                  <Avatar
                    src={
                      item.length > 3 ? item[3] : "/static/images/profile.png"
                    }
                  />
                }
                title={item[1]}
                description={displayAddress(item[2])}
              />

              <Button
                type="text"
                shape="circle"
                icon={<MoreOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  router.push({
                    pathname: "/accounts/[id]",
                    query: { id: item[0] },
                  });
                }}
                className="more-button"
              />
            </List.Item>
          )}
        />
      </div>

      <Button
        type="primary"
        icon={<UserAddOutlined />}
        onClick={handleAddAccount}
        size="middle"
        style={{ position: "absolute", bottom: "87px", width: "85%" }}
      >
        Create/Add New Account
      </Button>
    </>
  );
};

export default AccountList;
