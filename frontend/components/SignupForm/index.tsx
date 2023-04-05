import { Button, Checkbox, Form, Select, Tooltip } from "antd";
import { useRouter } from "next/router";
import { ReactNode, useState } from "react";
import { ArrowLeftOutlined } from "@ant-design/icons";
import styles from "../Layout/index.module.css";

import Link from "next/link";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import BN from "bn.js";
import { KeypairSigner, Signer } from "../../types/account";
import { generateAvatar, getAvatar } from "../../utils/avatar";
import { useGlobalState } from "../../context";
import { StyledForm } from "../../styles/StyledComponents.styles";
import {
  sendAndConfirmTransactionWithAccount,
  refreshBalance,
} from "../../utils";
import OnboardingSteps from "../OnboardingSteps";
import {
  REFILL_TO_BALANCE,
  TEST_INITIAL_BALANCE_FAILURE,
} from "../../utils/constants";
import {
  createMint,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAccount,
  mintTo,
  setAuthority,
  AuthorityType,
} from "@solana/spl-token";

const SignupForm = ({
  feePayer,
  handleStorage,
  children,
}: {
  feePayer: Signer;
  handleStorage: (feePayerPK: string, pda: string, avatarPK?: string) => void;
  children: ReactNode;
}) => {
  const {
    walletProgramId,
    network,
    setBalance,
    setAccount,
    setPDA,
    setAvatar,
  } = useGlobalState();
  const [loading, setLoading] = useState<boolean>(false);
  const [currStep, setCurrStep] = useState(0);
  const [genStep, setGenStep] = useState(-1);

  const router = useRouter();
  const [form] = Form.useForm();
  form.setFieldsValue({ thres: "2" });

  const handleChange = (value: string) => {
    form.setFieldsValue({ thres: value });
  };

  const handleCheckboxChange = (e: { target: { checked: boolean } }) => {
    setGenStep(e.target.checked ? 0 : -1);
  };

  const handleOk = async (values: any) => {
    setLoading(true);
    console.log("=====STARTING SIGNING UP======");
    const keypairFeePayer = (feePayer as KeypairSigner).keypair;
    const feePayerPK = await feePayer.getPublicKey();
    const profile_pda = PublicKey.findProgramAddressSync(
      [Buffer.from("profile", "utf-8"), feePayerPK.toBuffer()],
      walletProgramId
    );
    const thres = Number(values.thres);
    console.log("input thres: ", thres);
    setAccount(feePayer);
    setPDA(profile_pda[0]);

    const connection = new Connection("https://api.devnet.solana.com/");

    console.log("pk: ", feePayerPK.toBase58());
    console.log("PDA: ", profile_pda[0].toBase58());
    console.log("program id: ", walletProgramId.toBase58());

    console.log("Requesting Airdrop of 0.2 SOL...");
    const signature = await connection.requestAirdrop(
      feePayerPK,
      REFILL_TO_BALANCE
    );
    await connection.confirmTransaction(signature, "finalized");
    console.log("Airdrop received");

    // instr 1: initialize social recovery wallet
    const idx = Buffer.from(new Uint8Array([0]));
    const acct_len = Buffer.from(new Uint8Array(new BN(0).toArray("le", 1)));
    const recovery_threshold = Buffer.from(
      new Uint8Array(new BN(thres).toArray("le", 1))
    );

    const initializeSocialWalletIx = new TransactionInstruction({
      keys: [
        {
          pubkey: profile_pda[0],
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: feePayerPK,
          isSigner: true,
          isWritable: true,
        },
        {
          pubkey: SystemProgram.programId,
          isSigner: false,
          isWritable: false,
        },
      ],
      programId: walletProgramId,
      data: Buffer.concat([idx, acct_len, recovery_threshold]),
    });
    console.log("Initializing social wallet...");
    setCurrStep((prev) => prev + 1);

    const recentBlockhash = await connection.getLatestBlockhash();
    let tx = new Transaction({
      feePayer: feePayerPK,
      ...recentBlockhash,
    });
    tx.add(initializeSocialWalletIx);

    /* Versioned TX
    const recentBlockhash = await connection.getLatestBlockhash();
    const messageV0 = new TransactionMessage({
      payerKey: feePayer.publicKey,
      recentBlockhash: recentBlockhash.blockhash,
      instructions: [initializeSocialWalletIx],
    }).compileToV0Message();
    const tx = new VersionedTransaction(messageV0);
    tx.sign([feePayer]);
    */

    let txid = await sendAndConfirmTransactionWithAccount(
      connection,
      tx,
      [feePayer],
      {
        skipPreflight: true,
        preflightCommitment: "confirmed",
        commitment: "confirmed",
      }
    );
    console.log(`https://explorer.solana.com/tx/${txid}?cluster=devnet\n`);

    // CREATE TOKEN ACCOUNT & AIRDROP for TESTING!

    console.log("Creating mint account...");
    setCurrStep((prev) => prev + 1);
    const customMint = await createMint(
      connection,
      keypairFeePayer,
      feePayerPK,
      null,
      9
    );
    console.log("Mint created: ", customMint.toBase58());

    // Create Token Account for custom mint
    // console.log("Creating token account for mint...");
    // const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
    //   connection,
    //   feePayer,
    //   customMint,
    //   profile_pda[0],
    //   true
    // );
    // console.log(
    //   "token account created: " + senderTokenAccount.address.toBase58() + "\n"
    // );

    console.log(profile_pda);

    console.log("Getting associated token address...");
    const associatedToken = await getAssociatedTokenAddress(
      customMint,
      profile_pda[0],
      true,
      TOKEN_PROGRAM_ID
    );

    console.log("Creating token account for mint...");
    setCurrStep((prev) => prev + 1);
    const recentBlockhash1 = await connection.getLatestBlockhash();
    const createTA_tx = new Transaction({
      feePayer: feePayerPK,
      ...recentBlockhash1,
    });
    createTA_tx.add(
      createAssociatedTokenAccountInstruction(
        feePayerPK,
        associatedToken,
        profile_pda[0],
        customMint,
        TOKEN_PROGRAM_ID
      )
    );

    await sendAndConfirmTransactionWithAccount(
      connection,
      createTA_tx,
      [feePayer],
      {
        skipPreflight: true,
        preflightCommitment: "confirmed",
        commitment: "confirmed",
      }
    );

    console.log("Getting sender token account...");
    const senderTokenAccount = await getAccount(
      connection,
      associatedToken,
      "confirmed",
      TOKEN_PROGRAM_ID
    );

    console.log(
      "token account created: " + senderTokenAccount.address.toBase58() + "\n"
    );

    // Mint to token account (MINTING)
    console.log("Minting to token account...");
    await mintTo(
      connection,
      keypairFeePayer,
      customMint,
      associatedToken,
      keypairFeePayer,
      6e9,
      [],
      {
        skipPreflight: true,
        preflightCommitment: "confirmed",
        commitment: "confirmed",
      },
      TOKEN_PROGRAM_ID
    );
    console.log("Minted!\n");

    // CREATING NFT

    console.log("Creating nft mint account...");
    const nftMint = await createMint(
      connection,
      keypairFeePayer,
      feePayerPK,
      null,
      0
    );
    console.log("NFT created: ", nftMint.toBase58());

    console.log("Getting associated token address...");
    const associatedNFTToken = await getAssociatedTokenAddress(
      nftMint,
      profile_pda[0],
      true,
      TOKEN_PROGRAM_ID
    );

    console.log("Creating token account for NFT...");
    const recentBlockhash2 = await connection.getLatestBlockhash();
    const createNFT_TA_tx = new Transaction({
      feePayer: feePayerPK,
      ...recentBlockhash2,
    });
    createNFT_TA_tx.add(
      createAssociatedTokenAccountInstruction(
        feePayerPK,
        associatedNFTToken,
        profile_pda[0],
        nftMint,
        TOKEN_PROGRAM_ID
      )
    );

    await sendAndConfirmTransactionWithAccount(
      connection,
      createNFT_TA_tx,
      [feePayer],
      {
        skipPreflight: true,
        preflightCommitment: "confirmed",
        commitment: "confirmed",
      }
    );

    console.log("Getting sender token account...");
    const senderNFTTokenAccount = await getAccount(
      connection,
      associatedNFTToken,
      "confirmed",
      TOKEN_PROGRAM_ID
    );

    console.log(
      "NFT token account created: " +
        senderNFTTokenAccount.address.toBase58() +
        "\n"
    );

    // Mint to NFT token account (MINTING)
    console.log("Minting to NFT token account...");
    setCurrStep((prev) => prev + 1);
    await mintTo(
      connection,
      keypairFeePayer,
      nftMint,
      associatedNFTToken,
      keypairFeePayer,
      1,
      [],
      {
        skipPreflight: true,
        preflightCommitment: "confirmed",
        commitment: "confirmed",
      },
      TOKEN_PROGRAM_ID
    );
    console.log("Minted!\n");

    console.log("Disabling future minting...");
    setCurrStep((prev) => prev + 1);
    await setAuthority(
      connection,
      keypairFeePayer,
      nftMint,
      keypairFeePayer,
      AuthorityType.MintTokens,
      null,
      [],
      {
        skipPreflight: true,
        preflightCommitment: "confirmed",
        commitment: "confirmed",
      },
      TOKEN_PROGRAM_ID
    );
    console.log("Disabled!");
    // END TESTING

    // Generating Avatar
    if (genStep === 0) {
      console.log(`generating avatar for ${profile_pda[0]}...`);
      setCurrStep((prev) => prev + 1);
      const avatarPK = await generateAvatar(
        connection,
        feePayer,
        profile_pda[0],
        () => setGenStep((prev) => prev + 1)
      );
      const avatarData = await getAvatar(connection, avatarPK);
      const avatarSVG = `data:image/svg+xml;base64,${avatarData?.toString(
        "base64"
      )}`;
      setAvatar(avatarSVG);
      handleStorage(
        feePayerPK.toBase58(),
        profile_pda[0].toBase58(),
        avatarPK.toBase58()
      );
    } else {
      setAvatar(undefined);
      handleStorage(feePayerPK.toBase58(), profile_pda[0].toBase58());
    }
    setCurrStep((prev) => prev + 1);

    refreshBalance(network, feePayer)
      .then((updatedBalance) => {
        console.log("updated balance: ", updatedBalance);
        setBalance(updatedBalance);
      })
      .catch((err) => {
        console.log(err);
      });

    setTimeout(() => router.push("/wallet"), 1000);
  };

  if (loading) {
    return (
      <OnboardingSteps
        currStep={currStep}
        shouldGen={genStep != -1}
        genStep={genStep}
        testing
      />
    );
  }

  return (
    <>
      {children}
      <StyledForm
        form={form}
        size="middle"
        autoComplete="off"
        requiredMark={false}
        onFinish={handleOk}
      >
        <Form.Item name="thres" noStyle>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              marginTop: "2rem",
            }}
          >
            <Tooltip title="Select how many Guardians are required to recover your wallet">
              <p style={{ marginBottom: 0, marginRight: "1rem" }}>
                Set Recovery Guardian Threshold:
              </p>
            </Tooltip>
            <Select
              size="middle"
              defaultValue="2"
              style={{ width: "5rem" }}
              onChange={handleChange}
              options={[
                { value: "2", label: "2" },
                { value: "3", label: "3" },
                { value: "4", label: "4" },
                { value: "5", label: "5" },
              ]}
            />
          </div>
        </Form.Item>
        <Form.Item name="avatar" noStyle>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              marginTop: "1rem",
            }}
          >
            <p style={{ marginBottom: 0, marginRight: "1rem" }}>
              Generate unique avatar for your PublicKey?
            </p>
            <Checkbox
              checked={genStep === 0}
              onChange={handleCheckboxChange}
              style={{ color: "#fff" }}
            ></Checkbox>
          </div>
        </Form.Item>

        <Form.Item shouldUpdate className="submit">
          {() => (
            <Button htmlType="submit" type="primary">
              Generate
            </Button>
          )}
        </Form.Item>
        <Link href="/" passHref>
          <a className={styles.back}>
            <ArrowLeftOutlined /> Back Home
          </a>
        </Link>
      </StyledForm>
    </>
  );
};

export default SignupForm;
