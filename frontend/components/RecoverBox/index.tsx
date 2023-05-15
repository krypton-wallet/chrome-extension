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
        krypton.ProfileHeader.fromAccountInfo(oldProfileAccount);
      const authorityInfo = oldProfile.authority;
      const recovery = oldProfile.recovery;

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

      // recover tokens
      console.log("Transfering tokens...");
      recentBlockhash = await connection.getLatestBlockhash();
      const recoverTokenTx = new Transaction({
        feePayer: feePayerPK,
        ...recentBlockhash,
      });
      const allATA = await connection.getTokenAccountsByOwner(profileInfo, {
        programId: TOKEN_PROGRAM_ID,
      });
      for (const ata of allATA.value) {
        const oldTokenAccount = ata.pubkey;
        const accountInfo = AccountLayout.decode(ata.account.data);
        const mint = new PublicKey(accountInfo.mint);
        const amount = accountInfo.amount;

        console.log(`Old Token Account: ${oldTokenAccount.toBase58()}`);
        console.log(`mint: ${mint}`);
        console.log(`amount: ${amount}`);
        console.log("Getting associated token address...");
        const associatedToken = await getAssociatedTokenAddress(
          mint,
          newPK,
          true,
          TOKEN_PROGRAM_ID
        );

        console.log("Creating token account for mint...");
        recentBlockhash = await connection.getLatestBlockhash();
        const createATATx = new Transaction({
          feePayer: feePayerPK,
          ...recentBlockhash,
        }).add(
          createAssociatedTokenAccountInstruction(
            feePayerPK,
            associatedToken,
            newPK,
            mint,
            TOKEN_PROGRAM_ID
          )
        );
        await sendAndConfirmTransactionWithAccount(
          connection,
          createATATx,
          [account],
          {
            skipPreflight: true,
            preflightCommitment: "confirmed",
            commitment: "confirmed",
          }
        );

        console.log("Getting sender token account...");
        const newTokenAccount = await getAccount(
          connection,
          associatedToken,
          "confirmed",
          TOKEN_PROGRAM_ID
        );
        console.log(`New Token Account: ${newTokenAccount.address.toBase58()}`);

        const recoverTokenIx = krypton.createRecoverTokenInstruction({
          profileInfo,
          authorityInfo,
          newProfileInfo: newPK,
          newAuthorityInfo: feePayerPK,
          oldTokenAccountInfo: oldTokenAccount,
          newTokenAccountInfo: newTokenAccount.address,
        });
        recoverTokenTx.add(recoverTokenIx);
      }
      const recoverTokenTxid = await sendAndConfirmTransactionWithAccount(
        connection,
        recoverTokenTx,
        [account],
        {
          skipPreflight: true,
          preflightCommitment: "confirmed",
          commitment: "confirmed",
        }
      );
      console.log(
        `https://explorer.solana.com/tx/${recoverTokenTxid}?cluster=${network}`
      );

      await new Promise((resolve) => setTimeout(resolve, 7000));

      // recover SOL
      console.log("Transfering native SOL...");
      const recoverSOLIx = krypton.createRecoverNativeSOLInstruction({
        profileInfo,
        authorityInfo,
        newProfileInfo: newPK,
        newAuthorityInfo: feePayerPK,
      });
      recentBlockhash = await connection.getLatestBlockhash();
      const recoverSOLTx = new Transaction({
        feePayer: feePayerPK,
        ...recentBlockhash,
      });
      recoverSOLTx.add(recoverSOLIx);
      const recoverSOLTxid = await sendAndConfirmTransactionWithAccount(
        connection,
        recoverSOLTx,
        [account],
        {
          skipPreflight: true,
          preflightCommitment: "confirmed",
          commitment: "confirmed",
        }
      );
      console.log(
        `https://explorer.solana.com/tx/${recoverSOLTxid}?cluster=${network}`
      );

      console.log("RECOVERY COMPLETED! LET'S GOOOOO!");

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
