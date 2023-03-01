import React, { useEffect } from "react";
import { NextPage } from "next";
import { List, Avatar } from "antd";
import { useGlobalState } from "../context";
import {
  clusterApiUrl,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import { AccountLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token";

const displayAddress = (address: string) =>
  `${address.slice(0, 4)}...${address.slice(-4)}`;

const Token: NextPage = () => {
  const { tokens, setTokens, programId, account, setPDA } = useGlobalState();

  useEffect(() => {
    // Fetching all tokens from PDA
    const getTokens = async () => {
      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
      console.log("account: ", account?.publicKey.toBase58());
      const profile_pda = PublicKey.findProgramAddressSync(
        [
          Buffer.from("profile", "utf-8"),
          account?.publicKey.toBuffer() ?? new Buffer(""),
        ],
        programId ?? PublicKey.default
      );
      setPDA(profile_pda[0]);
      console.log("PDA: ", profile_pda[0].toBase58());

      let tokens_tmp: Array<[PublicKey, bigint]> = [];
      let allTA_res = await connection.getTokenAccountsByOwner(profile_pda[0], {
        programId: TOKEN_PROGRAM_ID,
      });

      allTA_res.value.forEach(async (e) => {
        const oldTokenAccount = e.pubkey;
        const accountInfo = AccountLayout.decode(e.account.data);

        const mint = new PublicKey(accountInfo.mint);
        const amount = accountInfo.amount;

        console.log(`Token Account: ${oldTokenAccount.toBase58()}`);
        console.log(`mint: ${mint}`);
        console.log(`amount: ${amount}`);
        tokens_tmp.push([mint, amount]);
      });
      setTokens(tokens_tmp);
    };
    getTokens();
  }, []);

  return (
    <>
      <h1 className={"title"}>Tokens</h1>
      <div style={{ marginLeft: "1rem", marginRight: "auto", width: "300px" }}>
        <List
          dataSource={tokens}
          renderItem={(item) => (
            <List.Item key={item[0].toBase58()}>
              <List.Item.Meta
                avatar={<Avatar src={"/token.png"} />}
                title="Unknown Token"
                description={displayAddress(item[0].toBase58())}
              />
              <p>{(Number(item[1]) / LAMPORTS_PER_SOL).toString()}</p>
            </List.Item>
          )}
        />
      </div>
    </>
  );
};

export default Token;
