import { setNetworkId } from "@midnight-ntwrk/midnight-js/network-id";

export type Net = "standalone" | "preprod";

export const NETWORKS: Record<Net, { label: string; networkId: string; indexer: string; indexerWS: string }> = {
  standalone: {
    label: "Standalone",
    networkId: "undeployed",
    indexer: "http://127.0.0.1:8088/api/v3/graphql",
    indexerWS: "ws://127.0.0.1:8088/api/v3/graphql/ws",
  },
  preprod: {
    label: "Preprod",
    networkId: "preprod",
    indexer: "https://indexer.preprod.midnight.network/api/v3/graphql",
    indexerWS: "wss://indexer.preprod.midnight.network/api/v3/graphql/ws",
  },
};

export function applyNetwork(net: Net): void {
  setNetworkId(NETWORKS[net].networkId as Parameters<typeof setNetworkId>[0]);
}
