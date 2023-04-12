import React, { useState } from "react";
import { Button } from "antd";
import { Box } from "../../styles/StyledComponents.styles";
import { LoadingOutlined } from "@ant-design/icons";
import {
  clusterApiUrl,
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { useGlobalState } from "../../context";
import {
  displayAddress,
  sendAndConfirmTransactionWithAccount,
} from "../../utils";
import BN from "bn.js";
import Paragraph from "antd/lib/typography/Paragraph";
import { guardShardMap, WALLET_PROGRAM_ID } from "../../utils/constants";

const GuardianBox = ({
  guardian,
  shard,
  shardIdx,
  editMode,
}: {
  guardian: PublicKey;
  shard: string;
  shardIdx: number;
  editMode: boolean;
}) => {
  const { setGuardians, guardians, account, network } = useGlobalState();
  const [loading, setLoading] = useState<boolean>(false);

  const onDelete = async () => {
    if (!account) {
      return;
    }
    setLoading(true);
    const connection = new Connection(clusterApiUrl(network), "confirmed");
    const feePayerPK = new PublicKey(account.pk);
    const defaultpk = PublicKey.default;

    const idx3 = Buffer.from(new Uint8Array([3]));
    const new_acct_len = Buffer.from(
      new Uint8Array(new BN(1).toArray("le", 1))
    );

    const deleteFromRecoveryIx = new TransactionInstruction({
      keys: [
        {
          pubkey: new PublicKey(account.pda) ?? defaultpk,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: feePayerPK,
          isSigner: true,
          isWritable: true,
        },
        {
          pubkey: guardian,
          isSigner: false,
          isWritable: false,
        },
      ],
      programId: WALLET_PROGRAM_ID,
      data: Buffer.concat([idx3, new_acct_len]),
    });

    const recentBlockhash = await connection.getLatestBlockhash();
    // TODO: Check if Yubikey is connected
    const tx = new Transaction({
      feePayer: feePayerPK,
      ...recentBlockhash,
    });
    tx.add(deleteFromRecoveryIx);

    const txid = await sendAndConfirmTransactionWithAccount(
      connection,
      tx,
      [account],
      {
        skipPreflight: true,
        preflightCommitment: "confirmed",
        commitment: "confirmed",
      }
    );
    console.log(`https://explorer.solana.com/tx/${txid}?cluster=${network}`);

    const newGuard = guardians.filter((g) => {
      return g.toBase58() !== guardian.toBase58();
    });
    console.log(newGuard);
    guardShardMap.delete(shardIdx);
    setGuardians(newGuard);
    setLoading(false);
  };

  return (
    <Box
      style={{
        display: "flex",
        width: "350px",
        marginTop: "10px",
        justifyContent: "space-evenly",
        alignItems: "center",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            width: "100%",
            justifyContent: "space-evenly",
            marginBottom: "0.5rem",
          }}
        >
          <Paragraph
            copyable={{ text: guardian.toBase58(), tooltips: `Copy` }}
            style={{ marginBottom: 0 }}
          >
            {displayAddress(guardian.toBase58())}
          </Paragraph>
        </div>
        <div
          style={{
            display: "flex",
            width: "100%",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: "0.5rem",
          }}
        >
          <p style={{ margin: "0", color: "#bababa", fontSize: "12px" }}>
            Shard:
          </p>
          <Paragraph
            code
            copyable={{ text: shard, tooltips: `Copy` }}
            style={{ color: "#bababa", marginBottom: 0 }}
          >
            {shard}
          </Paragraph>
        </div>
      </div>
      {!loading && editMode && (
        <Button type="primary" onClick={onDelete} danger>
          Delete
        </Button>
      )}

      {loading && editMode && (
        <LoadingOutlined style={{ fontSize: 24, color: "#fff" }} spin />
      )}
    </Box>
  );
};

export default GuardianBox;
