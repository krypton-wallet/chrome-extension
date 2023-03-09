import React, { useEffect, useState } from "react";
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
import { displayAddress } from "../utils";

const NFT: NextPage = () => {
  const { tokens, setTokens, walletProgramId, account, setPDA } = useGlobalState();
  const [nfts, setNfts] = useState<Array<[PublicKey, bigint, number]>>([]);
  const [spinning, setSpinning] = useState<boolean>(true);

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
        walletProgramId
      );
      setPDA(profile_pda[0]);
      console.log("PDA: ", profile_pda[0].toBase58());

      let tokens_tmp: Array<[PublicKey, bigint, number]> = [];
      let nfts_tmp: Array<[PublicKey, bigint, number]> = [];
      let allTA_res = await connection.getTokenAccountsByOwner(profile_pda[0], {
        programId: TOKEN_PROGRAM_ID,
      });

      for (const e of allTA_res.value) {
        const oldTokenAccount = e.pubkey;
        const accountInfo = AccountLayout.decode(e.account.data);

        const mint = new PublicKey(accountInfo.mint);
        const amount = accountInfo.amount;
        const mintData = await connection.getTokenSupply(mint);
        const decimals = mintData.value.decimals;

        console.log(`Token Account: ${oldTokenAccount.toBase58()}`);
        console.log(`mint: ${mint}`);
        console.log(`amount: ${amount}`);
        console.log(`decimals: ${decimals}`);
        tokens_tmp.push([mint, amount, decimals]);
        if(decimals == 0){
          nfts_tmp.push([mint, amount, decimals])
        }
      }
      setTokens(tokens_tmp);
      setNfts(nfts_tmp);
      setSpinning(false);
    };
    getTokens();
  }, []);

  return (
    <>
      <h1 className={"title"}>NFT Collection</h1>
      <div className={"tokenlist"}>
        <List
          dataSource={nfts}
          loading={spinning}
          renderItem={(item) => (
            <List.Item key={item[0].toBase58()}>
              <List.Item.Meta
                avatar={<Avatar src={"/token.png"} />}
                title="Unknown Token"
                description={displayAddress(item[0].toBase58())}
              />
            </List.Item>
          )}
        />
      </div>
    </>
  );
};

export default NFT;
