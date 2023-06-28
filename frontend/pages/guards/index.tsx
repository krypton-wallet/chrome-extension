import { Button } from "antd";
import { PublicKey, Transaction } from "@solana/web3.js";
import { NextPage } from "next";
import { Input } from "antd";
import { useState, useEffect } from "react";
import * as krypton from "../../js/src/generated";
import { getCurrentAccount, getGuardPDA, sendAndConfirmTransactionWithAccount } from "../../utils";
import { useGlobalModalContext } from "../../components/GlobalModal";
import { KryptonAccount, YubikeyAccount } from "../../types/account";
import { Connection } from "@solana/web3.js";
import { RPC_URL } from "../../utils/constants";
import { useGlobalState } from "../../context";

const MIN_TRANSFER_LIMIT = 400_000;

const Guards: NextPage = () => {
    // TODO: lookup all guards here
    const [currentAccount, setCurrentAccount] = useState<KryptonAccount | undefined>();
    const [guardAddress, setGuardAddress] = useState<PublicKey | undefined>();
    const [transferLimit, setTransferLimit] = useState<number>(MIN_TRANSFER_LIMIT);
    const ctx = useGlobalModalContext();
    const { network } = useGlobalState();
    const connection = new Connection(RPC_URL(network), "confirmed");

    useEffect(() => {
        const setup = async () => {
            const currentAccount = await getCurrentAccount(ctx);
            setCurrentAccount(currentAccount);

            const [guardAddress] = getGuardPDA(new PublicKey(currentAccount!.pda))
            const maybeGuardAccount = await connection.getAccountInfo(guardAddress);


            if (maybeGuardAccount) {
                let guard = krypton.GuardAccount.fromAccountInfo(maybeGuardAccount);
                console.log("found guard", guard);
            }
        };
        setup().then(() => {
            console.log("guards setup complete");
        });
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTransferLimit(parseInt(e.target.value));
    }

    return (
        <div>
            <h1 className={"title"}>Guards</h1>
            <p>Native SOL transfer guard</p>
            {!guardAddress && (<>
                <p>Enter the maximum amount of lamports to transfer per day.</p>
                <Input placeholder="lamports" onChange={handleInputChange} type="number"/>
                <Button type="primary" onClick={() => {
                    if (!currentAccount) {
                        console.error("no current account");
                        return;
                    }
                    createNativeSolTransferGuard(currentAccount, transferLimit, connection, (guardAddress) => setGuardAddress(guardAddress))
                }}>Create Guard</Button>
            </>)}
            {guardAddress && (<>
                <p>Guard account: {guardAddress.toBase58()}</p>
                <Button type="primary" onClick={() => {
                    if (!currentAccount) {
                        console.error("no current account");
                        return;
                    }
                    removeGuard(currentAccount, guardAddress, connection, (guardAddress) => setGuardAddress(undefined))
                }}>Remove Guard</Button>
            </>)}
        </div>
    );
};

const createNativeSolTransferGuard = async (currentAccount: KryptonAccount | YubikeyAccount, transferLimit: number, connection: Connection, callback: (guardAddress: PublicKey) => void) => {
    // TODO: The transfer limit should never be less than the compute cost to remove the transfer limit guard.
    // create an instruction to remove the guard and calculate the compute costs.
    // the minimum transfer limit should be the compute cost + 1;
    if (transferLimit < MIN_TRANSFER_LIMIT) {
        console.error("transfer limit too low");
        return;
    }

    const [guardAddress] = getGuardPDA(new PublicKey(currentAccount.pda));
    const createNativeSolTransferGuardInstruction = krypton.createInitializeNativeSolTransferGuardInstruction({
        profileInfo: new PublicKey(currentAccount.pda),
        authorityInfo: await currentAccount.getPublicKey(),
        guardInfo: guardAddress
    }, {
        initializeNativeSolTransferGuardArgs: {
            target: new PublicKey(currentAccount.pda),
            transferAmount: transferLimit
        }
    });

    let {blockhash} = await connection.getLatestBlockhash();

    let transaction = new Transaction();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = await currentAccount.getPublicKey();
    transaction.add(createNativeSolTransferGuardInstruction);

    let sig = await sendAndConfirmTransactionWithAccount(connection, transaction, [currentAccount]);

    callback(guardAddress);
};

const removeGuard = async (currentAccount: KryptonAccount | YubikeyAccount, guardAddress: PublicKey, connection: Connection, callback: (guardAddress: PublicKey) => void) => {
    const removeGuardInstruction = krypton.createRemoveGuardInstruction({
        profileInfo: new PublicKey(currentAccount.pda),
        authorityInfo: await currentAccount.getPublicKey(),
        guardInfo: guardAddress
    });

    let {blockhash} = await connection.getLatestBlockhash();

    let transaction = new Transaction();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = await currentAccount.getPublicKey();
    transaction.add(removeGuardInstruction);

    let sig = await sendAndConfirmTransactionWithAccount(connection, transaction, [currentAccount]);
    callback(guardAddress);
}

export default Guards;