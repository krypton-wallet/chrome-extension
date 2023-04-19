import React, { useEffect, useMemo, useState } from "react";
import { NextPage } from "next";
import {
  Button,
  Tooltip,
  Typography,
  List,
  Avatar,
  Skeleton,
  Empty,
  Result,
} from "antd";
import { useRouter } from "next/router";

import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
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
import { receiverGenKey, scan } from "solana-stealth";
import Link from "next/link";
import styles from "../../components/Layout/index.module.css";

const Stealth: NextPage = () => {
  const { network, account } = useGlobalState();
  const [spinning, setSpinning] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [finished, setFinished] = useState<boolean>(false);
  const [failed, setFailed] = useState<boolean>(false);
  const [duplicate, setDuplicate] = useState<boolean>(false);
  const [publicScan, setPublicScan] = useState<string>("");
  const [publicSpend, setPublicSpend] = useState<string>("");
  const [foundAccounts, setFoundAccounts] = useState<
    Array<[string, number | undefined, PublicKey]>
  >([]);
  const router = useRouter();
  const connection = useMemo(
    () => new Connection(clusterApiUrl(network), "confirmed"),
    [network]
  );

  useEffect(() => {
    console.log("============SCAN PAGE=================");
    setSpinning(true);

    console.log("acc: ", account);
    if (!account) {
      router.push("/");
      return;
    }

    const findAccounts = async () => {
      const priv_scan = new StealthSigner(account.stealth.priv_scan);
      const scan_key = await priv_scan.getPublicKey();
      setPublicScan(scan_key.toBase58());

      const spend = new StealthSigner(account.stealth.priv_spend);
      const spend_key = await spend.getPublicKey();
      setPublicSpend(spend_key.toBase58());

      if (!account.stealth_accounts || account.stealth_accounts.length <= 0) {
        setFoundAccounts([]);
        setSpinning(false);
        return;
      }

      const connection = new Connection(clusterApiUrl(network), "confirmed");
      const found_accs: Array<[string, number | undefined, PublicKey]> = [];
      const res = await scan(
        connection,
        account.stealth.priv_scan,
        spend_key.toBase58()
      );

      let stealth_accs: string[] = [];
      if (account.stealth_accounts && account.stealth_accounts.length > 0) {
        stealth_accs = account.stealth_accounts;
      }
      for (const scan_info of res) {
        if (scan_info.token) {
          continue; //token accounts not currently supported
        }
        let key = await receiverGenKey(
          account.stealth.priv_scan,
          account.stealth.priv_spend,
          scan_info.ephem
        );

        if (stealth_accs.includes(key)) {
          continue; //duplicate
        }

        const pubkey = new PublicKey(scan_info.account);
        let lamps = (await connection.getAccountInfo(pubkey))?.lamports;
        if (lamps) {
          lamps /= LAMPORTS_PER_SOL;
        }
        found_accs.push([key, lamps, pubkey]);
      }

      setFoundAccounts(found_accs);
      setSpinning(false);
    };
    findAccounts();
  }, [account, network, router]);

  const handleAddAccount = async (key: string) => {
    console.log("adding: ", key);
    console.log("ok");
    if (!account) {
      router.push("/");
      return;
    }
    setLoading(true);
    setFinished(false);
    setFailed(false);

    await chrome.storage.local
      .get(["currId", "accounts", "y_accounts", "mode", "y_id"])
      .then(async (result) => {
        const id = result["mode"] === 0 ? result["currId"] : result["y_id"];
        const old =
          result["mode"] === 0
            ? JSON.parse(result["accounts"])
            : JSON.parse(result["y_accounts"]);
        let stealth_accs: string[] = [];
        if (account.stealth_accounts && account.stealth_accounts.length > 0) {
          stealth_accs = account.stealth_accounts;
        }
        try {
          const signer = new StealthSigner(key);
          await connection.getAccountInfo(await signer.getPublicKey());
          stealth_accs.push(key);
        } catch (error) {
          console.log("error");
          setLoading(false);
          setFinished(true);
          setFailed(true);
          return;
        }
        const { stealth_accounts: _, ...rest } = old[id];
        old[id] = {
          stealth_accounts: stealth_accs,
          ...rest,
        };
        const accs = JSON.stringify(old);

        if (result["mode"] === 0) {
          chrome.storage.local.set({
            accounts: accs,
          });
        } else if (result["mode"] === 1) {
          chrome.storage.local.set({
            y_accounts: accs,
          });
        }
      });
    // TODO: maybe setAccount
    setLoading(false);
    setFinished(true);
  };

  console.log("shhh2: ", foundAccounts);
  return (
    <>
      {account && !finished && (
        <Dashboard>
          <h1 style={{ marginBottom: 0, color: "#fff" }}>Scan</h1>
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
              width: "50%",
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
              width: "50%",
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
              dataSource={foundAccounts}
              locale={{
                emptyText: spinning ? <Skeleton active={true} /> : <Empty />,
              }}
              renderItem={(item) => (
                <List.Item
                  key={item[0]}
                  onClick={() => {
                    handleAddAccount(item[0]);
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
      {finished && !failed && (
        <>
          <Result status="success" title="Added!" />
          <Link href="/stealth" passHref>
            <a className={styles.back}>
              <ArrowLeftOutlined /> Back Home
            </a>
          </Link>
        </>
      )}
      {finished && failed && (
        <>
          <Result status="error" title="Something Went Wrong" />
          <Link href="/stealth" passHref>
            <a className={styles.back}>
              <ArrowLeftOutlined /> Back Home
            </a>
          </Link>
        </>
      )}
    </>
  );
};

export default Stealth;
