import React, { useEffect, useState } from "react";
import { NextPage } from "next";
import { List } from "antd";
import {
  KeyOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/router";
import styles from "../../../components/Layout/index.module.css";
import Link from "next/link";
import { listCards, PgpCardInfo } from "bloss-js"
import bs58 from "bs58";
import { displayAddress } from "../../../utils";
import { useGlobalState } from "../../../context";

const YubikeyOnboard: NextPage = () => {
  const router = useRouter();
  const [keyInfos, setKeyInfos] = useState<PgpCardInfo[]>([]);
  const { setYubikeyInfo } = useGlobalState();

  const keyItems = keyInfos.map(info => {
    return <List.Item
      key={info.aid}
      onClick={() => {
        setYubikeyInfo(info);
        router.push("/accounts/yubikey/signup");
      }}
      style={{ marginBottom: "20px" }}
    >
      <List.Item.Meta
        avatar={
          <KeyOutlined style={{ fontSize: "25px", color: "#fff" }} />
        }
        title={`${info.manufacturer} Card (no. ${info.serialNumber})`}
        description={displayAddress(bs58.encode(info.pubkeyBytes))}
      />
    </List.Item>
  });

  useEffect(() => {
    listCards().then((cards: PgpCardInfo[]) => {
        setKeyInfos(cards);
    }).catch((e) => {
        alert(e)
    });
  }, []);

  return (
    <>
      <h1 className={"title"}>Select a YubiKey</h1>
      <div className={"tokenlist"} style={{ margin: "13px 0" }}>
        <List style={{ margin: "10px 0" }}>
          {keyItems}
        </List>
      </div>

      <Link href="/accounts/onboard" passHref>
        <a
          className={styles.back}
          style={{ position: "absolute", bottom: "60px", fontSize: "17px" }}
        >
          <ArrowLeftOutlined /> Back
        </a>
      </Link>
    </>
  );
};

export default YubikeyOnboard;
