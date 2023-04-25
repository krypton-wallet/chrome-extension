import { ArrowLeftOutlined } from "@ant-design/icons";
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createCloseAccountInstruction,
  getAccount,
  getAssociatedTokenAddress,
  getMint
} from "@solana/spl-token";
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { Button, Form, Input, Result, Switch } from "antd";
import BN from "bn.js";
import { NextPage } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { stealthTokenTransferTransaction } from "solana-stealth";
import styles from "../../../components/Layout/index.module.css";
import { useGlobalState } from "../../../context";
import { StyledForm } from "../../../styles/StyledComponents.styles";
import {
  displayAddress,
  isNumber,
  sendAndConfirmTransactionWithAccount,
} from "../../../utils";
import { RPC_URL, WALLET_PROGRAM_ID } from "../../../utils/constants";

const Send: NextPage = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [decimals, setDecimals] = useState<number>(1);
  const { account, network } = useGlobalState();
  const [finished, setFinished] = useState<boolean>(false);
  const [stealthMode, setStealthMode] = useState<boolean>(false);

  const [form] = Form.useForm();

  const router = useRouter();
  let { pk } = router.query;
  if (Array.isArray(pk)) {
    pk = pk[0];
  }

  const connection = useMemo(
    () => new Connection(RPC_URL(network), "confirmed"),
    [network]
  );
  const mint_pk = useMemo(
    () => (pk ? new PublicKey(pk) : PublicKey.default),
    [pk]
  );

  useEffect(() => {
    if (!account) {
      return;
    }
    const getTokenAccountBalance = async () => {
      console.log("Getting src token account...");
      const srcAssociatedToken = await getAssociatedTokenAddress(
        mint_pk,
        new PublicKey(account.pda) ?? PublicKey.default,
        true,
        TOKEN_PROGRAM_ID
      );
      const srcTokenAccount = await getAccount(
        connection,
        srcAssociatedToken,
        "confirmed",
        TOKEN_PROGRAM_ID
      );
      console.log(`Src Token Account: ${srcTokenAccount.address.toBase58()}`);

      const tokenAccountData = await getAccount(
        connection,
        srcTokenAccount.address
      );
      const balance = Number(tokenAccountData.amount);
      const mintData = await getMint(connection, mint_pk);
      const decimals = Number(mintData.decimals);
      setTokenBalance(balance);
      setDecimals(decimals);
    };
    getTokenAccountBalance();
  }, [connection, mint_pk, account, network, pk]);

  const handleCancel = () => {
    router.push({
      pathname: "/token/[pk]",
      query: { pk: pk },
    });
  };

  const handleOk = async (values: any) => {
    console.log("ok", account);
    if (!account) {
      return;
    }
    setLoading(true);
    console.log(values);
    console.log(account);

    let dest_pda: PublicKey;
    let associatedToken: PublicKey;
    let notifyTx: Transaction;
    let closeIx: TransactionInstruction;
    let closingAccount: PublicKey;
    const feePayerPk = new PublicKey(account.pk);
    if (stealthMode) {
      console.log("getting associated");
      closingAccount = await getAssociatedTokenAddress(mint_pk, feePayerPk);
      let temp = await getAssociatedTokenAddress(
        mint_pk,
        new PublicKey(account.pda),
        true
      );
      console.log("closing: ", closingAccount.toBase58());
      console.log("not closing: ", temp.toBase58());

      const notifyinfo = await connection.getAccountInfo(closingAccount);
      console.log(notifyinfo);
      closeIx = createCloseAccountInstruction(
        closingAccount,
        feePayerPk,
        feePayerPk
      );

      if (!notifyinfo) {
        console.log("got associated: ", closingAccount.toBase58());

        console.log("Creating token account for notify...");

        const recentBlockhash = await connection.getLatestBlockhash();
        // TODO: Check if Yubikey is connected
        const createTA_tx = new Transaction({
          feePayer: feePayerPk,
          ...recentBlockhash,
        });

        createTA_tx.add(
          createAssociatedTokenAccountInstruction(
            feePayerPk,
            closingAccount,
            feePayerPk,
            mint_pk,
            TOKEN_PROGRAM_ID
          )
        );

        await sendAndConfirmTransactionWithAccount(
          connection,
          createTA_tx,
          [account],
          {
            skipPreflight: true,
            preflightCommitment: "confirmed",
            commitment: "confirmed",
          }
        );

        console.log("created?");
      }

      notifyTx = await stealthTokenTransferTransaction(
        feePayerPk,
        mint_pk,
        values.scankey,
        values.spendkey,
        0
      );
      for (let i = 0; i < notifyTx.instructions.length; i++) {
        for (let j = 0; j < notifyTx.instructions[i].keys.length; j++) {
          console.log("i ", i);
          console.log("j ", j);
          console.log(
            "key at i,j ",
            notifyTx.instructions[i].keys[j].pubkey.toBase58()
          );
        }
      }
      dest_pda = notifyTx.instructions[1].keys[1].pubkey;
      console.log("dest pda: ", dest_pda.toBase58());

      const block = await connection.getLatestBlockhash();
      notifyTx.recentBlockhash = block.blockhash;
      notifyTx.lastValidBlockHeight = block.lastValidBlockHeight;
      notifyTx.feePayer = feePayerPk;
      console.log("sending notify");
      let res = await sendAndConfirmTransactionWithAccount(
        connection,
        notifyTx,
        [account]
      );
      console.log(res);
      console.log("done notify");
    } else {
      dest_pda = new PublicKey(values.pk);
      console.log("Getting dest associated token address...");
    }
    console.log("getting associated");
    associatedToken = await getAssociatedTokenAddress(
      mint_pk,
      dest_pda,
      true,
      TOKEN_PROGRAM_ID
    );
    console.log("got associated: ", associatedToken.toBase58());

    const amount = Number(values.amount) * Math.pow(10, decimals);

    console.log("Getting src token account...");
    const srcAssociatedToken = await getAssociatedTokenAddress(
      mint_pk,
      new PublicKey(account.pda) ?? PublicKey.default,
      true,
      TOKEN_PROGRAM_ID
    );
    const srcTokenAccount = await getAccount(
      connection,
      srcAssociatedToken,
      "confirmed",
      TOKEN_PROGRAM_ID
    );
    console.log(`Src Token Account: ${srcTokenAccount.address.toBase58()}`);

    const destTAInfo = await connection.getAccountInfo(associatedToken);
    console.log(destTAInfo);
    if (!destTAInfo) {
      console.log("Creating token account for mint...");

      const recentBlockhash = await connection.getLatestBlockhash();
      // TODO: Check if Yubikey is connected
      const createTA_tx = new Transaction({
        feePayer: feePayerPk,
        ...recentBlockhash,
      });
      createTA_tx.add(
        createAssociatedTokenAccountInstruction(
          feePayerPk,
          associatedToken,
          dest_pda,
          mint_pk,
          TOKEN_PROGRAM_ID
        )
      );

      await sendAndConfirmTransactionWithAccount(
        connection,
        createTA_tx,
        [account],
        {
          skipPreflight: true,
          preflightCommitment: "confirmed",
          commitment: "confirmed",
        }
      );
    }

    console.log("Getting dest token account...");
    const destTokenAccount = await getAccount(
      connection,
      associatedToken,
      "confirmed",
      TOKEN_PROGRAM_ID
    );
    console.log(`New Token Account: ${destTokenAccount.address.toBase58()}`);

    /* TRANSACTION: Transfer Token */
    const recentBlockhash = await connection.getLatestBlockhash();
    // TODO: Check if Yubikey is connected
    const transferTokenTx = new Transaction({
      feePayer: feePayerPk,
      ...recentBlockhash,
    });
    const idx2 = Buffer.from(new Uint8Array([6]));
    const amountBuf = Buffer.from(
      new Uint8Array(new BN(Number(amount)).toArray("le", 8))
    );
    const recoveryModeBuf = Buffer.from(new Uint8Array([0]));
    const transferAndCloseIx = new TransactionInstruction({
      keys: [
        {
          pubkey: new PublicKey(account.pda) ?? PublicKey.default,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: feePayerPk,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: feePayerPk,
          isSigner: true,
          isWritable: true,
        },
        {
          pubkey: srcTokenAccount.address,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: destTokenAccount.address,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: TOKEN_PROGRAM_ID,
          isSigner: false,
          isWritable: false,
        },
      ],
      programId: WALLET_PROGRAM_ID,
      data: Buffer.concat([idx2, amountBuf, recoveryModeBuf]),
    });

    transferTokenTx.add(transferAndCloseIx);
    if (stealthMode) {
      //transferTokenTx.add(notifyIx!); //broken :(
      let smth = await getAccount(connection, closingAccount!);
      console.log("closing account: ", smth);
      console.log("closing account: ", smth.address);
      console.log("closing account: ", smth.address.toBase58());
      console.log("********with amount: ", smth.amount);
      smth;
      //transferTokenTx.add(closeIx!);
    }

    console.log("Transfering token...");
    const txid = await sendAndConfirmTransactionWithAccount(
      connection,
      transferTokenTx,
      [account],
      {
        skipPreflight: true,
        preflightCommitment: "confirmed",
        commitment: "confirmed",
      }
    );
    console.log(`https://explorer.solana.com/tx/${txid}?cluster=${network}\n`);

    if (stealthMode) {
      const closeTx = new Transaction({
        feePayer: feePayerPk,
        ...recentBlockhash,
      });
      closeTx.add(closeIx!);

      console.log("Transfering token...");
      const txid = await sendAndConfirmTransactionWithAccount(
        connection,
        closeTx,
        [account],
        {
          skipPreflight: true,
          preflightCommitment: "confirmed",
          commitment: "confirmed",
        }
      );
      console.log(
        `https://explorer.solana.com/tx/${txid}?cluster=${network}\n`
      );
    }

    setLoading(false);
    setFinished(true);
  };

  return (
    <>
      <h1 className={"title"}>Send Token</h1>
      <h2 style={{ color: "white" }}>{displayAddress(pk ?? "")}</h2>

      {!finished && (
        <StyledForm
          form={form}
          layout="vertical"
          requiredMark={false}
          onFinish={handleOk}
        >
          <div style={{ display: "flex", justifyContent: "center" }}>
            <p style={{ marginRight: "10px" }}>Stealth Mode: </p>
            <Switch
              checkedChildren="on"
              unCheckedChildren="off"
              checked={stealthMode}
              onChange={() => setStealthMode((prev) => !prev)}
            />
          </div>
          {!stealthMode && (
            <Form.Item
              name="pk"
              rules={[
                {
                  required: true,
                  message: "Please enter the recipient's address",
                },
                {
                  async validator(_, value) {
                    const pdaInfo = await connection.getAccountInfo(
                      new PublicKey(value)
                    );
                    if (pdaInfo) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error("Invalid public key"));
                  },
                },
              ]}
            >
              <Input
                placeholder="Recipient's Address"
                style={{
                  minWidth: "300px",
                  backgroundColor: "rgb(34, 34, 34)",
                  color: "#d3d3d3",
                  border: "1px solid #d3d3d3",
                }}
              />
            </Form.Item>
          )}
          {stealthMode && (
            <Form.Item
              name="scankey"
              rules={[
                {
                  required: true,
                  message: "Please enter the recipient's scan key",
                },
                {
                  async validator(_, value) {
                    const pdaInfo = new PublicKey(value);
                    if (pdaInfo) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error("Invalid public key"));
                  },
                },
              ]}
            >
              <Input
                placeholder="Recipient's Scan Key"
                style={{
                  minWidth: "300px",
                  backgroundColor: "rgb(34, 34, 34)",
                  color: "#d3d3d3",
                  border: "1px solid #d3d3d3",
                }}
              />
            </Form.Item>
          )}
          {stealthMode && (
            <Form.Item
              name="spendkey"
              rules={[
                {
                  required: true,
                  message: "Please enter the recipient's spend key",
                },
                {
                  async validator(_, value) {
                    const pdaInfo = new PublicKey(value);
                    if (pdaInfo) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error("Invalid public key"));
                  },
                },
              ]}
            >
              <Input
                placeholder="Recipient's Spend Key"
                style={{
                  minWidth: "300px",
                  backgroundColor: "rgb(34, 34, 34)",
                  color: "#d3d3d3",
                  border: "1px solid #d3d3d3",
                }}
              />
            </Form.Item>
          )}

          <Form.Item
            name="amount"
            rules={[
              {
                required: true,
                message: "Please enter amount of tokens",
              },
              {
                async validator(_, value) {
                  if (!isNumber(value)) {
                    return Promise.reject(new Error("Not a number"));
                  } else if (Number(value) <= 0) {
                    return Promise.reject(new Error("Amount must be positive"));
                  } else if (
                    Number(value) >
                    tokenBalance / Math.pow(10, decimals)
                  ) {
                    return Promise.reject(
                      new Error("Cannot transfer more than balance")
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input
              placeholder="Amount"
              style={{
                width: "300px",
                backgroundColor: "rgb(34, 34, 34)",
                color: "#d3d3d3",
                border: "1px solid #d3d3d3",
              }}
            />
          </Form.Item>
          <span
            style={{
              opacity: "60%",
              color: "white",
              marginTop: "2px",
              alignSelf: "flex-end",
            }}
          >
            balance: {tokenBalance / Math.pow(10, decimals)}
          </span>
          <div
            style={{
              display: "flex",
              columnGap: "20px",
              justifyContent: "space-between",
              marginTop: "1px",
              marginBottom: "10px",
              alignItems: "flex-end",
            }}
          >
            <Button
              type="default"
              shape="default"
              style={{ width: "140px", height: "40px", fontSize: "17px" }}
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Form.Item shouldUpdate className="submit">
              {() => (
                <Button
                  htmlType="submit"
                  type="primary"
                  loading={loading}
                  style={{ width: "140px", height: "40px", fontSize: "17px" }}
                >
                  Send
                </Button>
              )}
            </Form.Item>
          </div>
        </StyledForm>
      )}
      {finished && (
        <>
          <Result status="success" title="Sent!" />
          <Link href="/wallet" passHref>
            <a className={styles.back}>
              <ArrowLeftOutlined /> Back Home
            </a>
          </Link>
        </>
      )}
    </>
  );
};

export default Send;
