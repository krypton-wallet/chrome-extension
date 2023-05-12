import { LoadingOutlined } from "@ant-design/icons";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { Button } from "antd";
import Paragraph from "antd/lib/typography/Paragraph";
import { Dispatch, SetStateAction, useState } from "react";
import { useGlobalState } from "../../context";
import * as krypton from "../../js/src/generated";
import { Box } from "../../styles/StyledComponents.styles";
import {
  displayAddress,
  getProfilePDA,
  sendAndConfirmTransactionWithAccount,
} from "../../utils";
import { RPC_URL } from "../../utils/constants";

const GuardianBox = ({
  guardian,
  editMode,
  setDeleteLoading,
}: {
  guardian: PublicKey;
  editMode: boolean;
  setDeleteLoading: Dispatch<SetStateAction<number>>;
}) => {
  const { setGuardians, account, network } = useGlobalState();
  const [loading, setLoading] = useState<boolean>(false);

  const onDelete = async () => {
    if (!account) {
      return;
    }

    setDeleteLoading((prev) => prev + 1);
    setLoading(true);

    const connection = new Connection(RPC_URL(network), "confirmed");
    const feePayerPK = new PublicKey(account.pk);
    const [profileAddress] = getProfilePDA(feePayerPK);

    console.log(guardian.toBase58());
    const deleteFromRecoveryIx =
      krypton.createRemoveRecoveryGuardiansInstruction(
        {
          profileInfo: profileAddress,
          authorityInfo: feePayerPK,
          guardian,
        },
        {
          removeRecoveryGuardianArgs: {
            numGuardians: 1,
          },
        }
      );

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

    setGuardians((prev) =>
      prev.filter((g) => {
        return g.toBase58() !== guardian.toBase58();
      })
    );
    setLoading(false);
    setDeleteLoading((prev) => prev - 1);
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
