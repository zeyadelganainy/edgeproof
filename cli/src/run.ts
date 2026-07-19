// Shared EdgeProof runner: deploy the contract committed to a trade log, prove the three
// claims with real ZK proofs (timed), then print + emit the verified performance card read
// back from the public ledger. Used by the standalone and preprod entry points.
//
// Bring-your-own-trades:
//   npm --workspace cli run standalone -- --file ./my-trades.json --win-rate 55 --max-dd 80 --min-net 0
// The file is the canonical dataset JSON (scripts/types.ts shape); thresholds are optional.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createLogger } from "./logger.js";
import * as api from "./api.js";
import { buildPrivateState, type DatasetTrade } from "@edgeproof/contract";
import { toHex } from "@midnight-ntwrk/midnight-js/utils";
import type { Config } from "./config.js";

// Fixed demo salt. Real deployments would use a random, saved salt.
const SALT = new Uint8Array(32).fill(7);
const DIV = "─".repeat(62);

export function repoPath(rel: string): string {
  return fileURLToPath(new URL(`../../${rel}`, import.meta.url));
}

export function loadTrades(name: string): DatasetTrade[] {
  const ds = JSON.parse(readFileSync(repoPath(`data/${name}`), "utf8")) as { trades: DatasetTrade[] };
  return ds.trades;
}

type LoadedDataset = { trades: DatasetTrade[]; label: string; instrument: string };

function loadDataset(p: string): LoadedDataset {
  const raw = JSON.parse(readFileSync(p, "utf8")) as {
    trades?: DatasetTrade[];
    meta?: { label?: string; symbol?: string; session?: string };
  };
  if (!Array.isArray(raw.trades)) {
    throw new Error(`${p}: expected a { "meta": {...}, "trades": [...] } object (see scripts/types.ts).`);
  }
  const meta = raw.meta ?? {};
  const realCount = raw.trades.filter((t) => t.valid).length;
  const label = meta.label ?? "COMMITTED LOG";
  const instrument = meta.symbol
    ? `${meta.symbol}${meta.session ? ` · ${meta.session}` : ""} · ${realCount} trades`
    : `Committed trade log · ${realCount} trades`;
  return { trades: raw.trades, label, instrument };
}

export type RunOpts = {
  datasetPath: string;
  minNetDeciPips: bigint;
  winRatePct: bigint;
  maxDdDeciPips: bigint;
};

export function parseRunArgs(): RunOpts {
  const argv = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const file = get("--file");
  let datasetPath: string;
  if (!file) {
    datasetPath = repoPath("data/demo_pass.json");
  } else if (path.isAbsolute(file)) {
    datasetPath = file;
  } else {
    // Accept a path relative to the shell's cwd or to the repo root, whichever exists.
    const fromCwd = path.resolve(process.cwd(), file);
    datasetPath = existsSync(fromCwd) ? fromCwd : repoPath(file);
  }
  const minNetPips = Number(get("--min-net") ?? "0");
  const winRatePct = BigInt(get("--win-rate") ?? "50");
  const maxDdPips = Number(get("--max-dd") ?? "100");
  return {
    datasetPath,
    minNetDeciPips: BigInt(Math.round(minNetPips * 10)),
    winRatePct,
    maxDdDeciPips: BigInt(Math.round(maxDdPips * 10)),
  };
}

async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const t0 = Date.now();
  const r = await api.withStatus(label, fn);
  console.log(`      ⏱  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  return r;
}

type ProvenClaim = { label: string; sub: string; verified: boolean; txId?: string; block?: number };

// Prove one claim; if the data doesn't support it the assertion fires — mark it not-proven and continue.
async function proveClaim(
  label: string,
  sub: string,
  attempt: () => Promise<{ txId: string; blockHeight: bigint | number }>,
): Promise<ProvenClaim> {
  try {
    const tx = await timed(`Proving  ${label}`, attempt);
    return { label, sub, verified: true, txId: tx.txId, block: Number(tx.blockHeight) };
  } catch {
    console.log(`      ✗ not provable — the committed trades don't meet this threshold`);
    return { label, sub, verified: false };
  }
}

