// TradingView "List of Trades" CSV → EdgeProof canonical dataset JSON.
//
//   npm run adapt:tradingview -- <input.csv> <output.json> [--symbol GBPUSD] [--pip-size 0.0001] [--session "London"]
//
// TradingView's Strategy Tester "List of Trades" export lists each closed trade as two rows —
// an Entry row (Type "Entry long"/"Entry short") and an Exit row (Type "Exit long"/"Exit short") —
// grouped by "Trade #". We pair them, derive signed pips from the entry/exit prices, and pad the
// result to the circuit's fixed size (N). Up to N real trades are supported.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { N, DECIPIPS_PER_PIP, type Dataset, type TradeRecord, type Direction } from "../types.js";

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim().length > 0);
  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = !inQ;
      } else if (ch === "," && !inQ) {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
    out.push(cur);
    return out.map((c) => c.trim());
  };
  const headers = parseLine(lines[0] ?? "").map((h) => h.toLowerCase());
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

function arg(flag: string, fallback: string): string {
  const argv = process.argv.slice(2);
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] ? argv[i + 1]! : fallback;
}

function num(s: string | undefined): number {
  if (s == null) return NaN;
  return Number(s.replace(/[",\s]/g, "").replace(/[^0-9.eE+-]/g, ""));
}

function main(): void {
  const argv = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const input = argv[0];
  const output = argv[1];
  if (!input || !output) {
    console.error("usage: npm run adapt:tradingview -- <input.csv> <output.json> [--symbol GBPUSD] [--pip-size 0.0001] [--session \"London\"]");
    process.exit(1);
  }
  const symbol = arg("--symbol", "GBPUSD");
  const pipSize = Number(arg("--pip-size", "0.0001"));
  const session = arg("--session", "imported");

  const { headers, rows } = parseCsv(readFileSync(input, "utf8"));
  const idx = (...names: string[]): number => {
    for (const n of names) {
      const i = headers.findIndex((h) => h.includes(n));
      if (i >= 0) return i;
    }
    return -1;
  };
  const cType = idx("type");
  const cTrade = idx("trade #", "trade#", "trade number", "trade");
  const cPrice = idx("price");
  const cTime = idx("date/time", "date", "time");
  if (cType < 0 || cPrice < 0) {
    throw new Error(`Could not find "Type" and "Price" columns in the CSV header: ${headers.join(", ")}`);
  }

  // Group rows by trade number (fall back to sequential pairs of 2).
  const groups = new Map<string, string[][]>();
  rows.forEach((row, i) => {
    const key = cTrade >= 0 ? row[cTrade] ?? String(Math.floor(i / 2)) : String(Math.floor(i / 2));
    const g = groups.get(key) ?? [];
    g.push(row);
    groups.set(key, g);
  });

  type Real = { direction: Direction; entry: number; exit: number; open: string; close: string };
  const reals: Real[] = [];
  for (const g of groups.values()) {
    const entryRow = g.find((r) => (r[cType] ?? "").toLowerCase().includes("entry"));
    const exitRow = g.find((r) => (r[cType] ?? "").toLowerCase().includes("exit"));
    if (!entryRow || !exitRow) continue;
    const typeStr = (entryRow[cType] ?? "").toLowerCase();
    const direction: Direction = typeStr.includes("short") ? "short" : "long";
    const entry = num(entryRow[cPrice]);
    const exit = num(exitRow[cPrice]);
    if (!Number.isFinite(entry) || !Number.isFinite(exit)) continue;
    reals.push({
      direction,
      entry,
      exit,
      open: cTime >= 0 ? entryRow[cTime] ?? "" : "",
      close: cTime >= 0 ? exitRow[cTime] ?? "" : "",
    });
  }

  // Oldest-first for a sensible equity curve; TradingView usually exports newest-first.
  reals.reverse();
  if (reals.length > N) {
    throw new Error(`Found ${reals.length} closed trades, but the circuit supports at most ${N}. Trim the export to ${N}.`);
  }

  const toUnix = (s: string): number => {
    const t = Date.parse(s);
    return Number.isNaN(t) ? 0 : Math.floor(t / 1000);
  };

  const trades: TradeRecord[] = reals.map((r, i) => {
    const dirSign = r.direction === "long" ? 1 : -1;
    const pips = ((r.exit - r.entry) / pipSize) * dirSign;
    const pnlDeciPips = Math.round(pips * DECIPIPS_PER_PIP);
    const openUnix = toUnix(r.open);
    return {
      id: i + 1,
      direction: r.direction,
      entryPrice: r.entry,
      exitPrice: r.exit,
      pips: pnlDeciPips / DECIPIPS_PER_PIP,
      pnlDeciPips,
      openTime: openUnix ? new Date(openUnix * 1000).toISOString() : "",
      closeTime: r.close && !Number.isNaN(Date.parse(r.close)) ? new Date(toUnix(r.close) * 1000).toISOString() : "",
      openUnix,
      valid: true,
    };
  });

  // Pad to N with inert padding rows (valid = false).
  for (let i = trades.length; i < N; i++) {
    trades.push({
      id: i + 1,
      direction: "long",
      entryPrice: 0,
      exitPrice: 0,
      pips: 0,
      pnlDeciPips: 0,
      openTime: new Date(0).toISOString(),
      closeTime: new Date(0).toISOString(),
      openUnix: 0,
      valid: false,
    });
  }

  const dataset: Dataset = {
    meta: {
      label: "IMPORTED",
      disclaimer: `Imported from a TradingView export (${input}). Verify the figures against your own records.`,
      generator: "edgeproof/scripts/adapters/tradingview-csv.ts",
      seed: 0,
      profile: "pass",
      symbol: symbol as "GBPUSD",
      session,
      realTrades: reals.length,
      paddedTo: N,
      decipipsPerPip: DECIPIPS_PER_PIP,
    },
    trades,
  };

  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(dataset, null, 2) + "\n", "utf8");
  console.log(`wrote ${output}: ${reals.length} real trades (padded to ${N}) from ${symbol}, pip size ${pipSize}`);
}

main();
