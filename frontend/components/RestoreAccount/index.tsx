import { LoadingOutlined, UnlockOutlined } from "@ant-design/icons";
import { Button } from "antd";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "../../styles/StyledComponents.styles";

const RestoreAccount = () => {
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    setLoading(false);
  }, []);

  const handleGetWallet = () => {
    setLoading(true);
  };

  return (
    <Card>
      <UnlockOutlined
        style={{ fontSize: "3rem", margin: "2rem 0", display: "block" }}
      />
      <h2>Social Recovery</h2>
      <p>Notify your guardians to recover an existing Solana wallet.</p>

      <div className={"buttons"}>
        {!loading && (
          <Link href={`/generateRecover`} passHref>
            <Button onClick={handleGetWallet}>Recover Wallet</Button>
          </Link>
        )}
        {loading && (
          <Button className={"disabledButton"} disabled>
            <LoadingOutlined style={{ fontSize: 24, color: "#fff" }} spin />
          </Button>
        )}
      </div>
    </Card>
  );
};

export default RestoreAccount;
