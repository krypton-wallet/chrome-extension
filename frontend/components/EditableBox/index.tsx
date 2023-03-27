import React, { ReactElement, useEffect, useState } from "react";
import { Divider, Typography } from "antd";
import { Box } from "../../styles/StyledComponents.styles";

const { Paragraph } = Typography;

const EditableBox = ({
  fieldName,
  value,
  handleChange,
}: {
  fieldName: string;
  value: string;
  handleChange: (s: string) => void;
}): ReactElement => {
  return (
    <Box style={{ display: "flex" }}>
      <Paragraph style={{}}>{fieldName}</Paragraph>
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
