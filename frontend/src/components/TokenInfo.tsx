import { useConnex } from "@vechain/dapp-kit-react";
import { useState, useEffect, useCallback } from "react";
import { TOKEN_ADDRESS, TOKEN_ABI } from "../config/vechain";
import { Interface } from "ethers";

interface TokenInfoProps {
  account: string;
}

function TokenInfo({ account }: TokenInfoProps) {
  const connex = useConnex();
  const [tokenName, setTokenName] = useState<string>("");
  const [tokenSymbol, setTokenSymbol] = useState<string>("");
  const [totalSupply, setTotalSupply] = useState<string>("0");
  const [userBalance, setUserBalance] = useState<string>("0");
  const [loading, setLoading] = useState(true);

  const iface = new Interface([
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
  ]);

  const fetchTokenData = useCallback(async () => {
    if (TOKEN_ADDRESS === "0x0000000000000000000000000000000000000000") {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Read token name
      const nameResult = await connex.thor
        .account(TOKEN_ADDRESS)
        .method(iface.getFunction("name")!)
        .call();
      setTokenName(nameResult.decoded[0] as string);

      // Read token symbol
      const symbolResult = await connex.thor
        .account(TOKEN_ADDRESS)
        .method(iface.getFunction("symbol")!)
        .call();
      setTokenSymbol(symbolResult.decoded[0] as string);

      // Read total supply
      const supplyResult = await connex.thor
        .account(TOKEN_ADDRESS)
        .method(iface.getFunction("totalSupply")!)
        .call();
      const supply = BigInt(supplyResult.decoded[0] as string);
      setTotalSupply((Number(supply) / 1e18).toLocaleString());

      // Read user balance
      const balanceResult = await connex.thor
        .account(TOKEN_ADDRESS)
        .method(iface.getFunction("balanceOf")!)
        .call(account);
      const bal = BigInt(balanceResult.decoded[0] as string);
      setUserBalance((Number(bal) / 1e18).toLocaleString());
    } catch (err) {
      console.error("Failed to fetch token data:", err);
    } finally {
      setLoading(false);
    }
  }, [account, connex]);

  useEffect(() => {
    fetchTokenData();
  }, [fetchTokenData]);

  if (TOKEN_ADDRESS === "0x0000000000000000000000000000000000000000") {
    return (
      <div className="card warning-card">
        <h2>Contract Not Deployed</h2>
        <p>
          Set <code>VITE_TOKEN_ADDRESS</code> in <code>frontend/.env</code> after
          deploying the contract.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card">
        <p>Loading token data...</p>
      </div>
    );
  }

  return (
    <div className="card token-card">
      <h2>
        {tokenName} ({tokenSymbol})
      </h2>
      <div className="token-stats">
        <div className="stat">
          <span className="stat-label">Total Supply</span>
          <span className="stat-value">
            {totalSupply} {tokenSymbol}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Your Balance</span>
          <span className="stat-value highlight">
            {userBalance} {tokenSymbol}
          </span>
        </div>
      </div>
      <button className="btn btn-secondary" onClick={fetchTokenData}>
        Refresh
      </button>
    </div>
  );
}

export default TokenInfo;
