import { Button, Form, Input, Modal } from "antd";
import { ReactElement, useState } from "react";

const PinentryModal = (
    props: {
        title: string,
        description: string,
        isRetry: boolean,
        onSubmitPin: (pin: string) => void,
        onCancel: () => void,
    }
): ReactElement => {
    const [form] = Form.useForm();

    return <Modal
        open={true}
        closable={false}
        title={props.title}
        footer={[
            <Button key="cancel" onClick={props.onCancel}>Cancel</Button>
        ]}
    >
        <Form
            form={form}
            layout="vertical"
            name="form_in_modal"
            preserve={false}
            onFinish={({ pin }: { pin: string}) => {
                props.onSubmitPin(pin);
            }}
        >
            <Form.Item label={props.description} name="pin">
                <Input.Password placeholder="PIN" type="password" status={props.isRetry ? "error" : ""} />
            </Form.Item>
        </Form>
    </Modal>
}

export default PinentryModal;
