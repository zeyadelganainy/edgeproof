// EdgeProof — Preprod entry point. Restores the funded wallet from .secrets and runs the demo.
// Requires a proof server on 127.0.0.1:6300 (docker compose -f proof-server.yml up).

import { readFileSync } from "node:fs";
import { PreprodConfig } from "./config.js";
import { repoPath, runDemo } from "./run.js";

function readSeed(): string {
  const txt = readFileSync(repoPath(".secrets/preprod-wallet.txt"), "utf8");
  const m = txt.match(/^SEED=([0-9a-fA-F]+)/m);
  if (!m) throw new Error("SEED not found in .secrets/preprod-wallet.txt");
  return m[1]!;
}

runDemo(new PreprodConfig(), readSeed(), "Preprod")
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\nFATAL:", e instanceof Error ? (e.stack ?? e.message) : e);
    process.exit(1);
  });
