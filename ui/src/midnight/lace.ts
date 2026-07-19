// Midnight Lace wallet connection via the dapp-connector API (modeled on example-bboard).
//
// Lace won't reveal its network before connecting, and connect(networkId) rejects on a
// network mismatch — so we try the likely networks and adopt whichever one connects,
// then use the wallet's own reported network id + indexer for everything downstream.

import "@midnight-ntwrk/dapp-connector-api";
import semver from "semver";
import { setNetworkId } from "@midnight-ntwrk/midnight-js/network-id";

const COMPATIBLE_API = "4.x";
const CANDIDATE_NETWORKS = ["preprod", "testnet-02", "testnet", "preview", "devnet", "undeployed"];

interface Configuration {
  indexerUri: string;
  indexerWsUri: string;
  networkId: string;
}
interface ConnectedAPI {
  getConfiguration(): Promise<Configuration>;
}
interface InitialAPI {
  apiVersion: string;
  connect(networkId: string): Promise<ConnectedAPI>;
}

function firstCompatibleWallet(): InitialAPI | undefined {
  const mn = (globalThis as unknown as { midnight?: Record<string, unknown> }).midnight;
  if (!mn) return undefined;
  return Object.values(mn).find(
    (w): w is InitialAPI =>
      !!w &&
      typeof w === "object" &&
      "apiVersion" in w &&
      typeof (w as InitialAPI).apiVersion === "string" &&
      semver.satisfies((w as InitialAPI).apiVersion, COMPATIBLE_API),
  );
}

export type LaceConnection = { network: string; indexer: string; indexerWS: string };

export async function connectLace(preferred: string): Promise<LaceConnection> {
  const wallet = firstCompatibleWallet();
  if (!wallet) {
    throw new Error("Midnight Lace wallet not found — install the extension and use Chrome.");
  }

  const order = [preferred, ...CANDIDATE_NETWORKS.filter((n) => n !== preferred)];
  let lastErr: unknown;
  for (const nid of order) {
    try {
      const api = await wallet.connect(nid);
      const cfg = await api.getConfiguration();
      const network = cfg.networkId || nid;
      setNetworkId(network as Parameters<typeof setNetworkId>[0]);
      return { network, indexer: cfg.indexerUri, indexerWS: cfg.indexerWsUri };
    } catch (e) {
      lastErr = e;
    }
  }
  const msg = lastErr instanceof Error ? lastErr.message : String(lastErr);
  throw new Error(`Lace connected but no supported network matched. Last error: ${msg}`);
}
