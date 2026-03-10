import { useWallet } from "@vechain/dapp-kit-react";
import { useState } from "react";
import { TOKEN_ADDRESS } from "../config/vechain";
import { Interface, parseEther } from "ethers";

interface TransferFormProps {
  account: string;
}

function TransferForm({ account }: TransferFormProps) {
  const { requestTransaction } = useWallet();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [txId, setTxId] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const iface = new Interface([
    "function transfer(address to, uint256 value)",
  ]);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recipient || !amount) return;

    try {
      setStatus("pending");
      setErrorMsg("");
      setTxId("");

      const transferData = iface.encodeFunctionData("transfer", [
        recipient,
        parseEther(amount),
      ]);

      // Build the transaction clause
      const clause = {
        to: TOKEN_ADDRESS,
        value: "0x0",
        data: transferData,
      };

      // Sign and send via wallet
      const result = await requestTransaction([clause], {
        comment: `Transfer ${amount} VA to ${recipient}`,
      });

      setTxId(result.txid);
      setStatus("success");
      setRecipient("");
      setAmount("");
    } catch (err: any) {
      console.error("Transfer failed:", err);
      setErrorMsg(err?.message || "Transaction failed");
      setStatus("error");
    }
  };

  if (TOKEN_ADDRESS === "0x0000000000000000000000000000000000000000") {
    return null;
  }

  return (
    <div className="card transfer-card">
      <h2>Transfer VA Tokens</h2>
      <form onSubmit={handleTransfer}>
        <div className="form-group">
          <label htmlFor="recipient">Recipient Address</label>
          <input
            id="recipient"
            type="text"
            placeholder="0x..."
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            disabled={status === "pending"}
          />
        </div>
        <div className="form-group">
          <label htmlFor="amount">Amount (VA)</label>
          <input
            id="amount"
            type="number"
            step="0.000000000000000001"
            min="0"
            placeholder="100"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={status === "pending"}
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={status === "pending" || !recipient || !amount}
        >
          {status === "pending" ? "Signing..." : "Send VA"}
        </button>
      </form>

      {status === "success" && txId && (
        <div className="status success">
          Transfer submitted! TX: <code>{txId.slice(0, 10)}...{txId.slice(-8)}</code>
        </div>
      )}

      {status === "error" && (
        <div className="status error">
          {errorMsg}
        </div>
      )}
    </div>
  );
}

export default TransferForm;
