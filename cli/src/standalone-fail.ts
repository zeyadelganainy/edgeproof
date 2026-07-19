// EdgeProof — Standalone soundness demo: prove that the same circuit rejects the losing dataset.

import { StandaloneConfig } from "./config.js";
import { runFailDemo } from "./run.js";

const GENESIS_MINT_WALLET_SEED = "0000000000000000000000000000000000000000000000000000000000000001";

runFailDemo(new StandaloneConfig(), GENESIS_MINT_WALLET_SEED, "Standalone")
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((e) => {
    console.error("\nFATAL:", e instanceof Error ? (e.stack ?? e.message) : e);
    process.exit(1);
  });
