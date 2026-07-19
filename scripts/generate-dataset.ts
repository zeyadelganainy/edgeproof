// EdgeProof — seeded synthetic dataset generator.
//
// Produces two reproducible, clearly-labeled DEMO datasets that share one schema:
//   data/demo_pass.json — ~54% win rate, positive net P&L, survivable drawdown
//   data/demo_fail.json — ~43% win rate, NEGATIVE net P&L (worse R:R), deeper drawdown
//
// The same Compact circuit will mint a verified card for demo_pass and REJECT demo_fail.
// All numbers are synthetic and modeled on a GBPUSD London-session profile — NOT real results.
//
// Run: npm run gen   (or: npx tsx scripts/generate-dataset.ts)

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  computeMetrics,
  deciPipsToPips,
  DECIPIPS_PER_PIP,
  N,
  REAL_TRADES,
  type Dataset,
  type Direction,
  type Profile,
  type TradeRecord,
} from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");

// ---- Deterministic PRNG (mulberry32) --------------------------------------
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- Per-profile parameters ------------------------------------------------
// outcomes: fixed W/L sequence (length REAL_TRADES) with deliberate losing streaks
// so the drawdown claim has something real to measure.
interface ProfileParams {
  seed: number;
  outcomes: string;
  winPips: number; // mean win magnitude (pips)
  lossPips: number; // mean loss magnitude (pips)
  jitterPct: number; // +/- magnitude jitter
}

const PROFILES: Record<Profile, ProfileParams> = {
  // 15W / 13L = 53.6% WR; 1:2 R:R -> comfortably net positive. Streaks: 4 (idx 5-8), 3 (idx 17-19).
  pass: {
    seed: 1337,
    outcomes: "WWLWWLLLLWWWLWLWWLLLWWLWWWLL",
    winPips: 30,
    lossPips: 15,
    jitterPct: 0.25,
  },
  // 12W / 16L = 42.9% WR; ~1:1 R:R (cuts winners, lets losers run) -> net NEGATIVE.
  // Streaks: 5 (idx 4-8), 3 (idx 12-14), 3 (idx 20-22).
  fail: {
    seed: 4242,
    outcomes: "WLLWLLLLLWLWLLLWWLLWLLLWWWWW",
    winPips: 18,
    lossPips: 20,
    jitterPct: 0.25,
  },
};

// ---- Weekday session-time walker ------------------------------------------
// Places REAL_TRADES trades on London-session weekdays across ~6 weeks, deterministically.
const BACKTEST_START = Date.UTC(2026, 4, 26, 0, 0, 0); // 2026-05-26, month is 0-indexed; ~6 weeks ending before "today" 2026-07-17

function isWeekend(ms: number): boolean {
  const day = new Date(ms).getUTCDay(); // 0 = Sun, 6 = Sat
  return day === 0 || day === 6;
}

function nextWeekday(ms: number): number {
  let d = ms;
  do {
    d += 24 * 3600 * 1000;
  } while (isWeekend(d));
  return d;
}

