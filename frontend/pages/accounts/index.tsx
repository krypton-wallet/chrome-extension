import React, { useEffect, useState } from "react";
import { NextPage } from "next";
import {
  List,
  Avatar,
  Button,
  Skeleton,
  Empty,
  Dropdown,
  Space,
  MenuProps,
} from "antd";
import { useGlobalState } from "../../context";
import {
  UserAddOutlined,
  ArrowLeftOutlined,
  MoreOutlined,
  CloseOutlined,
  DownOutlined,
} from "@ant-design/icons";
import { AccountLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { displayAddress, getSignerFromPkString } from "../../utils";
import { useRouter } from "next/router";
import {
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import Link from "next/link";
import { useGlobalModalContext } from "../../components/GlobalModal";

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
  } = useGlobalState();

  const [allAccounts, setAllAccounts] = useState<
    Array<[number, number, string, string]>
  >([]);
  const [standardAccounts, setStandardAccounts] = useState<
    Array<[number, number, string, string]>
  >([]);
  const [yubikeyAccounts, setYubikeyAccounts] = useState<
    Array<[number, number, string, string]>
  >([]);
  const [currAccounts, setCurrAccounts] = useState<
    Array<[number, number, string, string]>
  >([]);
  const [filter, setFilter] = useState<string>("All");

  const [spinning, setSpinning] = useState<boolean>(true);
  const router = useRouter();

  const onClick: MenuProps["onClick"] = ({ key }) => {
    if (key == "1") {
      setCurrAccounts(allAccounts);
      setFilter("All");
    } else if (key == "2") {
      setCurrAccounts(standardAccounts);
      setFilter("Standard");
    } else if (key == "3") {
      setCurrAccounts(yubikeyAccounts);
      setFilter("Yubikey");
    }
  };

  const items: MenuProps["items"] = [
    {
      label: "All",
      key: "1",
    },
    {
      label: "Standard",
      key: "2",
    },
    {
      label: "Yubikey",
      key: "3",
    },
  ];

  useEffect(() => {
    // Fetching all accounts from chrome storage
    chrome.storage.local.get(["accounts", "y_accounts"]).then((result) => {
      let accountTmp: Array<[number, number, string, string]> = [];
      let yubikeyAccountTmp: Array<[number, number, string, string]> = [];

      if (result["accounts"] != undefined) {
        const accountObj = JSON.parse(result["accounts"]);

        for (var id in accountObj) {
          const name = accountObj[id].name;
          const pda = accountObj[id].pda;
          accountTmp.push([0, Number(id), name, pda]);
        }
        setStandardAccounts(accountTmp);
        setSpinning(false);
      }

      if (result["y_accounts"] != undefined) {
        console.log(result["y_accounts"]);
        const accountObj = JSON.parse(result["y_accounts"]);
        for (var id in accountObj) {
          const name = accountObj[id].name;
          const pda = accountObj[id].pda;
          yubikeyAccountTmp.push([1, Number(id), name, pda]);
        }
        setYubikeyAccounts(yubikeyAccountTmp);
        setSpinning(false);
      }
      const allAccountsTmp = [...accountTmp, ...yubikeyAccountTmp];
      setAllAccounts(allAccountsTmp);
      setCurrAccounts(allAccountsTmp);
    });
  }, []);

  const handleAddAccount = () => {
    router.push("/accounts/onboard");
  };

  const modalContext = useGlobalModalContext();

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

      <div style={{ marginBottom: "15px" }}>
        <Dropdown menu={{ items, onClick }}>
          <a onClick={(e) => e.preventDefault()}>
            <Space>
              {filter}
              <DownOutlined />
            </Space>
          </a>
        </Dropdown>
      </div>

      <div className={"tokenlist"}>
        <List
          dataSource={currAccounts}
          locale={{
            emptyText: spinning ? <Skeleton active={true} /> : <Empty />,
          }}
          renderItem={(item) => (
            <List.Item
              key={item[3]}
              onClick={async () => {
                console.log("=============SWITCHING ACCOUNT===============");
                const mode = item[0];
                const id = item[1];
                if (mode == 0) {
                  chrome.storage.local.set({ currId: id });
                  setCurrId(id);
                } else if (mode == 1) {
                  chrome.storage.local.set({ y_id: id });
                }

                chrome.storage.local
                  .get(["accounts", "y_accounts"])
                  .then(async (result) => {
                    let publicKey = "";
                    if (mode == 0) {
                      let accountObj = JSON.parse(result["accounts"]);
                      publicKey = accountObj[id]["pk"];
                      chrome.storage.local.set({ mode: 0 });
                    } else if (mode == 1) {
                      let accountObj = JSON.parse(result["y_accounts"]);
                      publicKey = accountObj[id]["pk"];
                      chrome.storage.local.set({ mode: 1 });
                    }
                    chrome.storage.local.set({ pk: publicKey });

                    // TODO: Detoxify this
                    setAccount(
                      await getSignerFromPkString(publicKey, modalContext)
                    );

                    const profile_pda = PublicKey.findProgramAddressSync(
                      [
                        Buffer.from("profile", "utf-8"),
                        new PublicKey(publicKey).toBuffer(),
                      ],
                      walletProgramId
                    );
                    setPDA(profile_pda[0]);
                    const connection = new Connection(
                      clusterApiUrl(network),
                      "confirmed"
                    );
                    const balance1 = await connection.getBalance(
                      profile_pda[0]
                    );
                    setBalance(balance1 / LAMPORTS_PER_SOL);
                  });

                await new Promise((resolve) => setTimeout(resolve, 60));

                router.push("/wallet");
              }}
            >
              <List.Item.Meta
                avatar={<Avatar src={"/static/images/profile.png"} />}
                title={item[2]}
                description={displayAddress(item[3])}
              />

              <Button
                type="text"
                shape="circle"
                icon={<MoreOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  router.push({
                    pathname: "/accounts/[id]",
                    query: { id: item[1], mode: item[0] },
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
