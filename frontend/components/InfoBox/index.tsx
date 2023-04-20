import { Divider } from "antd";
import { Box } from "../../styles/StyledComponents.styles";
import Paragraph from "antd/lib/typography/Paragraph";

const InfoBox = ({
  fieldName,
  value,
}: {
  fieldName: string;
  value: string;
}) => {
  return (
    <Box
      style={{ display: "flex", justifyContent: "flex-end", padding: "1em" }}
    >
      <Paragraph style={{ marginBottom: 0 }}>{fieldName}</Paragraph>
      <Divider type="vertical" />
      <Paragraph
        style={{ display: "flex", marginLeft: "auto", marginBottom: 0 }}
      >
        {value}
      </Paragraph>
    </Box>
  );
};

export default InfoBox;
