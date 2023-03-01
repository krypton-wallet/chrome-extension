import { Badge, Dropdown, Menu, Divider, MenuProps } from "antd";
import React, { BaseSyntheticEvent, ReactElement } from "react";
import {
  DownOutlined,
  UserOutlined,
  ArrowLeftOutlined,
  LogoutOutlined,
  CreditCardOutlined,
  WalletOutlined,
  TeamOutlined,
  AppstoreOutlined,
  SendOutlined,
  MedicineBoxOutlined,
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
  const { network, setNetwork, account, setAccount, setBalance, setMnemonic } =
    useGlobalState();

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
      key: 'wallet',
      icon: <WalletOutlined style={{ fontSize: '23px'}}/>,
      target: '/wallet',
    },
    {
      key: 'token',
      icon: <AppstoreOutlined style={{ fontSize: '23px'}}/>,
      target: '/token',
    },
    {
      key: 'transfer',
      icon: <SendOutlined style={{ fontSize: '23px'}}/>,
      target: '/',
    }, 
    {
      key: 'guardian',
      icon: <TeamOutlined style={{ fontSize: '23px'}}/>,
      target: '/guardian',
    },
    {
      key: 'recovery',
      icon: <MedicineBoxOutlined style={{ fontSize: '23px'}}/>,
      target: '/generateRecover',
    }
  ]

  const handleMenuClick = ({ key }: { key: string }) => {
    const { target } = footerItems.find(item => item.key === key) || {};
    if(target) {
      router.push(target)
    }
  }

  const handleLogout = () => {
    setAccount(null);
    setNetwork("devnet");
    setBalance(0);
    router.push("/");
  };

  const profile = (
    <Menu>
      <Menu.Item key="/guardian" icon={<TeamOutlined />}>
        <Link href="/guardian" passHref>
          Guardian
        </Link>
      </Menu.Item>
      <Menu.Item key="/wallet" icon={<CreditCardOutlined />}>
        <Link href="/wallet" passHref>
          Wallet
        </Link>
      </Menu.Item>
      <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={handleLogout}>
        Logout
      </Menu.Item>
    </Menu>
  );

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <header className={styles.header}>
          <Link href={`/`} passHref>
            <div className={`${styles.top} ${styles.logo}`}>SolMate</div>
          </Link>

          <Menu
            mode="horizontal"
            className={styles.nav}
            selectedKeys={[router.pathname]}
          >
            <Dropdown className={styles.top} overlay={menu} disabled={!account}>
              <a
                className="ant-dropdown-link"
                onClick={(e) => e.preventDefault()}
              >
                Network <DownOutlined />
              </a>
            </Dropdown>

            {account && (
              <Dropdown
                className={styles.top}
                overlay={profile}
                disabled={!account}
              >
                <a
                  className="ant-dropdown-link"
                  onClick={(e) => e.preventDefault()}
                >
                  <UserOutlined />
                </a>
              </Dropdown>
            )}
          </Menu>
        </header>

        {children}

        {/* {router.pathname !== "/" && (
          <Link href="/" passHref>
            <a className={styles.back}>
              <ArrowLeftOutlined /> Back Home
            </a>
          </Link>
        )} */}

        {/* <Divider style={{ marginTop: "3rem" }} /> */}

        <footer className={styles.footerHome}>
          <Menu
            theme="light"
            mode="horizontal"
            items={footerItems}
            onClick={handleMenuClick}
            style={{alignItems: 'center', height: '60px'}}
            selectable={false}
          />
        </footer>
      </main>
    </div>
  );
};

export default Layout;
