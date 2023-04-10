import React from "react";
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
    <Box style={{ display: "flex" }}>
      <Paragraph>{fieldName}</Paragraph>
      <Paragraph
        style={{ position: "absolute", right: "55px" }}
        editable={{ onChange: handleChange, autoSize: true }}
      >
        {value}
      </Paragraph>
    </Box>
  );
};

export default EditableBox;
