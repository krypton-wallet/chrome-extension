import { LoadingOutlined } from "@ant-design/icons";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import useInterval from "@use-it/interval";
import { Alert, Button, Form, Input } from "antd";
import { NextPage } from "next";
import { useState } from "react";
import RecoverBox from "../components/RecoverBox";
import UrlBox from "../components/UrlBox";
import { useGlobalState } from "../context";
import * as krypton from "../js/src/generated/index";
import { StyledForm } from "../styles/StyledComponents.styles";
import { RPC_URL } from "../utils/constants";

const GenerateRecover: NextPage = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [generated, setGenerated] = useState<boolean>(false);
  const [recoverPK, setRecoverPK] = useState<string>();
  const [signed, setSigned] = useState<number>(0);
  const [recoveryThreshold, setRecoveryThreshold] = useState<number>(0);
  const [canGenerate, setCanGenerate] = useState<boolean>(true);
  const [err, setErr] = useState<string>("");
  const [form] = Form.useForm();

  const { account, network } = useGlobalState();

  useInterval(async () => {
    if (!account || !account.recover) {
      return;
    }
    const connection = new Connection(RPC_URL(network), "confirmed");
    const profileAccount = await connection.getAccountInfo(
      new PublicKey(account.recover)
    );
    if (!profileAccount) {
      console.log("no profile account found");
      return;
    }
    const [profileHeader] =
      krypton.ProfileHeader.fromAccountInfo(profileAccount);

    if (profileHeader.recovery.toBase58() != account.pda) {
      console.log("invalid recovery");
      return;
    }

    const signed = profileHeader.guardians.filter(
      (g) => !g.pubkey.equals(SystemProgram.programId) && g.hasSigned
    );

    setSigned(signed.length);
    setRecoveryThreshold(profileHeader.recoveryThreshold);
  }, 2000);

  const handleGenerate = async (values: any) => {
    if (!account) {
      return;
    }
    setGenerated(false);
    const pk = new PublicKey(values.pk);
    setRecoverPK(values.pk);
    // TODO: update account.recover = values.pk
    setGenerated(true);
  };

  return (
    <>
      <h1 className={"title"}>Recover Wallet with Guardians</h1>

      {signed < recoveryThreshold && (
        <>
          <p>Enter your old public key to get a unique recovery link</p>
          {err && <Alert message={err} type="error" />}
          {generated && (
            <p style={{ textAlign: "center" }}>
              Copy the following link and send it to your guardians for them to
              sign the recovery
            </p>
          )}

          {!generated && (
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
                        if (PublicKey.isOnCurve(value)) {
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
          )}

          {generated && (
            <UrlBox url={`http://localhost:3000/recover/${recoverPK}`}></UrlBox>
          )}
        </>
      )}

      {signed >= recoveryThreshold && recoverPK && (
        <RecoverBox profileInfo={new PublicKey(recoverPK)} />
      )}
    </>
  );
};

export default GenerateRecover;
