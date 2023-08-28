import { ArrowLeftOutlined, InfoCircleOutlined } from "@ant-design/icons";
import {
  AuthorityType,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createMint,
  getAccount,
  getAssociatedTokenAddress,
  mintTo,
  setAuthority,
} from "@solana/spl-token";
import { Connection, Transaction } from "@solana/web3.js";
import { Button, Checkbox, Form, Select, Tooltip } from "antd";
import Link from "next/link";
import { useRouter } from "next/router";
import { ReactNode, useState } from "react";
import { useGlobalState } from "../../context";
import * as krypton from "../../js/src/generated";
import { StyledForm } from "../../styles/StyledComponents.styles";
import { KeypairSigner, KryptonAccount, Signer } from "../../types/account";
import {
  getProfilePDA,
  refreshBalance,
  sendAndConfirmTransactionWithAccount,
} from "../../utils";
import { generateAvatar } from "../../utils/avatar";
import {
  REFILL_TO_BALANCE,
  RPC_URL,
  WALLET_PROGRAM_ID,
} from "../../utils/constants";
import styles from "../Layout/index.module.css";
import OnboardingSteps from "../OnboardingSteps";

const SignupForm = ({
  feePayer,
  handleStorage,
  children,
  testing,
}: {
  feePayer: Signer;
  handleStorage: (feePayerSigner: Omit<KryptonAccount, "name">) => void;
  children: ReactNode;
  testing?: boolean;
}) => {
  const { network, setBalance } = useGlobalState();
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
    const feePayerPK = await feePayer.getPublicKey();
    const [profileAddress] = getProfilePDA(feePayerPK);
    const thres = Number(values.thres);
    console.log("input thres: ", thres);

    const feePayerAccount: Omit<KryptonAccount, "name"> = {
      ...feePayer,
      pk: feePayerPK.toBase58(),
      pda: profileAddress.toBase58(),
    };
    console.log("feePayer Account: ", feePayerAccount);

    const connection = new Connection(RPC_URL(network), "confirmed");

    console.log("pk: ", feePayerPK.toBase58());
    console.log("PDA: ", profileAddress.toBase58());
    console.log("program id: ", WALLET_PROGRAM_ID.toBase58());

    if (network == "devnet") {
      console.log("Requesting Airdrop of 0.2 SOL...");
      const signature = await connection.requestAirdrop(
        feePayerPK,
        // NOTE: for testing reimbursement, change REFILL_TO_BALANCE to
          // TEST_INITIAL_BALANCE_FAILURE if testing with mint
          // TEST_INITIAL_BALANCE_FAILURE_WITHOUT_MINTING if testing without mint
        REFILL_TO_BALANCE
      );
      let recentBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        {
          blockhash: recentBlockhash.blockhash,
          lastValidBlockHeight: recentBlockhash.lastValidBlockHeight,
          signature,
        },
        "confirmed"
      );
    }

    // instr 1: initialize social recovery wallet
    const initializeSocialWalletIx = krypton.createInitializeWalletInstruction(
      {
        profileInfo: profileAddress,
        authorityInfo: feePayerPK,
      },
      {
        initializeWalletArgs: {
          recoveryThreshold: thres,
        },
      }
    );
    console.log("init ix");
    console.log(initializeSocialWalletIx);

    let recentBlockhash1 = await connection.getLatestBlockhash();
    const tx = new Transaction({
      feePayer: feePayerPK,
      ...recentBlockhash1,
    });

    tx.add(initializeSocialWalletIx);
    console.log("sending TX!");

    const txid = await sendAndConfirmTransactionWithAccount(
      connection,
      tx,
      [feePayer],
      {
        skipPreflight: true,
        preflightCommitment: "confirmed",
        commitment: "confirmed",
      }
    );
    setCurrStep((prev) => prev + 1);
    console.log(`https://explorer.solana.com/tx/${txid}?cluster=${network}\n`);

    // CREATE TOKEN ACCOUNT & AIRDROP for TESTING!
    if (testing) {
      const keypairFeePayer = (feePayer as KeypairSigner).keypair;
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

      console.log("profile address");
      console.log(profileAddress);

      console.log("Getting associated token address...");
      const associatedToken = await getAssociatedTokenAddress(
        customMint,
        profileAddress,
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
          profileAddress,
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
        profileAddress,
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
          profileAddress,
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
    }
    // END TESTING

    // Generating Avatar
    if (genStep === 0) {
      console.log(`generating avatar for ${profileAddress}...`);
      setCurrStep((prev) => prev + 1);
      const avatarPK = await generateAvatar(
        network ?? "devnet",
        connection,
        feePayer,
        profileAddress,
        () => setGenStep((prev) => prev + 1)
      );
      feePayerAccount.avatar = avatarPK.toBase58();
    }
    handleStorage(feePayerAccount);
    setCurrStep((prev) => prev + 1);

    refreshBalance(network, feePayerPK)
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
        testing={testing}
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
              width: "100%",
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "2rem",
            }}
          >
            <p style={{ marginBottom: 0 }}>
              Set Guardian Threshold:
              <Tooltip title="Select how many Guardians are required to recover your wallet">
                <InfoCircleOutlined
                  style={{ marginLeft: "0.5rem", cursor: "pointer" }}
                />
              </Tooltip>
            </p>
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
              Generate unique avatar for your wallet?
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
