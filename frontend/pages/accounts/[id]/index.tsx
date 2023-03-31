import React, { useEffect, useState } from "react";
import { NextPage } from "next";
import { useRouter } from "next/router";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { displayAddress } from "../../../utils";
import styles from "../../../components/Layout/index.module.css";
import Link from "next/link";
import Paragraph from "antd/lib/typography/Paragraph";
import { Image } from "antd";
import CopyableBox from "../../../components/CopyableBox";
import { Box } from "../../../styles/StyledComponents.styles";
import EditableBox from "../../../components/EditableBox";
import { useGlobalState } from "../../../context";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAvatar } from "../../../utils/avatar";

const Account: NextPage = () => {
  const router = useRouter();
  const { avatar, setAvatar } = useGlobalState();
  const [accountName, setAccountName] = useState<string>("");
  const [pk, setPk] = useState<string>("");
  const [pda, setPda] = useState<string>("");

  let { id } = router.query;
  if (!id) {
    id = "1";
  }
  if (Array.isArray(id)) {
    id = id[0];
  }
  const selectedId = parseInt(id);

  const handleNameChange = (newName: string) => {
    console.log(newName);
    chrome.storage.sync.get("accounts", (res) => {
      var accountRes = res["accounts"];
      if (accountRes != null) {
        var old = JSON.parse(accountRes);
        for (var key in old) {
          if (key == id) {
            old[id]["name"] = newName;
            setAccountName(newName);

            break;
          }
        }
        var values = JSON.stringify(old);
        chrome.storage.sync.set({ accounts: values });
      } else {
        return false;
      }
    });
  };

  useEffect(() => {
    chrome.storage.sync.get(["currId", "accounts"]).then(async (result) => {
      const accountObj = JSON.parse(result["accounts"]);
      const name = accountObj[selectedId]["name"];
      const pk = accountObj[selectedId]["pk"];
      const pda = accountObj[selectedId]["pda"];
      setAccountName(name);
      setPk(pk);
      setPda(pda);
      if (accountObj[selectedId]["avatar"]) {
        const connection = new Connection("https://api.devnet.solana.com/");
        const avatarData = await getAvatar(
          connection,
          new PublicKey(accountObj[selectedId]["avatar"])
        );
        const avatarSVG = `data:image/svg+xml;base64,${avatarData?.toString(
          "base64"
        )}`;
        setAvatar(avatarSVG);
      } else {
        setAvatar(undefined);
      }
    });
  }, [selectedId, setAvatar]);

  return (
    <>
      <div
        style={{ display: "flex", alignItems: "center", marginBottom: "15px" }}
      >
        <Link href="/accounts" passHref>
          <a
            style={{
              position: "absolute",
              left: "30px",
              top: "30px",
              fontSize: "16px",
            }}
          >
            <ArrowLeftOutlined /> Back
          </a>
        </Link>

        <h1 className={"title"}>Account Info</h1>
      </div>

      <EditableBox
        fieldName="Name"
        value={accountName}
        handleChange={handleNameChange}
      />
      <CopyableBox
        fieldName="Wallet Address"
        value={displayAddress(pda)}
        copyableValue={pda}
      />
      <CopyableBox
        fieldName="Keypair Address"
        value={displayAddress(pk)}
        copyableValue={pk}
      />
      <Image
        width={"23%"}
        style={{
          alignItems: "center",
          marginTop: "15px",
        }}
        alt="profile avatar"
        src={avatar ? avatar : "/static/images/profile.png"}
      />
    </>
  );
};

export default Account;
