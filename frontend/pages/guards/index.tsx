import { NextPage } from "next";
import { Input } from "antd";
import { useState, useEffect } from "react";
import * as krypton from "../../js/src/generated";
import { getCurrentAccount, getGuardPDA } from "../../utils";
import { useGlobalModalContext } from "../../components/GlobalModal";
import { KryptonAccount } from "../../types/account";


const Guards: NextPage = () => {
    // TODO: lookup all guards here
    const [currentAccount, setCurrentAccount] = useState<KryptonAccount | undefined>();
    const ctx = useGlobalModalContext();
    getCurrentAccount(ctx).then(setCurrentAccount);

    useEffect(() => {
        const setup = async () => {
            console.log("In guard setup effect");
            const guardAddress = getGuardPDA(await currentAccount!.getPublicKey())
            console.log("guard address? :", guardAddress.toString());
        };
        setup().then(() => {
            console.log("guards setup complete")
        });
    })

    return (
        <div>
            <h1 className={"title"}>Guards</h1>
            <p>Native SOL transfer guard</p>
            {/* native sol transfer guard component */}
        </div>
    );
};

export default Guards;