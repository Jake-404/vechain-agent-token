/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TOKEN_ADDRESS: string;
  readonly VITE_NODE_URL: string;
  readonly VITE_GAME_REWARDS_ADDRESS: string;
  readonly VITE_GAME_SIGNER_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
