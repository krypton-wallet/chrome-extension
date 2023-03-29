import { Keypair, PublicKey } from "@solana/web3.js";
import { signMessage } from "bloss-js";
import bs58 from "bs58";
import nacl from "tweetnacl";

interface Signer {
    getPublicKey(): Promise<PublicKey>,
    signMessage(message: Uint8Array): Promise<Uint8Array>
}

export class KeypairSigner implements Signer {
    keypair: Keypair;
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
    aid: string;
    constructor(aid: string) {
        this.aid = aid;
    }
    async getPublicKey(): Promise<PublicKey> {
        return PublicKey.default;
    }
    async signMessage(message: Uint8Array): Promise<Uint8Array> {
        const pin = new Uint8Array([]);
        const sig = await signMessage(this.aid, message, pin, () => {console.log('touched')})
        return sig;
    }
}


export type {Signer}