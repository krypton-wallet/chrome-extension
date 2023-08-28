import { EnterOutlined } from "@ant-design/icons";
import Paragraph from "antd/lib/typography/Paragraph";
import { Box } from "../../styles/StyledComponents.styles";

const EditableBox = ({
  fieldName,
  value,
  handleChange,
}: {
  fieldName: string;
  value: string;
  handleChange: (s: string) => void;
}) => {
  return (
    <Box
      style={{ display: "flex", justifyContent: "flex-end", padding: "1em" }}
    >
      <Paragraph style={{ marginBottom: 0 }}>{fieldName}</Paragraph>
      <Paragraph
        editable={{
          onChange: handleChange,
          autoSize: true,
          enterIcon: <EnterOutlined style={{ color: "#fff" }} />,
        }}
        style={{ display: "flex", marginLeft: "auto", marginBottom: 0 }}
      >
        {value}
      </Paragraph>
    </Box>
  );
};

export default EditableBox;
