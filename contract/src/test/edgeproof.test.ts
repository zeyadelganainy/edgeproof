import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { EdgeProofSimulator } from "./edgeproof-simulator.js";
import { buildPrivateState, type DatasetTrade } from "../witnesses.js";

// Fixed non-zero salt for deterministic tests (real deploys use a random saved salt).
const SALT = new Uint8Array(32).fill(7);

function loadTrades(name: string): DatasetTrade[] {
  const p = fileURLToPath(new URL(`../../../data/${name}`, import.meta.url));
  const ds = JSON.parse(readFileSync(p, "utf8")) as { trades: DatasetTrade[] };
  return ds.trades;
}

describe("EdgeProof — net-PnL claim", () => {
  it("demo_pass: commit sets a non-zero commitment, then net PnL >= 0 proves", () => {
    const sim = new EdgeProofSimulator(buildPrivateState(loadTrades("demo_pass.json"), SALT));

    const afterCommit = sim.commit();
    expect(afterCommit.commitment.some((b) => b !== 0)).toBe(true);

    const afterProve = sim.proveNetPnL(0n);
    expect(afterProve.netPnlProven).toBe(true);
    expect(afterProve.netPnlThresholdDeciPips).toBe(0n);
  });

  it("demo_fail: net PnL >= 0 assertion fires — claim is rejected", () => {
    const sim = new EdgeProofSimulator(buildPrivateState(loadTrades("demo_fail.json"), SALT));
    sim.commit();
    expect(() => sim.proveNetPnL(0n)).toThrow();
  });

  it("binding: proving a claim before commit is rejected (recomputed hash != commitment)", () => {
    const sim = new EdgeProofSimulator(buildPrivateState(loadTrades("demo_pass.json"), SALT));
    expect(() => sim.proveNetPnL(0n)).toThrow();
  });
});

describe("EdgeProof — win-rate claim", () => {
  it("demo_pass: win rate (53.6%) >= 50% proves", () => {
    const sim = new EdgeProofSimulator(buildPrivateState(loadTrades("demo_pass.json"), SALT));
    sim.commit();
    const led = sim.proveWinRate(50n);
    expect(led.winRateProven).toBe(true);
    expect(led.winRateThresholdPct).toBe(50n);
  });

  it("demo_pass: win rate (53.6%) >= 54% is rejected (boundary)", () => {
    const sim = new EdgeProofSimulator(buildPrivateState(loadTrades("demo_pass.json"), SALT));
    sim.commit();
    expect(() => sim.proveWinRate(54n)).toThrow();
  });

  it("demo_fail: win rate (42.9%) >= 50% assertion fires — claim rejected", () => {
    const sim = new EdgeProofSimulator(buildPrivateState(loadTrades("demo_fail.json"), SALT));
    sim.commit();
    expect(() => sim.proveWinRate(50n)).toThrow();
  });
});

describe("EdgeProof — max-drawdown claim", () => {
  it("demo_pass: max drawdown (54.5 pips) <= 100 pips proves", () => {
    const sim = new EdgeProofSimulator(buildPrivateState(loadTrades("demo_pass.json"), SALT));
    sim.commit();
    const led = sim.proveMaxDrawdown(1000n); // 1000 deci-pips = 100 pips
    expect(led.maxDrawdownProven).toBe(true);
    expect(led.maxDrawdownThresholdDeciPips).toBe(1000n);
  });

  it("demo_pass: max drawdown (54.5 pips) <= 50 pips is rejected (boundary)", () => {
    const sim = new EdgeProofSimulator(buildPrivateState(loadTrades("demo_pass.json"), SALT));
    sim.commit();
    expect(() => sim.proveMaxDrawdown(500n)).toThrow(); // 500 deci-pips = 50 pips < 54.5
  });

  it("demo_fail: max drawdown (211.2 pips) <= 100 pips assertion fires — claim rejected", () => {
    const sim = new EdgeProofSimulator(buildPrivateState(loadTrades("demo_fail.json"), SALT));
    sim.commit();
    expect(() => sim.proveMaxDrawdown(1000n)).toThrow();
  });
});
