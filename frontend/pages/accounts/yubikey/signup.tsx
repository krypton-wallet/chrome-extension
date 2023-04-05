import { NextPage } from "next";
import { withRouter } from "next/router";
import { useGlobalState } from "../../../context";
import { YubikeySigner } from "../../../types/account";
import { useGlobalModalContext } from "../../../components/GlobalModal";
import PinentryModal from "../../../components/GlobalModal/PinentryModal";
import TouchConfirmModal from "../../../components/GlobalModal/TouchConfirmModal";
import YubikeyTable from "../../../components/SignupForm/YubikeyTable";
import SignupForm from "../../../components/SignupForm";
import { KeyOutlined } from "@ant-design/icons";

const YubikeySignup: NextPage = () => {
  const { yubikeyInfo: info } = useGlobalState();
  const { showModal, hideModal } = useGlobalModalContext();

  const feePayer = new YubikeySigner(
    info?.aid!,
    (isRetry: boolean) => {
      const promise = new Promise<string>((resolve, reject) => {
        showModal(
          <PinentryModal
            title={`Please unlock YubiKey no. ${(info!.aid as string).substring(
              20,
              28
            )}`}
            isRetry={isRetry}
            onSubmitPin={(pin: string) => {
              hideModal();
              resolve(pin);
            }}
            onCancel={() => {
              hideModal();
              reject("User cancelled");
            }}
          ></PinentryModal>
        );
      });
      return promise;
    },
    () => {
      showModal(
        <TouchConfirmModal
          onCancel={() => {
            hideModal();
            console.log("User cancelled touch");
          }}
        ></TouchConfirmModal>
      );
    },
    hideModal
  );

  const handleStorage = (
    feePayerPK: string,
    pda: string,
    avatarPK?: string
  ) => {
    chrome.storage.local.get(["y_counter", "y_accounts"], (res) => {
      const count = res["y_counter"];
      const accountRes = res["y_accounts"];
      if (accountRes != null) {
        var old = JSON.parse(accountRes);
        old[count] = {
          name: "Yubikey " + count.toString(),
          aid: info?.aid,
          manufacturer: info?.manufacturer,
          pk: feePayerPK,
          pda: pda,
          ...(avatarPK && { avatar: avatarPK }),
        };
        const values = JSON.stringify(old);
        chrome.storage.local.set({
          y_accounts: values,
          y_counter: count + 1,
          y_id: count,
          pk: feePayerPK,
          mode: 1,
        });
      } else {
        return false;
      }
    });
  };

  return (
    <>
      <SignupForm feePayer={feePayer} handleStorage={handleStorage}>
        <h1 className={"title"}>
          {`Initialize YubiKey Wallet `}
          <span>
            <KeyOutlined style={{ color: "#fff" }} />
          </span>
        </h1>
        <YubikeyTable />
      </SignupForm>
    </>
  );
};

export default withRouter(YubikeySignup);
