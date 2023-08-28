import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { Button, Input } from "antd";
import { NextPage } from "next";
import { useEffect, useMemo, useState } from "react";
import { useGlobalModalContext } from "../../components/GlobalModal";
import { useGlobalState } from "../../context";
import * as krypton from "../../js/src/generated";
import { KryptonAccount, YubikeyAccount } from "../../types/account";
import { getCurrentAccount, getGuardPDA } from "../../utils";
import { RPC_URL } from "../../utils/constants";

const MIN_TRANSFER_LIMIT = 400_000;

const Guards: NextPage = () => {
  const [currentAccount, setCurrentAccount] = useState<
    KryptonAccount | undefined
  >();
  const [guardAddress, setGuardAddress] = useState<PublicKey | undefined>();
  const [transferLimit, setTransferLimit] =
    useState<number>(MIN_TRANSFER_LIMIT);
  const ctx = useGlobalModalContext();
  const { network } = useGlobalState();
  const connection = useMemo(
    () => new Connection(RPC_URL(network), "confirmed"),
    [network]
  );

  useEffect(() => {
    const setup = async () => {
      const currentAccount = await getCurrentAccount(ctx);
      setCurrentAccount(currentAccount);

      const [guardAddress] = getGuardPDA(new PublicKey(currentAccount!.pda));
      const maybeGuardAccount = await connection.getAccountInfo(guardAddress);

      if (maybeGuardAccount) {
        let guard = krypton.GuardAccount.fromAccountInfo(maybeGuardAccount);
        console.log("found guard", guard);
      }
    };
    setup().then(() => {
      console.log("guards setup complete");
    });
  }, [connection, ctx]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTransferLimit(parseInt(e.target.value));
  };

  return (
    <div>
      <h1 className={"title"}>Guards</h1>
      <p>Native SOL transfer guard</p>
      {!guardAddress && (
        <>
          <p>Enter the maximum amount of lamports to transfer per day.</p>
          <Input
            placeholder="lamports"
            onChange={handleInputChange}
            type="number"
          />
          <Button
            type="primary"
            onClick={() => {
              if (!currentAccount) {
                console.error("no current account");
                return;
              }
              createNativeSolTransferGuard(
                currentAccount,
                transferLimit,
                connection,
                (guardAddress) => setGuardAddress(guardAddress)
              );
            }}
          >
            Create Guard
          </Button>
        </>
      )}
      {guardAddress && (
        <>
          <p>Guard account: {guardAddress.toBase58()}</p>
          <Button
            type="primary"
            onClick={() => {
              if (!currentAccount) {
                console.error("no current account");
                return;
              }
              removeGuard(currentAccount, guardAddress, connection, () =>
                setGuardAddress(undefined)
              );
            }}
          >
            Remove Guard
          </Button>
        </>
      )}
    </div>
  );
};

const createNativeSolTransferGuard = async (
  currentAccount: KryptonAccount | YubikeyAccount,
  transferLimit: number,
  connection: Connection,
  callback: (guardAddress: PublicKey) => void
) => {
  if (transferLimit < MIN_TRANSFER_LIMIT) {
    console.error("transfer limit too low");
    return;
  }

  const [guardAddress] = getGuardPDA(new PublicKey(currentAccount.pda));
  const createNativeSolTransferGuardInstruction =
    krypton.createInitializeNativeSolTransferGuardInstruction(
      {
        profileInfo: new PublicKey(currentAccount.pda),
        authorityInfo: await currentAccount.getPublicKey(),
        guardInfo: guardAddress,
      },
      {
        initializeNativeSolTransferGuardArgs: {
          target: new PublicKey(currentAccount.pda),
          transferAmount: transferLimit,
        },
      }
    );

  let { blockhash } = await connection.getLatestBlockhash();

  let transaction = new Transaction();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = await currentAccount.getPublicKey();
  transaction.add(createNativeSolTransferGuardInstruction);

  callback(guardAddress);
};

const removeGuard = async (
  currentAccount: KryptonAccount | YubikeyAccount,
  guardAddress: PublicKey,
  connection: Connection,
  callback: (guardAddress: PublicKey) => void
) => {
  const removeGuardInstruction = krypton.createRemoveGuardInstruction({
    profileInfo: new PublicKey(currentAccount.pda),
    authorityInfo: await currentAccount.getPublicKey(),
    guardInfo: guardAddress,
  });

  let { blockhash } = await connection.getLatestBlockhash();

  let transaction = new Transaction();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = await currentAccount.getPublicKey();
  transaction.add(removeGuardInstruction);

  callback(guardAddress);
};

export default Guards;
