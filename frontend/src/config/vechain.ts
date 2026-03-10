// VeChainAgent token contract ABI (ERC-20 / VIP-180 interface)
export const TOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 value) returns (bool)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transferFrom(address from, address to, uint256 value) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
] as const;

// Update this after deploying your contract
// Thor Solo default deploy address — will change each deployment
export const TOKEN_ADDRESS =
  import.meta.env.VITE_TOKEN_ADDRESS ||
  "0x0000000000000000000000000000000000000000";

// Network configurations
export const NETWORKS = {
  solo: {
    name: "Thor Solo (Local)",
    url: "http://127.0.0.1:8669",
    explorerUrl: "",
  },
  testnet: {
    name: "VeChainThor Testnet",
    url: "https://testnet.vechain.org",
    explorerUrl: "https://explore-testnet.vechain.org",
  },
  mainnet: {
    name: "VeChainThor Mainnet",
    url: "https://mainnet.vechain.org",
    explorerUrl: "https://explore.vechain.org",
  },
} as const;

export type NetworkId = keyof typeof NETWORKS;
