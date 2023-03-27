import React, { ReactElement, useEffect, useState } from "react";
import { Divider, Typography } from "antd";
import { Box } from "../../styles/StyledComponents.styles";

const { Paragraph } = Typography;

const CopyableBox = ({ fieldName, value, copyableValue }: { fieldName: string, value: string, copyableValue: string }): ReactElement => {

  return (
    <Box style={{display: "flex"}}>
      <Paragraph style={{}}>
        {fieldName}
      </Paragraph>
      <Divider type="vertical" />
      <Paragraph style={{position: 'absolute', right: '55px'}} copyable={{ text: copyableValue, tooltips: `Copy` }}>
        {value}
      </Paragraph>
    </Box>
  );
};

export default CopyableBox;
