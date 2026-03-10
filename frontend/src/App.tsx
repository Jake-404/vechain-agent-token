import { useWallet } from "@vechain/dapp-kit-react";
import WalletConnect from "./components/WalletConnect";
import TokenInfo from "./components/TokenInfo";
import TransferForm from "./components/TransferForm";

function App() {
  const { account } = useWallet();

  return (
    <div className="app">
      <header className="header">
        <h1>VeChainAgent (VA)</h1>
        <p className="subtitle">VIP-180 Token on VeChainThor</p>
      </header>

      <main className="main">
        <WalletConnect />

        {account && (
          <>
            <TokenInfo account={account} />
            <TransferForm account={account} />
          </>
        )}

        {!account && (
          <div className="card info-card">
            <h2>Getting Started</h2>
            <p>Connect your VeWorld wallet to interact with VeChainAgent tokens.</p>
            <ol>
              <li>Install <a href="https://www.veworld.net/" target="_blank" rel="noopener noreferrer">VeWorld wallet</a></li>
              <li>Switch to VeChainThor Testnet</li>
              <li>Get test VET from the <a href="https://faucet.vecha.in" target="_blank" rel="noopener noreferrer">faucet</a></li>
              <li>Connect your wallet above</li>
            </ol>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>VeChainAgent Token &mdash; Built on VeChainThor</p>
      </footer>
    </div>
  );
}

export default App;
