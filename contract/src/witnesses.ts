// EdgeProof private state + witness implementations.
//
// The witnesses hand the Compact circuits the private trade log, the commitment salt,
// and pre-computed running prefix arrays (equity, valid count, win count). None of these
// are ever disclosed; only the circuits' explicit disclose()s reach the public ledger.

import type { WitnessContext } from "@midnight-ntwrk/compact-runtime";
import type { Ledger } from "./managed/edgeproof/contract/index.js";

// Kept in sync with contract constants (edgeproof.compact) and scripts/types.ts.
export const BIAS = 10000n; // pnlEnc = pnlDeciPips + BIAS
export const OFFSET = 100000n; // equity curve baseline (keeps it non-negative)
export const N = 32; // padded trade-vector size

export type CircuitTrade = { pnlEnc: bigint; valid: boolean; openTime: bigint };

export type EdgeProofPrivateState = {
  readonly trades: CircuitTrade[]; // length N
  readonly salt: Uint8Array; // 32 bytes
  readonly equityOff: bigint[]; // length N+1, index 0 = OFFSET
  readonly cumValid: bigint[]; // length N+1, index 0 = 0
  readonly cumWins: bigint[]; // length N+1, index 0 = 0
  readonly peakOff: bigint[]; // length N+1, index 0 = OFFSET (running high-water mark)
};

export const witnesses = {
  tradeLog: ({
    privateState,
  }: WitnessContext<Ledger, EdgeProofPrivateState>): [EdgeProofPrivateState, CircuitTrade[]] => [
    privateState,
    privateState.trades,
  ],
  commitmentSalt: ({
    privateState,
  }: WitnessContext<Ledger, EdgeProofPrivateState>): [EdgeProofPrivateState, Uint8Array] => [
    privateState,
    privateState.salt,
  ],
  equityOff: ({
    privateState,
  }: WitnessContext<Ledger, EdgeProofPrivateState>): [EdgeProofPrivateState, bigint[]] => [
    privateState,
    privateState.equityOff,
  ],
  cumValid: ({
    privateState,
  }: WitnessContext<Ledger, EdgeProofPrivateState>): [EdgeProofPrivateState, bigint[]] => [
    privateState,
    privateState.cumValid,
  ],
  cumWins: ({
    privateState,
  }: WitnessContext<Ledger, EdgeProofPrivateState>): [EdgeProofPrivateState, bigint[]] => [
    privateState,
    privateState.cumWins,
  ],
  peakOff: ({
    privateState,
  }: WitnessContext<Ledger, EdgeProofPrivateState>): [EdgeProofPrivateState, bigint[]] => [
    privateState,
    privateState.peakOff,
  ],
};

// The subset of a dataset TradeRecord (scripts/types.ts) that the circuit needs.
export type DatasetTrade = { pnlDeciPips: number; valid: boolean; openUnix: number };

/**
 * Project a dataset's padded trade array into circuit private state:
 *  - encode signed P&L as unsigned pnlEnc = pnlDeciPips + BIAS
 *  - build the OFFSET-biased running-equity prefix and the valid/win count prefixes
 *    (all length N+1: index 0 is the baseline, index k is the value after k trades).
 */
export function buildPrivateState(datasetTrades: DatasetTrade[], salt: Uint8Array): EdgeProofPrivateState {
  if (datasetTrades.length !== N) {
    throw new Error(`expected ${N} padded trades, got ${datasetTrades.length}`);
  }
  const trades: CircuitTrade[] = datasetTrades.map((t) => ({
    pnlEnc: BigInt(t.pnlDeciPips) + BIAS,
    valid: t.valid,
    openTime: t.valid ? BigInt(t.openUnix) : 0n,
  }));

  const equityOff: bigint[] = [OFFSET];
  const cumValid: bigint[] = [0n];
  const cumWins: bigint[] = [0n];
  const peakOff: bigint[] = [OFFSET];
  let eq = OFFSET;
  let peak = OFFSET;
  let nValid = 0n;
  let nWins = 0n;
  for (let i = 0; i < N; i++) {
    const t = datasetTrades[i]!;
    if (t.valid) {
      eq += BigInt(t.pnlDeciPips);
      nValid += 1n;
      if (t.pnlDeciPips > 0) nWins += 1n;
    }
    if (eq > peak) peak = eq;
    equityOff.push(eq);
    cumValid.push(nValid);
    cumWins.push(nWins);
    peakOff.push(peak);
  }

  return { trades, salt, equityOff, cumValid, cumWins, peakOff };
}
