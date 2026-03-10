import { useThor } from "@vechain/dapp-kit-react";
import { useState, useEffect, useCallback } from "react";
import { TOKEN_ADDRESS } from "../config/vechain";

// Minimal ABI fragments for reading token data
const nameAbi = {
  inputs: [],
  name: "name",
  outputs: [{ name: "", type: "string" }],
  stateMutability: "view",
  type: "function",
} as const;

const symbolAbi = {
  inputs: [],
  name: "symbol",
  outputs: [{ name: "", type: "string" }],
  stateMutability: "view",
  type: "function",
} as const;

const totalSupplyAbi = {
  inputs: [],
  name: "totalSupply",
  outputs: [{ name: "", type: "uint256" }],
  stateMutability: "view",
  type: "function",
} as const;

const balanceOfAbi = {
  inputs: [{ name: "owner", type: "address" }],
  name: "balanceOf",
  outputs: [{ name: "", type: "uint256" }],
  stateMutability: "view",
  type: "function",
} as const;

const ERC20_ABI = [nameAbi, symbolAbi, totalSupplyAbi, balanceOfAbi];

interface TokenInfoProps {
  account: string;
}

function TokenInfo({ account }: TokenInfoProps) {
  const thor = useThor();
  const [tokenName, setTokenName] = useState<string>("");
  const [tokenSymbol, setTokenSymbol] = useState<string>("");
  const [totalSupply, setTotalSupply] = useState<string>("0");
  const [userBalance, setUserBalance] = useState<string>("0");
  const [loading, setLoading] = useState(true);

  const fetchTokenData = useCallback(async () => {
    if (TOKEN_ADDRESS === "0x0000000000000000000000000000000000000000") {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const contract = thor.contracts.load(TOKEN_ADDRESS, ERC20_ABI);

      const [name, symbol, supply, bal] = await Promise.all([
        contract.read.name(),
        contract.read.symbol(),
        contract.read.totalSupply(),
        contract.read.balanceOf(account),
      ]);

      setTokenName(name[0] as string);
      setTokenSymbol(symbol[0] as string);

      const supplyBig = BigInt(String(supply[0]));
      setTotalSupply((Number(supplyBig) / 1e18).toLocaleString());

      const balBig = BigInt(String(bal[0]));
      setUserBalance((Number(balBig) / 1e18).toLocaleString());
    } catch (err) {
      console.error("Failed to fetch token data:", err);
    } finally {
      setLoading(false);
    }
  }, [account, thor]);

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
