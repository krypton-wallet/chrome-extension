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
            <Button key="cancel" onClick={props.onCancel}>
                Cancel
            </Button>,
            <Button
                key="submit"
                type="primary"
                onClick={() => {
                    form.validateFields().then(({ pin }) => {
                        props.onSubmitPin(pin);
                    }).catch((info) => {
                        console.log("Validate Failed:", info);
                    });
                }}
            >
                Unlock
            </Button>
        ]}
    >
        <Form
            form={form}
            layout="vertical"
            name="form_in_modal"
            preserve={false}
            onSubmitCapture={() => {
                form.validateFields().then(({ pin }) => {
                    props.onSubmitPin(pin);
                }).catch((info) => {
                    console.log("Validate Failed:", info);
                });
            }}
        >
            <Form.Item
                label={props.description}
                name="pin"
            >
                <Input.Password placeholder="PIN" type="password" status={props.isRetry ? "error" : ""} />
            </Form.Item>
        </Form>
    </Modal>
}

export default PinentryModal;