// ---- Build one dataset -----------------------------------------------------
function buildDataset(profile: Profile): Dataset {
  const p = PROFILES[profile];
  if (p.outcomes.length !== REAL_TRADES) {
    throw new Error(`${profile}: outcomes length ${p.outcomes.length} !== REAL_TRADES ${REAL_TRADES}`);
  }
  const winCount = [...p.outcomes].filter((c) => c === "W").length;
  const lossCount = REAL_TRADES - winCount;

  const rng = mulberry32(p.seed);
  const trades: TradeRecord[] = [];

  let dayCursor = BACKTEST_START;
  let px = 1.27; // GBPUSD starting price for the gentle random walk

  for (let i = 0; i < REAL_TRADES; i++) {
    const isWin = p.outcomes[i] === "W";

    // Magnitude with seeded jitter, snapped to deci-pip resolution.
    const base = isWin ? p.winPips : p.lossPips;
    const jitter = (rng() * 2 - 1) * p.jitterPct; // in [-jitterPct, +jitterPct]
    const mag = base * (1 + jitter);
    const pnlDeciPips = Math.round((isWin ? mag : -mag) * DECIPIPS_PER_PIP);
    const pips = deciPipsToPips(pnlDeciPips); // exact, derived back from the integer

    // Direction (seeded) and consistent entry/exit prices.
    const direction: Direction = rng() < 0.5 ? "long" : "short";
    px += (rng() - 0.5) * 0.004; // random walk step
    const entryPrice = round5(px);
    // For a long, +pips => higher exit; for a short, +pips => lower exit.
    const exitPrice = round5(entryPrice + (direction === "long" ? 1 : -1) * pips * 0.0001);

    // Advance to a weekday and pick an entry time in 07:00-10:59 UTC; hold 30-180 min.
    if (i > 0) {
      // Mostly 1 weekday, occasionally 2 (seeded), so 28 trades span ~6 weeks of weekdays.
      dayCursor = nextWeekday(dayCursor);
      if (rng() < 0.15) dayCursor = nextWeekday(dayCursor);
    } else {
      if (isWeekend(dayCursor)) dayCursor = nextWeekday(dayCursor);
    }
    const day = new Date(dayCursor);
    const hour = 7 + Math.floor(rng() * 4); // 7,8,9,10
    const minute = Math.floor(rng() * 60);
    const openMs = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hour, minute, 0);
    const durationMin = 30 + Math.floor(rng() * 151); // 30..180
    const closeMs = openMs + durationMin * 60 * 1000;

    trades.push({
      id: i + 1,
      direction,
      entryPrice,
      exitPrice,
      pips,
      pnlDeciPips,
      openTime: new Date(openMs).toISOString(),
      closeTime: new Date(closeMs).toISOString(),
      openUnix: Math.floor(openMs / 1000),
      valid: true,
    });
  }

  // Padding slots (indices REAL_TRADES..N-1): valid=false, zero P&L, epoch times.
  for (let i = REAL_TRADES; i < N; i++) {
    trades.push({
      id: i + 1,
      direction: "long",
      entryPrice: 0,
      exitPrice: 0,
      pips: 0,
      pnlDeciPips: 0,
      openTime: new Date(0).toISOString(),
      closeTime: new Date(0).toISOString(),
      openUnix: 0,
      valid: false,
    });
  }

  const dataset: Dataset = {
    meta: {
      label: "DEMO DATASET",
      disclaimer:
        "Synthetic data generated for demonstration only. Modeled on a GBPUSD London-session strategy profile. NOT real trading results.",
      generator: "edgeproof/scripts/generate-dataset.ts",
      seed: p.seed,
      profile,
      symbol: "GBPUSD",
      session: "London 07:00-11:00 UTC",
      realTrades: REAL_TRADES,
      paddedTo: N,
      decipipsPerPip: DECIPIPS_PER_PIP,
    },
    trades,
  };

  // Sanity: exact win/loss counts landed as intended.
  const actualWins = trades.filter((t) => t.valid && t.pnlDeciPips > 0).length;
  if (actualWins !== winCount) {
    throw new Error(`${profile}: expected ${winCount} wins but produced ${actualWins}`);
  }
  void lossCount;

  return dataset;
}

function round5(x: number): number {
  return Math.round(x * 1e5) / 1e5;
}

// ---- Verification print ----------------------------------------------------
function report(dataset: Dataset): void {
  const m = computeMetrics(dataset.trades);
  const first = dataset.trades[0]!;
  const last = dataset.trades[REAL_TRADES - 1]!;
  console.log(`\n=== ${dataset.meta.profile.toUpperCase()} (seed ${dataset.meta.seed}) ===`);
  console.log(`  real trades      : ${m.realCount}  (padded to ${N})`);
  console.log(`  window           : ${first.openTime}  ->  ${last.closeTime}`);
  console.log(`  wins / losses    : ${m.wins} / ${m.realCount - m.wins}`);
  console.log(`  win rate         : ${m.winRatePct.toFixed(1)}%   (claim >= 50%: ${m.winRatePct >= 50 ? "PASS" : "FAIL"})`);
  console.log(
    `  net P&L          : ${m.netDeciPips} deci-pips = ${deciPipsToPips(m.netDeciPips).toFixed(1)} pips   (claim > 0: ${m.netDeciPips > 0 ? "PASS" : "FAIL"})`,
  );
  console.log(
    `  max drawdown     : ${m.maxDrawdownDeciPips} deci-pips = ${deciPipsToPips(m.maxDrawdownDeciPips).toFixed(1)} pips`,
  );
}

// ---- Main ------------------------------------------------------------------
function main(): void {
  mkdirSync(DATA_DIR, { recursive: true });
  const built: Dataset[] = [];
  for (const profile of ["pass", "fail"] as Profile[]) {
    const ds = buildDataset(profile);
    const outPath = join(DATA_DIR, `demo_${profile}.json`);
    writeFileSync(outPath, JSON.stringify(ds, null, 2) + "\n", "utf8");
    console.log(`wrote ${outPath}`);
    built.push(ds);
  }
  for (const ds of built) report(ds);

  // Suggest a drawdown threshold that separates pass from fail.
  const passDD = computeMetrics(built[0]!.trades).maxDrawdownDeciPips;
  const failDD = computeMetrics(built[1]!.trades).maxDrawdownDeciPips;
  console.log(
    `\nmax-drawdown separation: pass=${deciPipsToPips(passDD).toFixed(1)} pips, fail=${deciPipsToPips(failDD).toFixed(1)} pips`,
  );
  if (failDD > passDD) {
    const mid = Math.round((passDD + failDD) / 2);
    console.log(
      `  -> a threshold near ${deciPipsToPips(mid).toFixed(1)} pips would let PASS through and REJECT FAIL.`,
    );
  } else {
    console.log(`  -> WARNING: fail drawdown is not larger than pass; revisit profile params.`);
  }
}

main();
