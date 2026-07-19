// Live read of an EdgeProof contract's public ledger, straight from a Midnight indexer.
// The on-chain ledger holds only the commitment + the three proven flags and thresholds —
// it does NOT record which transaction settled each claim. Those tx hashes are captured by
// the CLI at prove-time and written to /card.json. When the looked-up contract matches that
// receipt, we enrich the live claims with their real settlement tx + block so they're
// clickable on the card. The verified/commitment data is always the live ledger read.

import { EdgeProof } from "@edgeproof/contract";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { toHex } from "@midnight-ntwrk/midnight-js/utils";
import { NETWORKS, applyNetwork, type Net } from "./config";
import type { CardData, Claim } from "../PerformanceCard";

async function settlementReceipts(
  contract: string,
): Promise<Array<{ txId?: string; block?: number }> | null> {
  try {
    const r = await fetch("/card.json", { cache: "no-store" });
    if (!r.ok) return null;
    const receipt = (await r.json()) as {
      contract?: string;
      claims?: Array<{ txId?: string; block?: number }>;
    };
    if (!receipt?.contract || receipt.contract.toLowerCase() !== contract.toLowerCase()) return null;
    return Array.isArray(receipt.claims) ? receipt.claims : null;
  } catch {
    return null;
  }
}

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

  // Order matches the CLI receipt: [net PnL, win rate, max drawdown].
  const claims: Claim[] = [
    { label: "Net profit & loss is positive", sub: "net ≥ 0", verified: led.netPnlProven },
    { label: `Win rate is at least ${wr}%`, sub: `win rate ≥ ${wr}%`, verified: led.winRateProven },
    {
      label: `Maximum drawdown within ${ddPips} pips`,
      sub: `max drawdown ≤ ${ddPips} pips`,
      verified: led.maxDrawdownProven,
    },
  ];

  const receipts = await settlementReceipts(contract);
  if (receipts) {
    for (let i = 0; i < claims.length; i++) {
      const r = receipts[i];
      if (r?.txId) {
        claims[i].txId = r.txId;
        if (typeof r.block === "number") claims[i].block = r.block;
      }
    }
  }

  return {
    network: networkLabel,
    chain: "Midnight",
    contract,
    commitment: toHex(led.commitment),
    dataset: "On-chain",
    instrument: "Committed trade log",
    claims,
  };
}

export async function readLiveCard(net: Net, contract: string): Promise<CardData> {
  applyNetwork(net);
  const cfg = NETWORKS[net];
  return readCardAt(cfg.indexer, cfg.indexerWS, cfg.label, contract);
}
