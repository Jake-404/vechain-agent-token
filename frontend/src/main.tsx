import React from "react";
import ReactDOM from "react-dom/client";
import { DAppKitProvider } from "@vechain/dapp-kit-react";
import App from "./App";
import "./App.css";

// Default to testnet; switch to "solo" for local development
const nodeUrl = import.meta.env.VITE_NODE_URL || "https://testnet.vechain.org";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DAppKitProvider
      node={nodeUrl}
      usePersistence
      v2Api={{ enabled: false }}
    >
      <App />
    </DAppKitProvider>
  </React.StrictMode>
);
