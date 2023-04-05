import { Badge, Dropdown, Menu, Button, Avatar } from "antd";
import React, {
  BaseSyntheticEvent,
  ReactElement,
  useEffect,
  useState,
} from "react";
import {
  DownOutlined,
  WalletOutlined,
  TeamOutlined,
  AppstoreOutlined,
  SwapOutlined,
  MedicineBoxOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import styles from "./index.module.css";
import { useGlobalState } from "../../context";
import { useRouter } from "next/router";
import { Cluster, clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";
import { getAvatar } from "../../utils/avatar";

type DomEvent = {
  domEvent: BaseSyntheticEvent;
  key: string;
  keyPath: Array<string>;
};

const PATHS_WITHOUT_HEADER_AND_FOOTER = [
  "/",
  "/signup",
  "/accounts/yubikey/signup",
];

const Layout = ({ children }: { children: JSX.Element }): ReactElement => {
  const { network, setNetwork, account, currId, pda, avatar, setAvatar } =
    useGlobalState();
  const [accountName, setAccountName] = useState<string>("");

  const router = useRouter();

  const selectNetwork = (e: DomEvent) => {
    const networks: Array<Cluster> = ["mainnet-beta", "devnet", "testnet"];
    const selectedNetwork = networks[parseInt(e.key) - 1];
    setNetwork(selectedNetwork);
  };

  const menu = (
    <Menu>
      <Menu.Item onClick={selectNetwork} key="1">
        Mainnet {network === "mainnet-beta" && <Badge status="processing" />}
      </Menu.Item>
      <Menu.Item onClick={selectNetwork} key="2">
        Devnet {network === "devnet" && <Badge status="processing" />}
      </Menu.Item>
      <Menu.Item onClick={selectNetwork} key="3">
        Testnet {network === "testnet" && <Badge status="processing" />}
      </Menu.Item>
    </Menu>
  );

  const footerItems = [
    {
      key: "wallet",
      icon: <WalletOutlined style={{ fontSize: "23px" }} />,
      target: "/wallet",
    },
    {
      key: "nft",
      icon: <AppstoreOutlined style={{ fontSize: "23px" }} />,
      target: "/nft",
    },
    {
      key: "swap",
      icon: <SwapOutlined style={{ fontSize: "23px" }} />,
      target: "/",
    },
    {
      key: "guardian",
      icon: <TeamOutlined style={{ fontSize: "23px" }} />,
      target: "/guardian",
    },
    {
      key: "recovery",
      icon: <MedicineBoxOutlined style={{ fontSize: "23px" }} />,
      target: "/generateRecover",
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    const { target } = footerItems.find((item) => item.key === key) || {};
    if (target) {
      router.push(target);
    }
  };

  const handleAccountSwitch = () => {
    router.push("/accounts");
  };

  // Setting Menu not used now
  const settingMenu = (
    <Menu>
      {/* <Menu.Item key="/account">
        {avatar ? (
          <Avatar
            src={avatar}
            size="small"
            shape="circle"
            style={{
              marginRight: "0.25rem",
              fontSize: "16px",
            }}
            onError={() => {
              console.log("error");
              return false;
            }}
          />
        ) : (
          <UserOutlined
            style={{
              marginRight: "0.25rem",
              fontSize: "16px",
            }}
          />
        )}
        <Link href="/account" passHref>
          Account
        </Link>
      </Menu.Item> */}
    </Menu>
  );

  useEffect(() => {
    // Set account name
    if (!PATHS_WITHOUT_HEADER_AND_FOOTER.includes(router.pathname)) {
      chrome.storage.local
        .get(["currId", "accounts", "y_accounts", "mode", "y_id"])
        .then((res) => {
          const [id, accountObj] =
            res["mode"] == 0
              ? [res["currId"], JSON.parse(res["accounts"])]
              : [res["y_id"], JSON.parse(res["y_accounts"])];
          const name = accountObj[id]["name"];
          setAccountName(name);
        });
    }
  }, [currId, pda, router.pathname]);

  useEffect(() => {
    // Set avatar SVG
    if (
      ![...PATHS_WITHOUT_HEADER_AND_FOOTER, "/accounts/[id]"].includes(
        router.pathname
      )
    ) {
      chrome.storage.local
        .get(["currId", "y_id", "accounts", "y_accounts", "mode"])
        .then(async (res) => {
          const [id, accountObj] =
            res["mode"] == 0
              ? [res["currId"], JSON.parse(res["accounts"])]
              : [res["y_id"], JSON.parse(res["y_accounts"])];
          if (accountObj[id]["avatar"]) {
            const connection = new Connection(clusterApiUrl(network), "confirmed");
            const avatarData = await getAvatar(
              connection,
              new PublicKey(accountObj[id].avatar)
            );
            const avatarSVG = `data:image/svg+xml;base64,${avatarData?.toString(
              "base64"
            )}`;
            setAvatar(avatarSVG);
          } else {
            setAvatar(undefined);
          }
        });
    }
  }, [router.pathname, setAvatar]);

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        {!router.pathname.startsWith("/accounts") &&
          !PATHS_WITHOUT_HEADER_AND_FOOTER.includes(router.pathname) && (
            <header className={styles.header}>
              <Button
                shape="round"
                onClick={handleAccountSwitch}
                size="middle"
                style={{ marginLeft: "10px", paddingLeft: "1rem" }}
              >
                <Avatar
                  src={avatar ? avatar : "/static/images/profile.png"}
                  size="small"
                  shape="circle"
                  style={{
                    marginRight: "0.5rem",
                    fontSize: "16px",
                  }}
                  onError={() => {
                    console.log("error");
                    setAvatar(undefined);
                    return false;
                  }}
                />
                {accountName}
              </Button>

              <Menu
                mode="horizontal"
                className={styles.nav}
                selectedKeys={[router.pathname]}
              >
                <Dropdown
                  className={styles.top}
                  overlay={menu}
                  disabled={!account}
                >
                  <a
                    className="ant-dropdown-link"
                    onClick={(e) => e.preventDefault()}
                  >
                    {network == "devnet" ? "Devnet" : "Devnet"} <DownOutlined />
                  </a>
                </Dropdown>

                {account && (
                  <Dropdown
                    className={styles.top}
                    overlay={settingMenu}
                    disabled={!account}
                    placement="bottomRight"
                  >
                    <a
                      className="ant-dropdown-link"
                      onClick={(e) => e.preventDefault()}
                    >
                      <SettingOutlined />
                    </a>
                  </Dropdown>
                )}
              </Menu>
            </header>
          )}

        {children}

        {!router.pathname.startsWith("/adapter") &&
          router.pathname != "/accounts/onboard" &&
          !PATHS_WITHOUT_HEADER_AND_FOOTER.includes(router.pathname) && (
            <footer className={styles.footerHome}>
              <Menu
                theme="dark"
                mode="horizontal"
                items={footerItems}
                onClick={handleMenuClick}
                style={{
                  backgroundColor: "rgb(34, 34, 34)",
                  alignItems: "center",
                  height: "60px",
                }}
                selectable={false}
              />
            </footer>
          )}
      </main>
    </div>
  );
};

export default Layout;
