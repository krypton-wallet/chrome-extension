import { Button, Modal } from "antd";
import { ReactElement } from "react";

const TouchConfirmModal = (
    props: {
        onCancel: () => void,
    }
): ReactElement => {
    return <Modal
        open={true}
        closable={false}
        title="Touch your YubiKey to confirm..."
        footer={null}
    ></Modal>;
}

export default TouchConfirmModal;
