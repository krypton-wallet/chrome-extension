import React, { useEffect, useState } from "react";
import { NextPage } from "next";
import { useRouter } from "next/router";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { displayAddress } from "../../../utils";
import styles from "../../../components/Layout/index.module.css";
import Link from "next/link";
import Paragraph from "antd/lib/typography/Paragraph";
import CopyableBox from "../../../components/CopyableBox";
import { Box } from "../../../styles/StyledComponents.styles";
import EditableBox from "../../../components/EditableBox";

const Account: NextPage = () => {
  const router = useRouter();
  //const { pda } = useGlobalState();
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
    chrome.storage.sync.get(["currId", "accounts"]).then((result) => {
      const accountObj = JSON.parse(result["accounts"]);
      const name = accountObj[selectedId]["name"];
      const pk = accountObj[selectedId]["pk"];
      const pda = accountObj[selectedId]["pda"];
      setAccountName(name);
      setPk(pk);
      setPda(pda);
    });
  }, []);

  return (
    <>
    <div style={{ display: "flex", alignItems: "center", marginBottom: '15px' }}>
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
      <img
        style={{
          alignItems: "center",
          width: "23%",
          height: "20%",
          marginTop: "15px",
        }}
        src="/static/images/profile.png"
      ></img>
    </>
  );
};

export default Account;
