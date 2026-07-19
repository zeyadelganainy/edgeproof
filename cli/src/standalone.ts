// EdgeProof — Standalone entry point. Uses the fully-local stack (node + indexer + proof server
// via standalone.yml) and the genesis-funded dev wallet, so it needs no faucet and syncs instantly.

import { StandaloneConfig } from "./config.js";
import { runDemo } from "./run.js";

// Seed for tokens minted in the genesis block of a local dev node (standalone only).
const GENESIS_MINT_WALLET_SEED = "0000000000000000000000000000000000000000000000000000000000000001";

runDemo(new StandaloneConfig(), GENESIS_MINT_WALLET_SEED, "Standalone")
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\nFATAL:", e instanceof Error ? (e.stack ?? e.message) : e);
    process.exit(1);
  });
