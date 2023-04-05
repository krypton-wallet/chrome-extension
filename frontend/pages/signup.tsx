import { NextPage } from "next";
import { Keypair } from "@solana/web3.js";
import base58 from "bs58";
import { KeypairSigner } from "../types/account";
import SignupForm from "../components/SignupForm";

const Signup: NextPage = () => {
  const feePayer = new Keypair();
  const feePayerSigner = new KeypairSigner(feePayer);

  const handleStorage = (
    feePayerPK: string,
    pda: string,
    avatarPK?: string
  ) => {
    chrome.storage.local.get(["counter", "accounts"], (res) => {
      const count = res["counter"];
      const accountRes = res["accounts"];
      if (accountRes != null) {
        var old = JSON.parse(accountRes);
        old[count] = {
          name: "Account " + count.toString(),
          sk: base58.encode(feePayer.secretKey),
          pk: feePayerPK,
          pda: pda,
          ...(avatarPK && { avatar: avatarPK }),
        };
        const values = JSON.stringify(old);
        chrome.storage.local.set({
          accounts: values,
          counter: count + 1,
          currId: count,
          pk: feePayerPK,
          mode: 0,
        });
      } else {
        return false;
      }
    });
  };

  return (
    <SignupForm feePayer={feePayerSigner} handleStorage={handleStorage}>
      <h1 className={"title"}>Create New Wallet</h1>
    </SignupForm>
  );
};

export default Signup;
