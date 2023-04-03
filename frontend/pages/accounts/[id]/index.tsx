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

  let { id, mode } = router.query;
  if (!id) {
    id = "1";
  }
  if (Array.isArray(id)) {
    id = id[0];
  }
  const selectedId = parseInt(id);

  if (!mode) {
    mode = "0";
  }
  if (Array.isArray(mode)) {
    mode = mode[0];
  }
  const selectedMode = parseInt(mode);

  const handleNameChange = (newName: string) => {
    console.log(newName);
    chrome.storage.local.get(["accounts", "y_accounts"], (res) => {
      var accountRes = selectedMode == 0 ? res["accounts"] : res["y_accounts"];
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
        if (selectedMode == 0) {
          chrome.storage.local.set({ accounts: values });
        } else if (selectedMode == 1) {
          chrome.storage.local.set({ y_accounts: values });
        }
      } else {
        return false;
      }
    });
  };

  useEffect(() => {
    chrome.storage.local.get(["accounts", "y_accounts"]).then((result) => {
      if (selectedMode == 0) {
        const accountObj = JSON.parse(result["accounts"]);
        const name = accountObj[selectedId]["name"];
        const pk = accountObj[selectedId]["pk"];
        const pda = accountObj[selectedId]["pda"];
        setAccountName(name);
        setPk(pk);
        setPda(pda);
      } else if (selectedMode == 1) {
        const accountObj = JSON.parse(result["y_accounts"]);
        const name = accountObj[selectedId]["name"];
        const pk = accountObj[selectedId]["pk"];
        const pda = accountObj[selectedId]["pda"];
        setAccountName(name);
        setPk(pk);
        setPda(pda);
      }
    });
  }, []);

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
