import { useWallet, useThor } from "@vechain/dapp-kit-react";
import { useState, useEffect } from "react";

function WalletConnect() {
  const { account, disconnect, setSource, connect } = useWallet();
  const thor = useThor();
  const [balance, setBalance] = useState<string>("0");

  useEffect(() => {
    if (!account) {
      setBalance("0");
      return;
    }

    const fetchBalance = async () => {
      try {
        const detail = await thor.accounts.getAccount(account);
        // VET balance is in wei (18 decimals)
        const vet = BigInt(detail.balance);
        const formatted = (Number(vet) / 1e18).toFixed(4);
        setBalance(formatted);
      } catch (err) {
        console.error("Failed to fetch balance:", err);
      }
    };

    fetchBalance();
  }, [account, thor]);

  const handleConnect = async () => {
    try {
      setSource("veworld");
      await connect();
    } catch (err) {
      console.error("Failed to connect wallet:", err);
    }
  };

  if (account) {
    return (
      <div className="card wallet-card">
        <div className="wallet-info">
          <div className="wallet-label">Connected Wallet</div>
          <div className="wallet-address">
            {account.slice(0, 6)}...{account.slice(-4)}
          </div>
          <div className="wallet-balance">{balance} VET</div>
        </div>
        <button className="btn btn-secondary" onClick={disconnect}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <button className="btn btn-primary" onClick={handleConnect}>
        Connect VeWorld Wallet
      </button>
    </div>
  );
}

export default WalletConnect;
