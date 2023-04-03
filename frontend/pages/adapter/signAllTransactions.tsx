/*global chrome*/
import React, { useEffect, useState } from "react";
import { NextPage } from "next";
import { Button } from "antd";
import bs58 from "bs58";

import { Keypair, PublicKey } from "@solana/web3.js";
import { useGlobalModalContext } from "../../components/GlobalModal";
import { getSignerFromPkString } from "../../utils";

const SignAllTransactions: NextPage = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [origin, setOrigin] = useState<string>("");
  const [sig, setSig] = useState<string>("");
  const [id, setId] = useState<number>(0);
  const [payloads, setPayloads] = useState<Array<string>>([]);
  const [pk, setPk] = useState<PublicKey>(PublicKey.default);

  const modalContext = useGlobalModalContext();

  useEffect(() => {
    chrome.storage.sync.get(["searchParams", "pk"]).then(async (result) => {
      if (result.searchParams == undefined || result.pk == undefined) {
        return;
      }
      const search = result.searchParams;
      const origin = search.origin;
      const request = JSON.parse(search.request);
      console.log("request: ", request);
      const payloads = request.params.messages;
      console.log("payload: ", payloads);

      setPayloads(payloads);
      setPk(new PublicKey(result.pk));
      setId(request.id);
      setOrigin(origin);
      setSig(sig);
    });
  }, []);

  const handleCancel = () => {
    window.close();
  };

  const postMessage = (message: any) => {
    // eslint-disable-next-line no-undef
    chrome.runtime.sendMessage({
      channel: "solmate_extension_background_channel",
      data: message,
    });
  };

  const handleSubmit = async () => {
    const signer = await getSignerFromPkString(pk.toBase58(), modalContext);
    let sigs = [];
    for (const payload of payloads) {
        const sig = await signer.signMessage(bs58.decode(payload));
        const sigEncoded = bs58.encode(sig);
        sigs.push(sigEncoded);
    }

    postMessage({
      method: "signAllTransactions",
      result: {
        signatures: sigs,
        publicKey: pk,
      },
      id: id,
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    window.close();
  };

  return (
    <>
      <h1 className={"title"}>Approve Transactions</h1>
      <p>{origin}</p>
      <p style={{ marginTop: "20px", textAlign: "left", width: "75%" }}>
        Estimated Changes:
      </p>
      <div
        style={{
          height: "70px",
          backgroundColor: "#2a2a2a",
          width: "75%",
          textAlign: "center",
          justifyContent: "center",
          display: "flex",
          flexDirection: "column",
        }}
      >
        No changes
      </div>

      <div
        style={{
          display: "flex",
          columnGap: "20px",
          justifyContent: "space-between",
          marginTop: "170px",
          alignItems: "flex-end",
          height: "380px",
          position: "absolute",
        }}
      >
        <Button
          type="default"
          shape="default"
          style={{ width: "140px", height: "40px", fontSize: "17px" }}
          onClick={handleCancel}
        >
          Cancel
        </Button>
        <Button
          htmlType="submit"
          type="primary"
          loading={loading}
          style={{ width: "140px", height: "40px", fontSize: "17px" }}
          onClick={handleSubmit}
        >
          Approve
        </Button>
      </div>
    </>
  );
};

export default SignAllTransactions;
