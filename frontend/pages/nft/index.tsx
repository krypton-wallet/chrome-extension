import React, { useEffect, useState } from "react";
import { NextPage } from "next";
import { List, Avatar, Skeleton, Empty } from "antd";
import { useGlobalState } from "../../context";
import {
  clusterApiUrl,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import { AccountLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { displayAddress } from "../../utils";
import { useRouter } from "next/router";

const NFT: NextPage = () => {
  const { network, setTokens, walletProgramId, account, setPDA } =
    useGlobalState();
  const [nfts, setNfts] = useState<Array<[PublicKey, bigint, number]>>([]);
  const [spinning, setSpinning] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    // Fetching all tokens from PDA
    const getTokens = async () => {
      const connection = new Connection(clusterApiUrl(network), "confirmed");
      const publicKey = await account!.getPublicKey();
      console.log("account: ", publicKey.toBase58());
      const profile_pda = PublicKey.findProgramAddressSync(
        [
          Buffer.from("profile", "utf-8"),
          publicKey.toBuffer(),
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

        tokens_tmp.push([mint, amount, decimals]);
        if (decimals == 0 && Number(amount) != 0) {
          console.log(`mint: ${mint}`);
          nfts_tmp.push([mint, amount, decimals]);
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
          locale={{
            emptyText: spinning ? <Skeleton active={true} /> : <Empty />,
          }}
          renderItem={(item) => (
            <List.Item
              key={item[0].toBase58()}
              onClick={() => {
                router.push({
                  pathname: "/nft/[pk]",
                  query: { pk: item[0].toBase58() ?? null },
                });
              }}
            >
              <List.Item.Meta
                avatar={<Avatar src={"/static/images/token.png"} />}
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
