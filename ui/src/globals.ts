// Node-compatibility shims some midnight-js dependencies expect in the browser.
// Imported first in main.tsx, before any midnight-js module.
import { Buffer } from "buffer";

if (typeof globalThis.Buffer === "undefined") {
  globalThis.Buffer = Buffer;
}
// Some libraries read process.env.NODE_ENV.
const g = globalThis as unknown as { process?: { env?: Record<string, string> } };
if (typeof g.process === "undefined") {
  g.process = { env: { NODE_ENV: import.meta.env.MODE } };
} else if (typeof g.process.env === "undefined") {
  g.process.env = { NODE_ENV: import.meta.env.MODE };
}
