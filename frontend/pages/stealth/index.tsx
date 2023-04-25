import React, { useEffect, useState } from "react";
import { NextPage } from "next";
import {
  Button,
  Tooltip,
  Typography,
  List,
  Avatar,
  Skeleton,
  Empty,
} from "antd";
import { useRouter } from "next/router";

import { ArrowRightOutlined, EditOutlined, LoadingOutlined, UserAddOutlined } from "@ant-design/icons";
import {
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { useGlobalState } from "../../context";
import { Dashboard } from "../../styles/StyledComponents.styles";
import { Signer, StealthSigner } from "../../types/account";
import { displayAddress, sendAndConfirmTransactionWithAccount } from "../../utils";
import Paragraph from "antd/lib/typography/Paragraph";
import { CJ_ID } from "../../utils/constants";
import BN from "bn.js";
import base58 from "bs58";

const Stealth: NextPage = () => {
  const { network, account, setStealth, setStealthBalance } = useGlobalState();
  const [spinning, setSpinning] = useState<boolean>(true);
  const [joining, setJoining] = useState<boolean>(false);
  const [fromAccs, setFromAccs] = useState<Map<string, number>>(() => new Map<string, number>());
  const [publicScan, setPublicScan] = useState<string>("");
  const [publicSpend, setPublicSpend] = useState<string>("");
  const [stealthAccounts, setStealthAccounts] = useState<
    Array<[string, number | undefined, PublicKey]>
  >([]);
  const router = useRouter();



  function genInitializeInputIx(authorized_buffer_key: PublicKey, feePayer: PublicKey,
    programId: PublicKey, input_acc: string, input_val: Buffer, bufferSeed: Buffer, is_token: boolean, token: string): TransactionInstruction {
    const idx7 = Buffer.from(new Uint8Array([7]));
    let idx = Buffer.from(new Uint8Array([0]));
    if (is_token) idx = Buffer.from(new Uint8Array([1]));
    let initializeInputIx = new TransactionInstruction({
      keys: [
        {
          pubkey: authorized_buffer_key,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: feePayer,
          isSigner: true,
          isWritable: false,
        },
      ],
      programId: programId,
      data: Buffer.concat([idx7, base58.decode(input_acc), input_val, idx, bufferSeed]),
    });
    if (is_token) {
      initializeInputIx.keys.push(
        {
          pubkey: new PublicKey(token),
          isSigner: false,
          isWritable: true,
        },
      );
    }
    return initializeInputIx;
  }

  function genInitializeOutputIx(authorized_buffer_key: PublicKey, feePayer: PublicKey,
    programId: PublicKey, output_acc: string, output_val: Buffer, bufferSeed: Buffer, is_token: boolean, token: string): TransactionInstruction {
    const idx8 = Buffer.from(new Uint8Array([8]));
    let idx = Buffer.from(new Uint8Array([0]));
    if (is_token) idx = Buffer.from(new Uint8Array([1]));
    let initializeOutputIx = new TransactionInstruction({
      keys: [
        {
          pubkey: authorized_buffer_key,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: feePayer,
          isSigner: true,
          isWritable: false,
        },
      ],
      programId: programId,
      data: Buffer.concat([idx8, base58.decode(output_acc), output_val, idx, bufferSeed]),
    });
    if (is_token) {
      initializeOutputIx.keys.push(
        {
          pubkey: new PublicKey(token),
          isSigner: false,
          isWritable: true,
        },
      );
    }
    return initializeOutputIx;
  }

  function genWithdraw1Ix(authorized_buffer_key: PublicKey, senderPk: PublicKey,
    programId: PublicKey, output_acc: PublicKey, output_val: Buffer, bufferSeed: Buffer): TransactionInstruction {
    const idx10 = Buffer.from(new Uint8Array([10]));
    let idx = Buffer.from(new Uint8Array([0]));
    if (output_acc == senderPk) {
      let idx = Buffer.from(new Uint8Array([1]));
    }
    let refund1Ix = new TransactionInstruction({
      keys: [
        {
          pubkey: authorized_buffer_key,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: senderPk,
          isSigner: true,
          isWritable: false,
        },
        {
          pubkey: output_acc,
          isSigner: false,
          isWritable: true,
        },

      ],
      programId: programId,
      data: Buffer.concat([idx10, bufferSeed, idx]),
    });
    return refund1Ix;
  }

  function genDepositIx(authKey: PublicKey, senderPk: PublicKey, amount: Buffer, bufferSeed: Buffer) {
    const idx2 = Buffer.from(new Uint8Array([2]));
    let smartDepositIx = new TransactionInstruction({
      keys: [
        {
          pubkey: authKey,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: senderPk,
          isSigner: true,
          isWritable: true,
        },
        {
          pubkey: SystemProgram.programId,
          isSigner: false,
          isWritable: false,
        },
      ],
      programId: CJ_ID,
      data: Buffer.concat([idx2, amount, bufferSeed]),
      //data: Buffer.concat([idx, price, bufferSeed]),
    });
    return smartDepositIx;
  }

  useEffect(() => {
    console.log("============STEALTH PAGE=================");
    setSpinning(true);

    console.log("acc: ", account);
    if (!account) {
      router.push("/");
      return;
    }

    const getStealthAccounts = async () => {
      const scan = new StealthSigner(account.stealth.priv_scan);
      const scan_key = await scan.getPublicKey();
      setPublicScan(scan_key.toBase58());

      const spend = new StealthSigner(account.stealth.priv_spend);
      const spend_key = await spend.getPublicKey();
      setPublicSpend(spend_key.toBase58());

      if (!account.stealth_accounts || account.stealth_accounts.length <= 0) {
        setStealthAccounts([]);
        setSpinning(false);
        return;
      }

      const connection = new Connection(clusterApiUrl(network), "confirmed");
      const stealth_accs: Array<[string, number | undefined, PublicKey]> = [];
      for (const priv of account.stealth_accounts) {
        const signer = new StealthSigner(priv);
        const pubkey = await signer.getPublicKey();
        let lamps = (await connection.getAccountInfo(pubkey))?.lamports;
        if (lamps) {
          lamps /= LAMPORTS_PER_SOL;
        }
        stealth_accs.push([priv, lamps, pubkey]);
      }

      setStealthAccounts(stealth_accs);
      setSpinning(false);
    };
    getStealthAccounts();
  }, [account, network, router]);

  const handleSendFromStealth = (item: [string, number | undefined, PublicKey]) => {
    setStealth(item[0]);
    setStealthBalance(item[1]);
    router.push("/stealth/fromstealth");
  };

  const handleScan = () => {
    router.push("/stealth/scan");
  };


  const joiningClick = () => {
    console.log("joining");
    if (joining) {
      setFromAccs(new Map<string, number>());
    }
    setJoining(!joining);

  }

  const finishJoin = async () => {


    if (!account) {
      return;
    }

    const idx1 = Buffer.from(new Uint8Array([1]));
    const idx11 = Buffer.from(new Uint8Array([11]));
    const idx4 = Buffer.from(new Uint8Array([4]));

    const in_accs_len8 = Buffer.from(new Uint8Array((new BN(fromAccs.size)).toArray("le", 8)));
    const out_accs_len8 = Buffer.from(new Uint8Array((new BN(1)).toArray("le", 8)));
    const connection = new Connection(clusterApiUrl(network), "confirmed");
    let totalAmt = 0;
    //stealthAccounts.filter((acc) => fromAccs.has(acc[0])).forEach((acc) => totalAmt += acc[1]!);
    const bufferSeed = Buffer.from(new Uint8Array((new BN("25516")).toArray("le", 8))); //change this michael
    //const amount = Number(values.amount) * LAMPORTS_PER_SOL;
    const feePayer = await account.getPublicKey();

    const authorized_buffer_key = PublicKey.findProgramAddressSync(
      [
        Buffer.from("authority", "utf-8"),
        CJ_ID.toBuffer(),
        bufferSeed],
      CJ_ID)[0];

    let initializeSmartSendIx = new TransactionInstruction({
      keys: [
        {
          pubkey: authorized_buffer_key,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: feePayer,
          isSigner: true,
          isWritable: false,
        },
        {
          pubkey: SystemProgram.programId,
          isSigner: false,
          isWritable: false,
        },
      ],
      programId: CJ_ID,
      data: Buffer.concat([idx4, in_accs_len8, out_accs_len8, bufferSeed]),
    });

    let debugIx = new TransactionInstruction({
      keys: [
        {
          pubkey: authorized_buffer_key,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: feePayer,
          isSigner: true,
          isWritable: false,
        },
      ],
      programId: CJ_ID,
      data: Buffer.concat([idx11, bufferSeed]),
    });

    let setupTx = new Transaction();
    setupTx.add(initializeSmartSendIx);

    await fromAccs.forEach(async (num, key) => {
      const sig = new StealthSigner(key);
      console.log(num);
      setupTx.add(
        genInitializeInputIx(authorized_buffer_key, feePayer, CJ_ID,
          (await sig.getPublicKey()).toBase58(), Buffer.from(new Uint8Array((new BN(num)).toArray("le", 8))), bufferSeed, false, "")
      );
      totalAmt += num;
    });

    setupTx.add(
      genInitializeOutputIx(authorized_buffer_key, feePayer, CJ_ID,
        account.pda, Buffer.from(new Uint8Array((new BN(totalAmt)).toArray("le", 8))), bufferSeed, false, "")
    );
    console.log("account.pda: ", account.pda);
    setupTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    setupTx.feePayer = feePayer;
    console.log("constructed initialization transaction");
    let txid = await sendAndConfirmTransactionWithAccount(
      connection,
      setupTx,
      [account],
      {
        skipPreflight: true,
        preflightCommitment: "confirmed",
      }
    );

    console.log("finished setup");
    await new Promise(f => setTimeout(f, 2000));
    console.log("starting deposits");

    let depositTx = new Transaction();
    depositTx.add(debugIx);

    await fromAccs.forEach(async (num, key) => {
      const sig = new StealthSigner(key);
      let sigPk = await sig.getPublicKey();
      depositTx.add(genDepositIx(authorized_buffer_key, sigPk, Buffer.from(new Uint8Array((new BN(num)).toArray("le", 8))), bufferSeed));
    });

    depositTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    depositTx.feePayer = feePayer;
    let signers: Signer[] = [account];
    await fromAccs.forEach((num, key) => {
      const sig = new StealthSigner(key);
      signers.push(sig);
    });

    let txid2 = await sendAndConfirmTransactionWithAccount(
      connection,
      depositTx,
      signers,
      {
        skipPreflight: true,
        preflightCommitment: "confirmed",
      }
    );

    console.log("deposit result: ", txid2);
    await new Promise(f => setTimeout(f, 2000));
    console.log("starting withdraw + close");

    let withdrawAndCloseTx = new Transaction();

    withdrawAndCloseTx.add(
      genWithdraw1Ix(authorized_buffer_key, feePayer, CJ_ID,
        new PublicKey(account.pda), Buffer.from(new Uint8Array((new BN(totalAmt)).toArray("le", 8))), bufferSeed)
    );

    let closeIx = new TransactionInstruction({
      keys: [
        {
          pubkey: authorized_buffer_key,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: feePayer,
          isSigner: true,
          isWritable: false,
        },
        {
          pubkey: SystemProgram.programId,
          isSigner: false,
          isWritable: false,
        },
      ],
      programId: CJ_ID,
      data: Buffer.concat([idx1,bufferSeed]),
    });

      withdrawAndCloseTx.add(closeIx);
      withdrawAndCloseTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      withdrawAndCloseTx.feePayer = feePayer;

      let txid3 = await sendAndConfirmTransactionWithAccount(
        connection,
        withdrawAndCloseTx,
        [account],
        {
          skipPreflight: true,
          preflightCommitment: "confirmed",
        }
      );
      console.log("final result: ", txid3);


      console.log("cleaning up");

      await chrome.storage.local
      .get(["currId", "accounts", "y_accounts", "mode", "y_id"])
      .then(async (result) => {
        const id = result["mode"] === 0 ? result["currId"] : result["y_id"];
        const old =
          result["mode"] === 0
            ? JSON.parse(result["accounts"])
            : JSON.parse(result["y_accounts"]);
        let stealth_accs: string[] = [];
        if (account.stealth_accounts && account.stealth_accounts.length > 0) {
          stealth_accs = account.stealth_accounts.filter((acc)=>{!fromAccs.has(acc)});
        }
        const { stealth_accounts: _, ...rest } = old[id];
        old[id] = {
          stealth_accounts: stealth_accs,
          ...rest,
        };
        const accs = JSON.stringify(old);

        if (result["mode"] === 0) {
          chrome.storage.local.set({
            accounts: accs,
          });
        } else if (result["mode"] === 1) {
          chrome.storage.local.set({
            y_accounts: accs,
          });
        }
      });

    console.log("You did it! :)");
    
  }

  const addInput = ([key, amount, pubkey]: [string, number | undefined, PublicKey]) => {
    if (!amount) {
      return;
    }

    console.log("amt: ",amount);
    setFromAccs((prev) => prev.delete(key) ? new Map(prev) : new Map(prev.set(key, amount * LAMPORTS_PER_SOL)));


    console.log("possibly same inputs: ", fromAccs);
  }

  const handleAddAccount = () => {
    router.push("/stealth/addstealth");
  };
  console.log("len", fromAccs.size);
  return (
    <>
      {account && (
        <Dashboard>
          <h1 style={{ marginBottom: 0, color: "#fff" }}>Stealth</h1>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "50%",
            }}
          >
            <p
              style={{ color: "#bababa", margin: "0" }}
            >{`Public scan key: `}</p>
            <Paragraph
              copyable={{ text: publicScan, tooltips: `Copy` }}
              style={{ margin: 0, color: "#fff" }}
            >
              {`${displayAddress(publicScan)}`}
            </Paragraph>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "50%",
            }}
          >
            <p
              style={{ color: "#bababa", margin: "0" }}
            >{`Public spend key: `}</p>
            <Paragraph
              copyable={{ text: publicSpend, tooltips: `Copy` }}
              style={{ margin: 0, color: "#fff" }}
            >
              {`${displayAddress(publicSpend)}`}
            </Paragraph>
          </div>
          <div
            style={{
              display: "flex",
              columnGap: "10px",
              justifyContent: "space-between",
              marginTop: "15px",
              marginBottom: "10px",
            }}
          >
            <Button
              type="primary"
              shape="default"
              onClick={handleAddAccount}
              style={{ width: "140px", height: "40px", fontSize: "17px" }}
            >
              Add Account
            </Button>
            <Tooltip
              title="Click to receive 1 devnet SOL into your account"
              placement="right"
            ></Tooltip>
            <Button
              type="primary"
              shape="default"
              style={{ width: "140px", height: "40px", fontSize: "17px" }}
              onClick={handleScan}
            >
              Scan
            </Button>
          </div>

          <div
            style={{
              marginLeft: "30px",
              marginRight: "30px",
              marginTop: "23px",
              width: "77%",
              padding: "0.2rem 0.7rem",
              backgroundColor: "rgb(42, 42, 42)",
              overflowY: "auto",
              maxHeight: "275px",
            }}
          >
            <List
              dataSource={stealthAccounts}
              locale={{
                emptyText: spinning ? <Skeleton active={true} /> : <Empty />,
              }}
              renderItem={(item) => (
                <List.Item
                  key={item[0]}
                  onClick={() => {
                    joining ? addInput(item) :
                      handleSendFromStealth(item);
                  }}
                >
                  <List.Item.Meta
                    avatar={<Avatar src={"/static/images/solana.png"} />}
                    title={displayAddress(item[2].toBase58())}
                    description={`${item[1] ? item[1] : "-"} SOL`}
                    style={{ backgroundColor: fromAccs.has(item[0]) ? "blue" : "black" }}
                  />
                </List.Item>
              )}
            />
          </div>
          <div style={{ display: "flex", bottom: "90px" }}>
            <Button
              type="primary"
              icon={joining ? <EditOutlined /> : <UserAddOutlined />}
              onClick={joiningClick}
              //hidden= {!joining}
              size="middle"
              style={{ width: "168px", marginRight: "20px" }}

            >
              {joining ? "Cancel" : "Add"}
            </Button>
            <Button
              type={joining ? "primary" : undefined}
              icon={<EditOutlined />}
              onClick={!joining ? joiningClick : finishJoin}
              size="middle"
              style={{ width: "168px" }}
              danger
              className="edit-btn"
              //loading={loading != 0}
              disabled={joining && fromAccs.size === 0}
            >
              {joining ? "Finish" : "Join"}
            </Button>
          </div>
        </Dashboard>
      )}
    </>
  );
};

export default Stealth;
