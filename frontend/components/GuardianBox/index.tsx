import React, { ReactElement, useState } from "react";
import { Button, Typography } from "antd";
import { Box } from "../../styles/StyledComponents.styles";
import { LoadingOutlined } from "@ant-design/icons";
import {
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

const BN = require("bn.js");

const { Paragraph } = Typography;

const GuardianBox = ({
  guardian,
  editMode,
}: {
  guardian: PublicKey;
  editMode: boolean;
}): ReactElement => {
  const { setGuardians, guardians, walletProgramId, pda, account } =
    useGlobalState();
  const [loading, setLoading] = useState<boolean>(false);

  const onDelete = async () => {
    setLoading(true);
    const connection = new Connection("https://api.devnet.solana.com/");
    const defaultpk = PublicKey.default;

    const idx3 = Buffer.from(new Uint8Array([3]));
    const new_acct_len = Buffer.from(
      new Uint8Array(new BN(1).toArray("le", 1))
    );

    const deleteFromRecoveryIx = new TransactionInstruction({
      keys: [
        {
          pubkey: pda ?? defaultpk,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: await account!.getPublicKey(),
          isSigner: true,
          isWritable: true,
        },
        {
          pubkey: guardian,
          isSigner: false,
          isWritable: false,
        },
      ],
      programId: walletProgramId,
      data: Buffer.concat([idx3, new_acct_len]),
    });

    const recentBlockhash = await connection.getLatestBlockhash();
    const tx = new Transaction({
      feePayer: await account!.getPublicKey(),
      ...recentBlockhash,
    });
    tx.add(deleteFromRecoveryIx);

    const txid = await sendAndConfirmTransactionWithAccount(
      connection,
      tx,
      [account!],
      {
        skipPreflight: true,
        preflightCommitment: "confirmed",
        commitment: "confirmed",
      }
    );
    console.log(`https://explorer.solana.com/tx/${txid}?cluster=devnet`);

    var newGuard = guardians.filter((g) => {
      return g.toBase58() !== guardian.toBase58();
    });
    console.log(newGuard);
    setGuardians(newGuard);
    setLoading(false);
  };

  return (
    <Box
      style={{
        display: "flex",
        width: "350px",
        justifyContent: "center",
        marginTop: "10px",
      }}
    >
      <Paragraph copyable={{ text: guardian.toBase58(), tooltips: `Copy` }}>
        {displayAddress(guardian.toBase58())}
      </Paragraph>

      {!loading && editMode && (
        <Button
          style={{ marginLeft: "140px" }}
          type="primary"
          onClick={onDelete}
          danger
        >
          Delete
        </Button>
      )}

      {loading && editMode && (
        <LoadingOutlined
          style={{ fontSize: 24, color: "#fff", marginLeft: "190px" }}
          spin
        />
      )}
    </Box>
  );
};

export default GuardianBox;
