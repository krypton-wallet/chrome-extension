import { PublicKey } from "@solana/web3.js";

const displayPkList = (accountKeys: PublicKey[]) => {
    let allAccts = [];
    for (const acct of accountKeys) {
        allAccts.push(acct.toBase58());
    }
    console.log(allAccts);
};

export { displayPkList };