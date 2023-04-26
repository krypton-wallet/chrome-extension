import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import base58 from "bs58";

export interface Guardian {
    pubkey: PublicKey;
    shardIdx: number;
    hasSigned: boolean;
}

export interface IPDAData {
    authority: PublicKey;
    recoveryThreshold: number;
    guardiansLen: number;
    guardians: Guardian[];
    privScan: string;
    privSpend: string;
    recoveryPk: PublicKey;
}

export const parseDataFromPDA = (dataBuf: Buffer): IPDAData => {
    const pdaData = {} as IPDAData;
    if(dataBuf && dataBuf.length > 0) {
        pdaData.authority = new PublicKey(
            base58.encode(dataBuf.subarray(32))
        );
        pdaData.recoveryThreshold = new BN(dataBuf.subarray(32, 33), "le").toNumber();
        pdaData.guardiansLen = new BN(dataBuf.subarray(33, 37), "le").toNumber();
        pdaData.guardians = [];
        
        for(let i = 0; i < pdaData.guardiansLen; i++) {
            const guardianData = {} as Guardian;
            const guardianBuf = dataBuf.subarray(
                37 + 32 * i,
                37 + 32 * (i + 1)
            );
            guardianData.pubkey = new PublicKey(base58.encode(guardianBuf.subarray(32)));
            guardianData.shardIdx = guardianBuf.subarray(32, 33).readUInt8();
            guardianData.hasSigned = false;
            pdaData.guardians.push(guardianData);
        }

        const privScanStartingIdx = 32 + 1 + 4 + 34 * pdaData.guardiansLen;
        const privSpendStartingIdx = privScanStartingIdx + 32;
        const recoveryPkStartingIdx = privSpendStartingIdx + 32;
        pdaData.privScan = base58.encode(dataBuf.subarray(privScanStartingIdx, privSpendStartingIdx));
        pdaData.privSpend = base58.encode(dataBuf.subarray(privSpendStartingIdx, recoveryPkStartingIdx));
        pdaData.recoveryPk = new PublicKey(
            base58.encode(dataBuf.subarray(recoveryPkStartingIdx, recoveryPkStartingIdx + 32))
        );
    }
    return pdaData;
}

export const getGuardianListFromPDA = (pdaData: IPDAData): PublicKey[] => {
    const guardianList: PublicKey[] = [];
    for(const guardianObj of pdaData.guardians) {
        guardianList.push(guardianObj.pubkey);
    }
    return guardianList;
}