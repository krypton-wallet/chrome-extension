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


const Guards: NextPage = () => {
    // TODO: lookup all guards here
    const [currentAccount, setCurrentAccount] = useState<KryptonAccount | undefined>();
    const [guardAddress, setGuardAddress] = useState<PublicKey | undefined>();
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

    return (
        <div>
            <h1 className={"title"}>Guards</h1>
            <p>Native SOL transfer guard</p>
            {guardAddress && (<p>Guard account: {guardAddress.toBase58()}</p>)}

            <Button type="primary" onClick={() => {
                if (!currentAccount) {
                    console.error("no current account");
                    return;
                }
                createNativeSolTransferGuard(currentAccount, connection, (guardAddress) => setGuardAddress(guardAddress))
            }}>Create Guard</Button>
        </div>
    );
};

const createNativeSolTransferGuard = async (currentAccount: KryptonAccount | YubikeyAccount, connection: Connection, callback: (guardAddress: PublicKey) => void) => {
    const [guardAddress] = getGuardPDA(new PublicKey(currentAccount.pda));
    const createNativeSolTransferGuardInstruction = krypton.createInitializeNativeSolTransferGuardInstruction({
        profileInfo: new PublicKey(currentAccount.pda),
        authorityInfo: await currentAccount.getPublicKey(),
        guardInfo: guardAddress
    }, {
        initializeNativeSolTransferGuardArgs: {
            target: new PublicKey(currentAccount.pda),
            transferAmount: 1000
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

export default Guards;