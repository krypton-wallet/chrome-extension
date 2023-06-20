import { LoadingOutlined } from "@ant-design/icons";
import {
  AccountLayout,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAccount,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { Button, Result } from "antd";
import Paragraph from "antd/lib/typography/Paragraph";
import Text from "antd/lib/typography/Text";
import { useState } from "react";
import { useGlobalState } from "../../context";
import * as krypton from "../../js/src/generated/index";
import { Box } from "../../styles/StyledComponents.styles";
import { sendAndConfirmTransactionWithAccount } from "../../utils";
import { RPC_URL } from "../../utils/constants";

const RecoverBox = ({ profileInfo }: { profileInfo: PublicKey }) => {
  const { account, setAccount } = useGlobalState();
  const [loading, setLoading] = useState<boolean>(false);
  const [finished, setFinished] = useState<boolean>(false);
  const [succeeded, setSucceeded] = useState<boolean>(false);
  const [msg, setMsg] = useState<any>("");
  const { network } = useGlobalState();

  if (!account) {
    return <></>;
  }

  const onRecover = async () => {
    try {
      console.log("\n=====RECOVERING======");
      const connection = new Connection(RPC_URL(network), "confirmed");

      const feePayerPK = new PublicKey(account.pk);
      const newPK = new PublicKey(account.pda);
      const oldProfileAccount = await connection.getAccountInfo(profileInfo);
      if (!oldProfileAccount) {
        console.log("no profile account found");
        return;
      }
      const [oldProfile] =
        krypton.UserProfile.fromAccountInfo(oldProfileAccount);
      const authorityInfo = oldProfile.authority;
      // const recovery = oldProfile.recovery;

      // TODO: Check if Yubikey is connected

      // recover wallet
      console.log("Transfering profile data...");
      const recoverWalletIx = krypton.createRecoverWalletInstruction({
        profileInfo,
        authorityInfo,
        newProfileInfo: newPK,
        newAuthorityInfo: feePayerPK,
      });
      let recentBlockhash = await connection.getLatestBlockhash();
      const recoverWalletTx = new Transaction({
        feePayer: feePayerPK,
        ...recentBlockhash,
      });
      recoverWalletTx.add(recoverWalletIx);
      const recoverWalletTxid = await sendAndConfirmTransactionWithAccount(
        connection,
        recoverWalletTx,
        [account],
        {
          skipPreflight: true,
          preflightCommitment: "confirmed",
          commitment: "confirmed",
        }
      );
      console.log(
        `https://explorer.solana.com/tx/${recoverWalletTxid}?cluster=${network}`
      );

      setSucceeded(true);
    } catch (err: any) {
      setSucceeded(false);
      setMsg(err.toString());
      console.error(err);
    }
    setFinished(true);
    setLoading(false);
  };

  return (
    <Box style={{ width: "100%" }}>
      {!finished && (
        <>
          <Paragraph
            style={{ textAlign: "center", fontSize: "16px", marginBottom: "0" }}
          >
            Click <b>Recover</b> to complete recovering
          </Paragraph>
          <Paragraph style={{ textAlign: "center", fontSize: "12px" }}>
            {profileInfo.toBase58()}
          </Paragraph>
          {!loading && (
            <Button type="primary" onClick={onRecover}>
              Recover
            </Button>
          )}
          {loading && (
            <LoadingOutlined style={{ fontSize: 24, color: "#fff" }} spin />
          )}
        </>
      )}
      {finished && !succeeded && (
        <Result
          status="error"
          title="Recovery Failed"
          subTitle="Please check the error logs below"
        >
          <div className="desc" style={{ textAlign: "center" }}>
            <Text type="danger">{msg}</Text>
          </div>
        </Result>
      )}
    </Box>
  );
};

export default RecoverBox;
