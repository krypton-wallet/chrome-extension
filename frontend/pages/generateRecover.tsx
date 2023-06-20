import { LoadingOutlined } from "@ant-design/icons";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import useInterval from "@use-it/interval";
import { Alert, Button, Form, Input } from "antd";
import { NextPage } from "next";
import { useCallback, useEffect, useState } from "react";
import RecoverBox from "../components/RecoverBox";
import UrlBox from "../components/UrlBox";
import { useGlobalState } from "../context";
import * as krypton from "../js/src/generated/index";
import { StyledForm } from "../styles/StyledComponents.styles";
import { RPC_URL } from "../utils/constants";
import {
  getCurrentAccount,
  sendAndConfirmTransactionWithAccount,
} from "../utils";
import { useGlobalModalContext } from "../components/GlobalModal";

const GenerateRecover: NextPage = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [recoverPK, setRecoverPK] = useState<string>();
  const [signed, setSigned] = useState<number>(0);
  const [recoveryThreshold, setRecoveryThreshold] = useState<number>();
  const [err, setErr] = useState<string>("");
  const [form] = Form.useForm();
  const { account, setAccount, network } = useGlobalState();

  const updateSigns = useCallback(
    async (recover: string) => {
      if (!account) {
        return;
      }
      const connection = new Connection(RPC_URL(network), "confirmed");
      const profileAccount = await connection.getAccountInfo(
        new PublicKey(recover)
      );
      if (!profileAccount) {
        console.log("no profile account found");
        return;
      }
      const [profile] =
        krypton.UserProfile.fromAccountInfo(profileAccount);

      // if (profileHeader.recovery.toBase58() != account.pda) {
        // console.log("invalid recovery");
        // return;
      // }

      // const signed = profileHeader.guardians.filter(
        // (g) => !g.pubkey.equals(SystemProgram.programId) && g.hasSigned
      // );

      // setSigned(signed.length);
      // setRecoveryThreshold(profileHeader.recoveryThreshold);
    },
    [account, network]
  );

  useEffect(() => {
    if (!account || !account.recover) {
      return;
    }
    setRecoverPK(account.recover);
    updateSigns(account.recover);
  }, [account, updateSigns]);

  useInterval(async () => {
    if (!account || !account.recover) {
      return;
    }
    await updateSigns(account.recover);
  }, 2000);

  const handleGenerate = async (values: any) => {
    if (!account) {
      return;
    }
    setLoading(true);

    const connection = new Connection(RPC_URL(network), "confirmed");

    const newPK = new PublicKey(account.pda);
    const feePayerPK = new PublicKey(account.pk);
    const profileInfo = new PublicKey(values.pk);
    const oldProfileAccount = await connection.getAccountInfo(profileInfo);
    if (!oldProfileAccount) {
      console.log("no profile account found");
      return;
    }
    const [oldProfile] =
      krypton.ProfileHeader.fromAccountInfo(oldProfileAccount);
    const authorityInfo = oldProfile.authority;

    // update chrome storage
    await chrome.storage.local
      .get(["currId", "accounts", "y_accounts", "mode", "y_id"])
      .then((result) => {
        const selectedMode = result["mode"];
        const accountObj =
          selectedMode === 0
            ? JSON.parse(result["accounts"])
            : JSON.parse(result["y_accounts"]);
        const currId = selectedMode === 0 ? result["currId"] : result["y_id"];
        accountObj[currId].recover = values.pk;
        const newAccounts = JSON.stringify(accountObj);
        if (selectedMode === 0) {
          chrome.storage.local.set({ accounts: newAccounts });
        } else if (selectedMode === 1) {
          chrome.storage.local.set({ y_accounts: newAccounts });
        } else {
          return false;
        }
      });
    setAccount((prev) => {
      if (prev) {
        prev.recover = values.pk;
      }
      return prev;
    });

    // initialize recovery
    console.log("Initializing recovery...");
    const initializeRecoveryIx = krypton.createInitializeRecoveryInstruction({
      profileInfo,
      authorityInfo,
      newProfileInfo: newPK,
      newAuthorityInfo: feePayerPK,
    });
    let recentBlockhash = await connection.getLatestBlockhash();
    const initializeRecoveryTx = new Transaction({
      feePayer: feePayerPK,
      ...recentBlockhash,
    });
    initializeRecoveryTx.add(initializeRecoveryIx);
    const initializeRecoveryTxid = await sendAndConfirmTransactionWithAccount(
      connection,
      initializeRecoveryTx,
      [account],
      {
        skipPreflight: true,
        preflightCommitment: "confirmed",
        commitment: "confirmed",
      }
    );
    console.log(
      `https://explorer.solana.com/tx/${initializeRecoveryTxid}?cluster=${network}`
    );

    // update guardian signs
    await updateSigns(values.pk);

    setRecoverPK(values.pk);
    setLoading(false);
  };

  console.log(recoverPK, recoveryThreshold, signed);
  return (
    <>
      <h1 className={"title"}>Recover Wallet with Guardians</h1>
      {!recoverPK || !recoveryThreshold || signed < recoveryThreshold ? (
        <>
          <p>Enter your old public key to get a unique recovery link</p>
          {err && <Alert message={err} type="error" />}
          {!recoverPK ? (
            <StyledForm
              form={form}
              layout="vertical"
              autoComplete="off"
              requiredMark={false}
              onFinish={handleGenerate}
            >
              <div style={{ overflow: "hidden" }}>
                <Form.Item
                  name="pk"
                  rules={[
                    {
                      required: true,
                      message: "Please enter your public key",
                    },
                    {
                      validator(_, value) {
                        if (!PublicKey.isOnCurve(value)) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error("Invalid public key"));
                      },
                    },
                  ]}
                >
                  <Input
                    placeholder="Public Key"
                    style={{
                      minWidth: "300px",
                      backgroundColor: "rgb(34, 34, 34)",
                      color: "#d3d3d3",
                      border: "1px solid #d3d3d3",
                    }}
                  />
                </Form.Item>
              </div>

              {!loading ? (
                <Form.Item shouldUpdate className="submit">
                  {() => (
                    <Button
                      htmlType="submit"
                      type="primary"
                      disabled={
                        !form.isFieldsTouched(true) ||
                        form
                          .getFieldsError()
                          .filter(({ errors }) => errors.length).length > 0
                      }
                    >
                      Generate
                    </Button>
                  )}
                </Form.Item>
              ) : (
                <LoadingOutlined
                  style={{ fontSize: 24, color: "#fff", marginTop: "36px" }}
                  spin
                />
              )}
            </StyledForm>
          ) : (
            <>
              <p style={{ textAlign: "center" }}>
                Copy the following link and send it to your guardians for them
                to sign the recovery
              </p>
              <UrlBox url={`http://localhost:3000/recover/${recoverPK}`} />
              <p>
                {signed} out of {recoveryThreshold} guardians have signed!
              </p>
            </>
          )}
        </>
      ) : (
        signed >= recoveryThreshold && (
          <RecoverBox profileInfo={new PublicKey(recoverPK)} />
        )
      )}
    </>
  );
};

export default GenerateRecover;
