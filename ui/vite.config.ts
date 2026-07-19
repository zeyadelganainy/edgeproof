import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

// midnight-js runs WebAssembly and expects a couple of Node globals in the browser.
// Buffer/process are provided by src/globals.ts (imported first in main.tsx); the WASM +
// top-level-await plugins handle the on-chain runtime. Modeled on example-bboard.
export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait()],
  define: { global: "globalThis" },
  build: { target: "esnext" },
  optimizeDeps: {
    esbuildOptions: { target: "esnext" },
    exclude: ["@midnight-ntwrk/onchain-runtime-v3"],
  },
  resolve: {
    alias: {
      // Browser has a native WebSocket; isomorphic-ws's browser build lacks a named export.
      "isomorphic-ws": fileURLToPath(new URL("./src/ws-shim.ts", import.meta.url)),
    },
    extensions: [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json", ".wasm"],
    mainFields: ["browser", "module", "main"],
  },
});
