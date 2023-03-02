import React, { useState } from "react";
import { NextPage } from "next";
import { Button } from "antd";
import Link from "next/link";
import { LoadingOutlined } from "@ant-design/icons";

const Phrase: NextPage = () => {
  const [loading, setLoading] = useState<boolean>(false);

  const handleLoading = () => {
    setLoading(true)
  };

  return (
    <>
      <h1 className={"title"}>Create New Wallet</h1>

      <p>Generate a key pair to set up your Solana wallet.</p>

      {!loading && (
        <Link href={`/signup`} passHref>
          <Button type="primary" onClick={handleLoading}>
            Generate
          </Button>
        </Link>
      )}

      {loading && <LoadingOutlined style={{ fontSize: 24, color: "#fff" }} spin />}
    </>
  );
};

export default Phrase;
