import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@vechain/sdk-hardhat-plugin";

// Default private key for Thor Solo's pre-funded account #0
// DO NOT use this key on mainnet — it's publicly known
const SOLO_PRIVATE_KEY =
  "0x7f9290cc44c5fd2b95fe21d6ad6fe5fa9c177d1cd8f3c78ad79e82b34712f063";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "shanghai",
    },
  },
  networks: {
    // Local Thor Solo node (run with: thor solo --on-demand --api-cors '*')
    vechain_solo: {
      url: "http://127.0.0.1:8669",
      accounts: [SOLO_PRIVATE_KEY],
      // @ts-ignore — VeChain-specific config
      restful: true,
      gas: "auto",
    },
    // VeChainThor public testnet
    vechain_testnet: {
      url: "https://testnet.vechain.org",
      accounts: {
        mnemonic:
          process.env.TESTNET_MNEMONIC ||
          "test test test test test test test test test test test junk",
      },
      // @ts-ignore — VeChain-specific config
      restful: true,
      gas: "auto",
    },
    // VeChainThor mainnet (for production deployment)
    vechain_mainnet: {
      url: "https://mainnet.vechain.org",
      accounts: {
        mnemonic: process.env.MAINNET_MNEMONIC || "",
      },
      // @ts-ignore — VeChain-specific config
      restful: true,
      gas: "auto",
    },
  },
};

export default config;
