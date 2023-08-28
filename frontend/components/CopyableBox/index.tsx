import { Divider } from "antd";
import Paragraph from "antd/lib/typography/Paragraph";
import { Box } from "../../styles/StyledComponents.styles";

const CopyableBox = ({
  fieldName,
  value,
  copyableValue,
}: {
  fieldName: string;
  value: string;
  copyableValue: string;
}) => {
  return (
    <Box
      style={{ display: "flex", justifyContent: "flex-end", padding: "1em" }}
    >
      <Paragraph style={{ marginBottom: 0 }}>{fieldName}</Paragraph>
      <Divider type="vertical" />
      <Paragraph
        copyable={{ text: copyableValue, tooltips: `Copy` }}
        style={{ display: "flex", marginLeft: "auto", marginBottom: 0 }}
      >
        {value}
      </Paragraph>
    </Box>
  );
};

export default CopyableBox;
