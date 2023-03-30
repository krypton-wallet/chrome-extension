import { Badge, Dropdown, Menu, Divider, MenuProps, Button } from "antd";
import React, {
  BaseSyntheticEvent,
  ReactElement,
  useEffect,
  useState,
} from "react";
import {
  DownOutlined,
  UserOutlined,
  ArrowLeftOutlined,
  LogoutOutlined,
  CreditCardOutlined,
  WalletOutlined,
  TeamOutlined,
  AppstoreOutlined,
  SwapOutlined,
  MedicineBoxOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import styles from "./index.module.css";
import { useGlobalState } from "../../context";
import { useRouter } from "next/router";
import { Cluster } from "@solana/web3.js";

type DomEvent = {
  domEvent: BaseSyntheticEvent;
  key: string;
  keyPath: Array<string>;
};

const Layout = ({ children }: { children: JSX.Element }): ReactElement => {
  const { network, setNetwork, account, setAccount, setBalance, currId, pda } =
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

  const handleLogout = () => {
    setAccount(null);
    setNetwork("devnet");
    setBalance(0);
    router.push("/");
  };

  const handleAccountSwitch = () => {
    router.push("/accounts");
  };

  const settingMenu = (
    <Menu>
      <Menu.Item key="/account" icon={<UserOutlined />}>
        <Link href="/account" passHref>
          Account
        </Link>
      </Menu.Item>
    </Menu>
  );

  useEffect(() => {
    // Set account name
    if (
      router.pathname != "/" &&
      router.pathname != "/signup" &&
      router.pathname != "/accounts/yubikey/signup"
    ) {
      chrome.storage.sync
        .get(["currId", "accounts", "y_accounts", "mode", "y_id"])
        .then((result) => {
          if (result["mode"] == 0) {
            const id = result["currId"];
            const accountObj = JSON.parse(result["accounts"]);
            const name = accountObj[id]["name"];
            setAccountName(name);
          } else if (result["mode"] == 1) {
            const y_id = result["y_id"];
            const accountObj = JSON.parse(result["y_accounts"]);
            console.log("yid: ", y_id);
            const name = accountObj[y_id]["name"];
            setAccountName(name);
          }
        });
    }
  }, [currId, pda]);

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        {!router.pathname.startsWith("/accounts") &&
          router.pathname != "/" &&
          router.pathname != "/signup" &&
          router.pathname != "/accounts/yubikey/signup" && (
            <header className={styles.header}>
              <Button
                shape="round"
                icon={<UserOutlined />}
                onClick={handleAccountSwitch}
                size="middle"
                style={{ marginLeft: "10px" }}
              >
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
          router.pathname != "/" &&
          router.pathname != "/signup" &&
          router.pathname != "/accounts/yubikey/signup" && (
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
