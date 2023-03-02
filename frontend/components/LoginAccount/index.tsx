import React, { useState, useEffect, ReactElement } from "react";
import { Button } from "antd";
import Link from "next/link";
import { LoginOutlined, LoadingOutlined } from "@ant-design/icons";
import { Card } from "../../styles/StyledComponents.styles";
import { refreshBalance } from "../../utils";
import { clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { useGlobalState } from "../../context";
import { useRouter } from "next/router";
import bs58 from "bs58";

const LoginAccount = (): ReactElement => {
  const [loading, setLoading] = useState<boolean>(false);
  const { network, balance, setBalance, account, setAccount, programId, setPDA } = useGlobalState();
  const router = useRouter();
  useEffect(() => {
    setLoading(false);
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    chrome.storage.sync.get(["sk"]).then(async (result) => {
      if (result.sk == undefined) {
        router.push("/");
        return;
      }
      console.log("Value currently is " + result.sk);
      const currKeypair = Keypair.fromSecretKey(bs58.decode(result.sk));
      setAccount(currKeypair);
    });
    
    const connection = new Connection(clusterApiUrl(network), "confirmed");
    const publicKey = account?.publicKey ?? new Keypair().publicKey;
    const balance1 = await connection.getBalance(publicKey);
    setBalance(balance1 / LAMPORTS_PER_SOL);

    console.log("program id: ", programId?.toBase58())
    console.log("account: ", account?.publicKey.toBase58())

    const profile_pda = PublicKey.findProgramAddressSync(
      [Buffer.from("profile", "utf-8"), account?.publicKey.toBuffer() ?? new Buffer("")],
      programId ?? PublicKey.default
    );
    setPDA(profile_pda[0]);
  };

  return (
    <Card>
      <LoginOutlined
        style={{ fontSize: "3rem", margin: "2rem 0", display: "block" }}
      />
      <h2>Already have a wallet?</h2>
      <p>
        View your portfolio and guardian list, buy and transfer assets.
      </p>

      <div className={"buttons"}>
        {!loading && (
          <Link href={`/wallet`} passHref>
            <Button type="default" onClick={handleGenerate}>
              Login to Wallet
            </Button>
          </Link>
        )}
        {loading && (
          <Button className={"disabledButton"} disabled>
            <LoadingOutlined style={{ fontSize: 24, color: "#fff" }} spin />
          </Button>
        )}
      </div>
    </Card>
  );
};

export default LoginAccount;
