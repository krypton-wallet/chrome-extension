import { Keypair, PublicKey } from "@solana/web3.js";
import { getPubkey, signMessage } from "bloss-js";
import bs58 from "bs58";
import nacl from "tweetnacl";

interface Signer {
    getPublicKey(): Promise<PublicKey>,
    signMessage(message: Uint8Array): Promise<Uint8Array>
}

export class KeypairSigner implements Signer {
    private keypair: Keypair;

    constructor(keypair: Keypair) {
        this.keypair = keypair;
    }

    async getPublicKey(): Promise<PublicKey> {
        return this.keypair.publicKey;
    }

    async signMessage(message: Uint8Array): Promise<Uint8Array> {
      const secretKey = this.keypair.secretKey;
      const sig = nacl.sign.detached(message, secretKey);
      return sig;
    }
}

export class YubikeySigner implements Signer {
    private aid: string;

    constructor(aid: string) {
        this.aid = aid;
    }

    async getPublicKey(): Promise<PublicKey> {
        return new PublicKey(await getPubkey(this.aid));
    }

    async signMessage(message: Uint8Array): Promise<Uint8Array> {
        // TODO: Replace this with a popup that collects pin from user.
        const pin = new TextEncoder().encode("123456");
    
        // TODO: Replace this with a popup that prompts the user to touch yubikey.
        const touchCallback = () => console.log(`Awaiting touch on key ${this.aid}`);

        const sig = await signMessage(this.aid, message, pin, touchCallback);
        return sig;
    }
}

export type {Signer}