// isomorphic-ws's browser build doesn't provide a named `WebSocket` export, which the
// indexer provider imports. The browser has a native WebSocket — re-export it under both shapes.
const WS = globalThis.WebSocket;
export default WS;
export { WS as WebSocket };
