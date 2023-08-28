import { Keypair } from "@solana/web3.js";
import base58 from "bs58";
import { NextPage } from "next";
import SignupForm from "../components/SignupForm";
import { useGlobalState } from "../context";
import {
  KeypairSigner,
  KryptonAccount,
  StandardAccount,
} from "../types/account";

const Signup: NextPage = () => {
  const { network } = useGlobalState();

  let feePayer = new Keypair();
  // NOTE: if testing on mainnet, you can skip the devnet wallet creation step by
  // using a prefunded keypair (rather than creating a random keypair)
  if (network == "mainnet-beta") {
    // let sk = [<REPLACE WITH SECRET KEY>].slice(0, 32);
    // feePayer = Keypair.fromSeed(Uint8Array.from(sk));
  }
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
        old[count] = {
          sk: base58.encode(feePayer.secretKey),
          ...account,
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
    // NOTE: if testing with tokens, pass testing info SignupForm
    <SignupForm feePayer={feePayerSigner} handleStorage={handleStorage} testing>
      <h1 className={"title"}>Create New Wallet</h1>
    </SignupForm>
  );
};

export default Signup;
