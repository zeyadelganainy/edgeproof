// Live read of an EdgeProof contract's public ledger, straight from a Midnight indexer.
// The on-chain ledger holds only the commitment + the three proven flags and thresholds —
// so a live card shows exactly what is public, without the (off-chain) tx references.

import { EdgeProof } from "@edgeproof/contract";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { toHex } from "@midnight-ntwrk/midnight-js/utils";
import { NETWORKS, applyNetwork, type Net } from "./config";
import type { CardData } from "../PerformanceCard";

export async function readCardAt(
  indexer: string,
  indexerWS: string,
  networkLabel: string,
  contract: string,
): Promise<CardData> {
  const provider = indexerPublicDataProvider(indexer, indexerWS);
  const state = await provider.queryContractState(contract);
  if (state == null) {
    throw new Error(`No contract found at that address on ${networkLabel}.`);
  }

  const led = EdgeProof.ledger(state.data);
  const wr = Number(led.winRateThresholdPct);
  const ddPips = Number(led.maxDrawdownThresholdDeciPips) / 10;

  return {
    network: networkLabel,
    chain: "Midnight",
    contract,
    commitment: toHex(led.commitment),
    dataset: "On-chain",
    instrument: "Committed trade log",
    claims: [
      { label: "Net profit & loss is positive", sub: "net ≥ 0", verified: led.netPnlProven },
      { label: `Win rate is at least ${wr}%`, sub: `win rate ≥ ${wr}%`, verified: led.winRateProven },
      { label: `Maximum drawdown within ${ddPips} pips`, sub: `max drawdown ≤ ${ddPips} pips`, verified: led.maxDrawdownProven },
    ],
  };
}

export async function readLiveCard(net: Net, contract: string): Promise<CardData> {
  applyNetwork(net);
  const cfg = NETWORKS[net];
  return readCardAt(cfg.indexer, cfg.indexerWS, cfg.label, contract);
}
