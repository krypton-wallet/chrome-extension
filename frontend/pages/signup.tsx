import { NextPage } from "next";
import { Keypair } from "@solana/web3.js";
import base58 from "bs58";
import {
  KeypairSigner,
  KryptonAccount,
  StandardAccount,
} from "../types/account";
import SignupForm from "../components/SignupForm";

const Signup: NextPage = () => {
  const feePayer = new Keypair();
  const feePayerSigner = new KeypairSigner(feePayer);

  const handleStorage = (feePayerAccount: Omit<KryptonAccount, "name">) => {
    chrome.storage.local.get(["counter", "accounts"], (res) => {
      const count = res["counter"];
      const accountRes = res["accounts"];
      if (accountRes != null) {
        const old = JSON.parse(accountRes);
        const account = {
          name: "Account " + count.toString(),
          ...feePayerAccount,
          keypair: feePayer,
        } as StandardAccount;
        const { stealth, ...rest } = account;
        old[count] = {
          sk: base58.encode(feePayer.secretKey),
          priv_scan: stealth?.priv_scan,
          priv_spend: stealth?.priv_spend,
          ...rest,
        };
        const values = JSON.stringify(old);
        chrome.storage.local.set({
          accounts: values,
          counter: count + 1,
          currId: count,
          pk: feePayerAccount.pk,
          mode: 0,
        });
      } else {
        return false;
      }
    });
  };

  return (
    <SignupForm feePayer={feePayerSigner} handleStorage={handleStorage} testing>
      <h1 className={"title"}>Create New Wallet</h1>
    </SignupForm>
  );
};

export default Signup;