export async function runDemo(
  config: Config,
  seed: string,
  network: string,
  opts: RunOpts = parseRunArgs(),
): Promise<void> {
  const logger = createLogger();
  api.setLogger(logger);

  const { trades, label, instrument } = loadDataset(opts.datasetPath);
  const wr = opts.winRatePct;
  const ddPips = Number(opts.maxDdDeciPips) / 10;
  const netPips = Number(opts.minNetDeciPips) / 10;

  console.log(`\n${DIV}\n  EdgeProof — ${network} deploy + prove          [${label}]\n${DIV}`);
  console.log(`  Source: ${opts.datasetPath}\n`);

  const walletCtx = await api.buildWalletAndWaitForFunds(config, seed);
  const providers = await api.withStatus("Configuring providers", () => api.configureProviders(walletCtx, config));

  const ps = buildPrivateState(trades, SALT);

  const contract = await timed("Deploying EdgeProof contract", () => api.deploy(providers, ps));
  const address = contract.deployTxData.public.contractAddress;

  await timed("Committing private trade log (salted hash)", () => api.commit(contract));

  const netClaim = await proveClaim(
    netPips > 0 ? `net PnL ≥ ${netPips} pips` : "net PnL positive",
    netPips > 0 ? `net ≥ ${netPips} pips` : "net ≥ 0",
    () => api.proveNetPnL(contract, opts.minNetDeciPips),
  );
  const winClaim = await proveClaim(`win rate ≥ ${wr}%`, `win rate ≥ ${wr}%`, () =>
    api.proveWinRate(contract, opts.winRatePct),
  );
  const ddClaim = await proveClaim(`max drawdown ≤ ${ddPips} pips`, `max drawdown ≤ ${ddPips} pips`, () =>
    api.proveMaxDrawdown(contract, opts.maxDdDeciPips),
  );

  const led = await api.getEdgeProofLedgerState(providers, address);
  if (led == null) throw new Error("could not read contract ledger state");

  const claims: ProvenClaim[] = [
    { ...netClaim, label: "Net profit & loss is positive", sub: netClaim.sub },
    { ...winClaim, label: `Win rate is at least ${wr}%` },
    { ...ddClaim, label: `Maximum drawdown within ${ddPips} pips` },
  ];

  console.log(`\n${DIV}`);
  console.log(`  EdgeProof — Verified Performance Card        [${label}]`);
  console.log(DIV);
  console.log(`  Network    : ${network}`);
  console.log(`  Contract   : ${address}`);
  console.log(`  Commitment : ${toHex(led.commitment)}`);
  console.log(DIV);
  for (const c of claims) {
    console.log(`  ${c.label.padEnd(34)}: ${c.verified ? "✓ VERIFIED" : "— not proven"}`);
  }
  console.log(DIV);
  console.log(`  Proven in zero-knowledge on Midnight - no trade was revealed.`);
  console.log(`${DIV}\n`);

  const card = {
    network,
    chain: "Midnight",
    contract: address,
    commitment: toHex(led.commitment),
    dataset: label,
    instrument,
    provenAt: new Date().toISOString(),
    claims,
  };
  try {
    writeFileSync(repoPath("ui/public/card.json"), JSON.stringify(card, null, 2) + "\n", "utf8");
    console.log(`  card data written -> ui/public/card.json\n`);
  } catch {
    /* ui/ may not exist yet; non-fatal */
  }

  await walletCtx.wallet.stop();
}

// Soundness demo: the SAME circuit refuses to prove a false claim on the losing dataset.
export async function runFailDemo(config: Config, seed: string, network: string): Promise<void> {
  const logger = createLogger();
  api.setLogger(logger);

  console.log(`\n${DIV}\n  EdgeProof — Soundness check (demo_fail)      [DEMO DATASET]\n${DIV}\n`);

  const walletCtx = await api.buildWalletAndWaitForFunds(config, seed);
  const providers = await api.withStatus("Configuring providers", () => api.configureProviders(walletCtx, config));

  const ps = buildPrivateState(loadTrades("demo_fail.json"), SALT);

  const contract = await timed("Deploying contract (committed to demo_fail)", () => api.deploy(providers, ps));
  await timed("Committing losing trade log", () => api.commit(contract));

  console.log(`\n  Attempting to prove 'net PnL positive' on a net-negative log...`);
  try {
    await api.proveNetPnL(contract, 0n);
    console.log(`  ✗ UNEXPECTED: the proof succeeded — soundness violated!`);
    process.exitCode = 1;
  } catch (e) {
    const msg = e instanceof Error ? (e.message.split("\n")[0] ?? e.message) : String(e);
    console.log(`\n${DIV}`);
    console.log(`  ✓ REJECTED — the circuit will not prove a false claim.`);
    console.log(`    reason: ${msg}`);
    console.log(`${DIV}\n`);
  }

  await walletCtx.wallet.stop();
}
