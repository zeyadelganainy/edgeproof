// Client-side preview of a trader's canonical trade file. The file is read locally in the
// browser and never uploaded — this just shows the trader what their own log would prove.

export type PreviewTrade = { pnlDeciPips: number; valid: boolean };

export type Preview = {
  realCount: number;
  winRatePct: number;
  netPips: number;
  maxDrawdownPips: number;
};

export function parseTrades(text: string): PreviewTrade[] {
  const raw = JSON.parse(text) as { trades?: unknown };
  if (!Array.isArray(raw.trades)) {
    throw new Error('Expected a { "trades": [...] } object in the canonical schema.');
  }
  return raw.trades.map((t, i) => {
    const rec = t as { pnlDeciPips?: unknown; valid?: unknown };
    if (typeof rec.pnlDeciPips !== "number" || typeof rec.valid !== "boolean") {
      throw new Error(`Trade ${i + 1}: needs a numeric "pnlDeciPips" and a boolean "valid".`);
    }
    return { pnlDeciPips: rec.pnlDeciPips, valid: rec.valid };
  });
}

export function computePreview(trades: PreviewTrade[]): Preview {
  const real = trades.filter((t) => t.valid);
  let cum = 0;
  let peak = 0;
  let maxDd = 0;
  let wins = 0;
  for (const t of real) {
    if (t.pnlDeciPips > 0) wins += 1;
    cum += t.pnlDeciPips;
    if (cum > peak) peak = cum;
    const dd = peak - cum;
    if (dd > maxDd) maxDd = dd;
  }
  return {
    realCount: real.length,
    winRatePct: real.length ? (wins / real.length) * 100 : 0,
    netPips: cum / 10,
    maxDrawdownPips: maxDd / 10,
  };
}
