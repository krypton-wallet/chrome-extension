import React, { useEffect, useMemo, useState } from "react";
import { NextPage } from "next";
import { Button, Alert, Modal, Form, Input, Radio, Switch } from "antd";
import { useGlobalState } from "../context";
import { UserAddOutlined, EditOutlined } from "@ant-design/icons";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import GuardianBox from "../components/GuardianBox";
import base58 from "bs58";
import { containsPk, getProfilePDA, sendAndConfirmTransactionWithAccount } from "../utils";
import BN from "bn.js";
import { RPC_URL, WALLET_PROGRAM_ID, } from "../utils/constants";
import { split } from "shamirs-secret-sharing-ts";
import { randomBytes } from "crypto";
import * as aesjs from "aes-js";
// import { genShards } from "../utils/stealth";
import { KryptonAccount } from "../types/account";
import { parseDataFromPDA } from "../types/pda";
import * as krypton from "../js/src/generated";

const Guardian: NextPage = () => {
  const { setGuardians, guardians, account, setAccount, network } =
    useGlobalState();
  // const [shards, setShards] = useState<string[]>([]);
  const [loading, setLoading] = useState<number>(0);
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
      const connection = new Connection(RPC_URL(network), "confirmed");
      const publicKey = new PublicKey(account.pk);
      const [profileAddress] = getProfilePDA(publicKey);


      const profileAccount = await connection.getAccountInfo(profileAddress);

      if (profileAccount) {
        const [profile] = krypton.ProfileHeader.fromAccountInfo(profileAccount);

        setThres(profile.recoveryThreshold);
        setGuardians(
          profile.guardians
            .map(g => g.pubkey)
            .filter(g => !g.equals(SystemProgram.programId)));
      }
    };
    getGuardians();
  }, [account, network]);

  const showModal = () => {
    setIsModalOpen(true);
  };

  const onFinish = async (values: any) => {
    if (!account) {
      return;
    }

    console.log("=====ADDING GUARDIAN======");
    console.log("Values received:", values);
    setLoading((prev) => prev + 1);
    form.resetFields();

    // Instr Add
    const publicKey = new PublicKey(account.pk);
    console.log("Adding guardian for account " + publicKey + "...");
    const connection = new Connection(RPC_URL(network), "confirmed");
    const latestBlockhash = await connection.getLatestBlockhash();

    const [profileAddress] = getProfilePDA(publicKey);

    const addGuardianIx = krypton.createAddRecoveryGuardiansInstruction({
      profileInfo: profileAddress,
      authorityInfo: publicKey,
      guardian: new PublicKey(values.guardian),
    }, {
      addRecoveryGuardianArgs: {
        numGuardians: 1 // make sure this isn't overwriting the first guardian
      }
    });

    // TODO: Check if Yubikey is connected
    const tx = new Transaction({
      feePayer: publicKey,
      ...latestBlockhash,
    });
    tx.add(addGuardianIx);

    console.log("processing add guardian");
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


    setLoading((prev) => prev - 1);
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
        {guardians.map((g, idx) => {
          return (
            <GuardianBox
              key={g.toBase58()}
              guardian={g}
              editMode={editmode}
              setDeleteLoading={setLoading}
            />
          );
        })}
      </div>

      {guardians.length < thres && (
        <Alert
          message={`Need ${thres - guardians.length
            } more guardian(s) to activate recovery feature`}
          type="warning"
          style={{ width: "85%", position: "absolute", bottom: "95px" }}
          showIcon
        />
      )}

      <div style={{ display: "flex", position: "absolute", bottom: "90px" }}>
        <Button
          type="primary"
          icon={editmode ? <EditOutlined /> : <UserAddOutlined />}
          onClick={editmode ? () => { console.log("fudding your bags") } : showModal}
          size="middle"
          style={{ width: "168px", marginRight: "20px" }}
          loading={loading != 0}
          disabled={editmode && guardians.length === 0}
        >
          {editmode ? "Regen Shards" : "Add"}
        </Button>
        <Button
          type={editmode ? "primary" : undefined}
          icon={<EditOutlined />}
          onClick={toggleEditmode}
          size="middle"
          style={{ width: "168px" }}
          danger
          className="edit-btn"
          loading={loading != 0}
          disabled={!editmode && guardians.length === 0}
        >
          {editmode ? "Finish" : "Edit"}
        </Button>
      </div>

      <Modal
        title="Add New Guardian"
        open={isModalOpen}
        onOk={form.submit}
        onCancel={handleModalCancel}
        confirmLoading={loading != 0}
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
                      RPC_URL(network),
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
