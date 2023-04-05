import React, { ReactElement, useEffect, useState } from "react";
import { Divider, Typography } from "antd";
import { Box } from "../../styles/StyledComponents.styles";

const { Paragraph } = Typography;

const InfoBox = ({
  fieldName,
  value,
}: {
  fieldName: string;
  value: string;
}): ReactElement => {
  return (
    <Box style={{ display: "flex" }}>
      <Paragraph style={{}}>{fieldName}</Paragraph>
      <Divider type="vertical" />
      <Paragraph style={{ position: "absolute", right: "55px" }}>
        {value}
      </Paragraph>
    </Box>
  );
};

export default InfoBox;
