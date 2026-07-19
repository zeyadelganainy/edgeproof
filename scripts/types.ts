// EdgeProof — shared schema + constants.
// Single source of truth for the canonical dataset JSON <-> the Compact circuit.
// Imported by the generator today and (later) by the CLI witness provider.

export const N = 32; // padded circuit vector size (fixed-size circuit)
export const REAL_TRADES = 28; // number of real trades; the remaining (N - REAL_TRADES) are padding
export const DECIPIPS_PER_PIP = 10; // 1 pip = 10 deci-pips (integer scaling; no floats in the circuit)

// Compact has NO signed integer type -> unsigned bias/offset encoding.
// pnlEnc = pnlDeciPips + BIAS keeps per-trade P&L unsigned; BIAS must exceed the largest loss magnitude.
export const BIAS = 10_000; // deci-pips (== 1000 pips); dwarfs any single-trade loss here
// Cumulative equity is offset by OFFSET in the circuit; the offset cancels in (peak - equity).
export const OFFSET = 100_000; // deci-pips; dwarfs the worst cumulative drawdown here

export type Direction = "long" | "short";
export type Profile = "pass" | "fail";

// Canonical JSON record — the ONLY ingest schema, and the source for the performance card.
export interface TradeRecord {
  id: number;
  direction: Direction;
  entryPrice: number; // GBPUSD, 5 decimals
  exitPrice: number; // GBPUSD, 5 decimals
  pips: number; // signed P&L in pips, 1 decimal (e.g. 30.0, -15.0)
  pnlDeciPips: number; // signed integer deci-pips = round(pips * 10)
  openTime: string; // ISO-8601 UTC
  closeTime: string; // ISO-8601 UTC
  openUnix: number; // unix seconds (circuit-facing timestamp)
  valid: boolean; // true for real trades, false for padding slots
}

export interface DatasetMeta {
  label: "DEMO DATASET";
  disclaimer: string;
  generator: string;
  seed: number;
  profile: Profile;
  symbol: "GBPUSD";
  session: string;
  realTrades: number;
  paddedTo: number;
  decipipsPerPip: number;
}

export interface Dataset {
  meta: DatasetMeta;
  trades: TradeRecord[]; // length === N
}

// Circuit-facing projection of a single trade (what gets hashed + reduced in-circuit).
export interface CircuitTrade {
  pnlEnc: number; // pnlDeciPips + BIAS (unsigned)
  valid: 0 | 1;
  openTime: number; // unix seconds (0 for padding)
}

export function toCircuitTrade(t: TradeRecord): CircuitTrade {
  return {
    pnlEnc: t.pnlDeciPips + BIAS,
    valid: t.valid ? 1 : 0,
    openTime: t.valid ? t.openUnix : 0,
  };
}

// Signed metrics over the real trades — used for verification printing and (later) witness derivation.
export interface Metrics {
  realCount: number;
  wins: number;
  winRatePct: number; // wins / realCount * 100
  netDeciPips: number; // signed sum of pnlDeciPips over real trades
  maxDrawdownDeciPips: number; // absolute peak-to-trough of the cumulative equity curve (>= 0)
  equity: number[]; // signed cumulative equity after each real trade
  peak: number[]; // signed running high-water mark (baseline 0)
}

export function computeMetrics(trades: TradeRecord[]): Metrics {
  const real = trades.filter((t) => t.valid);
  let cum = 0;
  let hwm = 0; // high-water mark baseline is 0 (you can be underwater from the first trade)
  let maxDD = 0;
  let wins = 0;
  const equity: number[] = [];
  const peak: number[] = [];
  for (const t of real) {
    if (t.pnlDeciPips > 0) wins++;
    cum += t.pnlDeciPips;
    if (cum > hwm) hwm = cum;
    const dd = hwm - cum; // >= 0 by construction
    if (dd > maxDD) maxDD = dd;
    equity.push(cum);
    peak.push(hwm);
  }
  return {
    realCount: real.length,
    wins,
    winRatePct: (wins / real.length) * 100,
    netDeciPips: cum,
    maxDrawdownDeciPips: maxDD,
    equity,
    peak,
  };
}

export function deciPipsToPips(dp: number): number {
  return dp / DECIPIPS_PER_PIP;
}
