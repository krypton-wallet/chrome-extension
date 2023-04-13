import React, { useEffect, useMemo, useState } from "react";
import { NextPage } from "next";
import { Button, Alert, Modal, Form, Input, Radio, Switch } from "antd";
import { useGlobalState } from "../context";
import { UserAddOutlined, EditOutlined } from "@ant-design/icons";
import {
  clusterApiUrl,
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import GuardianBox from "../components/GuardianBox";
import base58 from "bs58";
import { containsPk, sendAndConfirmTransactionWithAccount } from "../utils";
import BN from "bn.js";
import {
  MAX_GUARDIANS,
  WALLET_PROGRAM_ID,
  guardShardMap,
} from "../utils/constants";
import { split } from "shamirs-secret-sharing-ts";
import { randomBytes } from "crypto";
import * as aesjs from "aes-js";

const Guardian: NextPage = () => {
  const { setGuardians, guardians, account, setAccount, network } =
    useGlobalState();
  const [shards, setShards] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isPkValid, setIsPkValid] = useState<boolean>(false);
  const [editmode, setEditmode] = useState<boolean>(false);
  const [thres, setThres] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  const defaultpk = PublicKey.default;

  useEffect(() => {
    // Fetching all guardians from PDA
    const getGuardians = async () => {
      if (!account) {
        return;
      }

      const connection = new Connection(clusterApiUrl(network), "confirmed");
      const publicKey = new PublicKey(account.pk);
      console.log("account pk: ", publicKey.toBase58());
      console.log("PDA: ", account.pda);
      const pda_account = await connection.getAccountInfo(
        new PublicKey(account.pda) ?? PublicKey.default
      );
      const pda_data = pda_account?.data ?? Buffer.from("");
      const threshold = new BN(pda_data.subarray(0, 1), "le").toNumber();
      const guardian_len = new BN(pda_data.subarray(1, 5), "le").toNumber();
      console.log("threshold: ", threshold);
      console.log("guardian length: ", guardian_len);
      console.log("All Guardians:");

      // generate shards from encryption key
      const { shards } = account.stealth;
      setShards(shards);

      const guardians_tmp: PublicKey[] = [];
      for (let i = 0; i < guardian_len; i++) {
        const guard = new PublicKey(
          base58.encode(pda_data.subarray(5 + 32 * i, 5 + 32 * (i + 1)))
        );
        const shard_idx = pda_data
          .subarray(5 + 32 * guardian_len + 4 + i)
          .readUInt8();
        console.log(`guard ${i + 1}: `, guard.toBase58());
        console.log(`shard ${i + 1}: `, shard_idx);
        guardians_tmp.push(guard);
        guardShardMap.set(shard_idx, guard);
      }
      setThres(threshold);
      setGuardians(guardians_tmp);
    };
    getGuardians();
  }, [account, network, setGuardians, setShards]);

  const showModal = () => {
    setIsModalOpen(true);
  };

  const onFinish = async (values: any) => {
    if (!account) {
      return;
    }

    console.log("=====ADDING GUARDIAN======");
    console.log("Values received:", values);
    setLoading(true);
    form.resetFields();

    let shard_idx = 11;

    for (let i = 0; i < shards.length; ++i) {
      if (!guardShardMap.has(i)) {
        shard_idx = i;
        break;
      }
    }

    // Instr Add
    const publicKey = new PublicKey(account.pk);
    console.log("Adding guardian for account " + publicKey + "...");
    const connection = new Connection(clusterApiUrl(network), "confirmed");
    const idx1 = Buffer.from(new Uint8Array([1]));
    const idx_shard = Buffer.from(new Uint8Array([shard_idx]));
    const len = Buffer.from(new Uint8Array(new BN(1).toArray("le", 4)));
    const new_acct_len = Buffer.from(
      new Uint8Array(new BN(1).toArray("le", 1))
    );
    const latestBlockhash = await connection.getLatestBlockhash();

    const addToRecoveryListIx = new TransactionInstruction({
      keys: [
        {
          pubkey: new PublicKey(account.pda) ?? defaultpk,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: publicKey,
          isSigner: true,
          isWritable: true,
        },
        {
          pubkey: new PublicKey(values.guardian),
          isSigner: false,
          isWritable: false,
        },
      ],
      programId: WALLET_PROGRAM_ID,
      data: Buffer.concat([idx1, new_acct_len, len, idx_shard]),
    });

    // TODO: Check if Yubikey is connected
    const tx = new Transaction({
      feePayer: publicKey,
      ...latestBlockhash,
    });
    tx.add(addToRecoveryListIx);

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

    // set new shard idx
    if (shard_idx != 11) {
      guardShardMap.set(shard_idx, new PublicKey(values.guardian));
    } else {
      console.log("something went wrong, shard_idx = 11");
    }

    setLoading(false);
    setIsModalOpen(false);
    setGuardians((prev) => [...prev, new PublicKey(values.guardian)]);
    form.resetFields();
  };

  const handleModalCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
  };

  const toggleEditmode = () => {
    setEditmode(!editmode);
  };
  const regenShards = async () => {
    if (!account) {
      return;
    }
    console.log("regenning boys");
    const encryption_key = randomBytes(16);
    const aesCtr = new aesjs.ModeOfOperation.ctr(encryption_key);
    const encrypted = aesCtr.encrypt(base58.decode(account.stealth.priv_scan));
    const encrypted2 = aesCtr.encrypt(
      base58.decode(account.stealth.priv_spend)
    );

    const messageLen = Buffer.from(
      new Uint8Array(new BN(encrypted.length).toArray("le", 4))
    );
    console.log("message len: ", messageLen);
    console.log("message: ", encrypted);
    const message3 = encrypted;
    const messageLen2 = Buffer.from(
      new Uint8Array(new BN(encrypted2.length).toArray("le", 4))
    );
    console.log("message len2: ", messageLen2);
    console.log("message: ", encrypted2);
    const message2 = encrypted2;

    const publicKey = new PublicKey(account.pk);
    console.log("Adding guardian for account " + publicKey + "...");
    const connection = new Connection(clusterApiUrl(network), "confirmed");
    const latestBlockhash = await connection.getLatestBlockhash();
    const idx8 = Buffer.from(new Uint8Array([8]));
    const updateSecretsIx = new TransactionInstruction({
      keys: [
        {
          pubkey: new PublicKey(account.pda) ?? defaultpk,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: publicKey,
          isSigner: true,
          isWritable: true,
        },
      ],
      programId: WALLET_PROGRAM_ID,
      data: Buffer.concat([idx8, messageLen, message3, messageLen2, message2]),
    });
    console.log("Regenerating shards...");

    const tx = new Transaction({
      feePayer: publicKey,
      ...latestBlockhash,
    });
    tx.add(updateSecretsIx);

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

    console.log("updating internal shard representation");
    const pda_account = await connection.getAccountInfo(
      new PublicKey(account.pda) ?? PublicKey.default
    );
    const pda_data = pda_account?.data ?? Buffer.from("");
    const threshold = new BN(pda_data.subarray(0, 1), "le").toNumber();
    const shares = split(encryption_key, { shares: MAX_GUARDIANS, threshold });
    const shards = shares.map((share) => base58.encode(share));
    await chrome.storage.local
      .get(["currId", "accounts", "y_accounts", "mode", "y_id"])
      .then(async (result) => {
        const id = result["mode"] === 0 ? result["currId"] : result["y_id"];
        const old =
          result["mode"] === 0
            ? JSON.parse(result["accounts"])
            : JSON.parse(result["y_accounts"]);
        const { shards: _, ...rest } = old[id];
        old[id] = {
          shards,
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
    const prevAccount = account;
    prevAccount.stealth.shards = shards;
    setAccount(prevAccount);
    setShards(shards);
  };

  return (
    <>
      <h1 className={"title"} style={{ marginBottom: "10px" }}>
        Guardians
      </h1>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <p style={{ marginRight: "10px" }}>Guardian Protection: </p>
        <Switch
          checkedChildren="on"
          unCheckedChildren="off"
          disabled={true}
          checked={guardians.length >= thres}
        />
      </div>

      <div style={{ overflow: "auto", height: "250px" }}>
        {[...guardShardMap].map(([idx, g]) => {
          return (
            <GuardianBox
              key={g.toBase58()}
              guardian={g}
              shard={shards[idx]}
              shardIdx={idx}
              editMode={editmode}
            />
          );
        })}
      </div>

      {guardians.length < thres && (
        <Alert
          message={`Need ${
            thres - guardians.length
          } more guardian(s) to activate recovery feature`}
          type="warning"
          style={{ width: "85%", position: "absolute", bottom: "95px" }}
          showIcon
        />
      )}

      <div style={{ display: "flex", position: "absolute", bottom: "90px" }}>
        <Button
          type="primary"
          icon={<UserAddOutlined />}
          onClick={showModal}
          size="middle"
          style={{ width: "168px", marginRight: "20px" }}
        >
          Add
        </Button>
        <Button
          type={editmode ? "primary" : undefined}
          icon={<EditOutlined />}
          onClick={toggleEditmode}
          size="middle"
          style={{ width: "168px" }}
          danger
          className="edit-btn"
        >
          {editmode ? "Finish" : "Edit"}
        </Button>
        <Button
          type={editmode ? "primary" : undefined}
          icon={<EditOutlined />}
          onClick={regenShards}
          size="middle"
          style={{ width: "168px" }}
        >
          {"Regen Shards"}
        </Button>
      </div>

      <Modal
        title="Add New Guardian"
        open={isModalOpen}
        onOk={form.submit}
        onCancel={handleModalCancel}
        confirmLoading={loading}
        okButtonProps={{ disabled: !isPkValid }}
      >
        {!loading && (
          <Form
            form={form}
            layout="vertical"
            name="form_in_modal"
            initialValues={{ modifier: "ff" }}
            onFinish={onFinish}
          >
            <Form.Item
              name="guardian"
              label="Guardian Public Key"
              rules={[
                {
                  async validator(_, value) {
                    if (containsPk(value, guardians)) {
                      setIsPkValid(false);
                      return Promise.reject(
                        new Error("Duplicate guardian key")
                      );
                    }

                    const connection = new Connection(
                      clusterApiUrl(network),
                      "confirmed"
                    );
                    const pda_account = await connection.getAccountInfo(
                      new PublicKey(value)
                    );
                    console.log("checking if PDA is valid: ", pda_account);
                    if (PublicKey.isOnCurve(value) || pda_account != null) {
                      setIsPkValid(true);
                      return Promise.resolve();
                    }
                    setIsPkValid(false);
                    return Promise.reject(new Error("Invalid public key"));
                  },
                },
              ]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="modifier"
              className="collection-create-form_last-form-item"
            >
              <Radio.Group>
                <Radio value="ff">Friend / Family</Radio>
                <Radio value="hardware">Hardware</Radio>
              </Radio.Group>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </>
  );
};

export default Guardian;
