import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { PerformanceCard, type CardData } from "./PerformanceCard";
import { computePreview, parseTrades, type Preview } from "./preview";
import { readCardAt, readLiveCard } from "./midnight/read";
import { connectLace, type LaceConnection } from "./midnight/lace";
import { NETWORKS, applyNetwork, type Net } from "./midnight/config";

type Theme = "dark" | "light";
type View = "landing" | "check" | "lookup";

// A publicly-readable example card. Set this to the EdgeProof contract deployed on the
// default (public) network so the "see a proven example" link works from the deployed site.
// Left empty until the Preprod deploy lands — the link is hidden while empty.
const DEMO_CONTRACT = "";
const HAS_DEMO = DEMO_CONTRACT.trim().length > 0;
const DEFAULT_NET: Net = "preprod";

export function App() {
  const [view, setView] = useState<View>("landing");
  const [theme, setTheme] = useState<Theme>(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  );

  // Lookup path
  const [card, setCard] = useState<CardData | null>(null);
  const [net, setNet] = useState<Net>(DEFAULT_NET);
  const [contract, setContract] = useState("");
  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [lace, setLace] = useState<LaceConnection | null>(null);
  const [laceError, setLaceError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  // Check path
  const [preview, setPreview] = useState<(Preview & { fileName: string }) | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Keep the midnight libraries' global network id in sync with the selected network,
  // so wallet connect + reads don't hit a network-id mismatch.
  useEffect(() => {
    applyNetwork(net);
  }, [net]);

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const trades = parseTrades(await f.text());
      setPreview({ ...computePreview(trades), fileName: f.name });
      setPreviewError(null);
    } catch (err) {
      setPreview(null);
      setPreviewError(err instanceof Error ? err.message : String(err));
    }
  };

  const readLive = async () => {
    setReading(true);
    setReadError(null);
    try {
      const c = lace
        ? await readCardAt(lace.indexer, lace.indexerWS, lace.network, contract.trim())
        : await readLiveCard(net, contract.trim());
      setCard(c);
      setLive(true);
    } catch (e) {
      setReadError(e instanceof Error ? e.message : String(e));
    } finally {
      setReading(false);
    }
  };

  const doConnect = async () => {
    setConnecting(true);
    setLaceError(null);
    try {
      setLace(await connectLace(NETWORKS[net].networkId));
    } catch (e) {
      setLaceError(e instanceof Error ? e.message : String(e));
    } finally {
      setConnecting(false);
    }
  };

  const goDemo = () => {
    setContract(DEMO_CONTRACT);
    setNet(DEFAULT_NET);
    setReadError(null);
    setView("lookup");
  };

  return (
    <main className="stage">
      <div className="toolbar">
        <button className="ghost" type="button" onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}>
          {theme === "dark" ? "Light" : "Dark"} mode
        </button>
      </div>

      {view === "landing" ? (
        <Landing
          onCheck={() => setView("check")}
          onLookup={() => setView("lookup")}
          onDemo={goDemo}
          hasDemo={HAS_DEMO}
        />
      ) : null}

      {view === "check" ? (
        <section className="path" aria-label="Check my trades">
          <button className="backlink" type="button" onClick={() => setView("landing")}>
            ← Back
          </button>
          <header className="path-head">
            <h1 className="path-title">Check my trades</h1>
            <p className="path-sub">
              Load your canonical trade file. It's read locally in your browser — nothing is uploaded, ever.
            </p>
          </header>

          <div className="ingest">
            <label className="file-btn">
              Load a trade file
              <input type="file" accept=".json,application/json" onChange={handleFile} />
            </label>
            <span className="ingest-hint">Canonical JSON · your trades stay in your browser</span>
            {previewError ? <span className="err">{previewError}</span> : null}
          </div>

          {preview ? (
            <>
              <PreviewPanel preview={preview} />
              <PublishPanel fileName={preview.fileName} onLookup={() => setView("lookup")} />
            </>
          ) : (
            <p className="path-empty">
              No file yet. Export from your platform (or run the TradingView adapter) to get a canonical
              JSON, then load it here to see what it would prove.
            </p>
          )}
        </section>
      ) : null}

      {view === "lookup" ? (
        <section className="path" aria-label="Look up a contract">
          <button className="backlink" type="button" onClick={() => setView("landing")}>
            ← Back
          </button>
          <header className="path-head">
            <h1 className="path-title">Look up a contract</h1>
            <p className="path-sub">
              Paste an EdgeProof contract address to read its verified card straight from the Midnight ledger.
            </p>
          </header>

          <div className="controls">
            <div className="field">
              <label htmlFor="net">Network</label>
              <select
                id="net"
                value={net}
                onChange={(e) => {
                  setNet(e.target.value as Net);
                  setReadError(null);
                  setLaceError(null);
                  setLive(false);
                }}
              >
                <option value="preprod">Preprod (testnet)</option>
                <option value="standalone">Standalone (local)</option>
              </select>
            </div>
            <div className="field grow">
              <label htmlFor="addr">Contract address</label>
              <input id="addr" value={contract} spellCheck={false} placeholder="64-hex contract address" onChange={(e) => setContract(e.target.value)} />
            </div>
            <button className="btn" type="button" onClick={readLive} disabled={reading || contract.trim().length === 0}>
              {reading ? "Reading…" : "Read from chain"}
            </button>
            <button className="btn secondary" type="button" onClick={doConnect} disabled={connecting}>
              {connecting ? "Connecting…" : lace ? "Lace connected" : "Connect Lace"}
            </button>
          </div>

          <div className="controls-status" role="status">
            {live ? <span className="ok">● Live from {card?.network ?? NETWORKS[net].label}</span> : null}
            {lace ? <span className="ok">● Lace connected · {lace.network}</span> : null}
            {readError ? <span className="err">{readError}</span> : null}
            {laceError ? <span className="err">{laceError}</span> : null}
          </div>

          {card ? (
            <PerformanceCard card={card} />
          ) : (
            <p className="path-empty">
              Enter a contract address and read it back. The card shows only the commitment and the proven
              claims — the trades behind them stay private.
            </p>
          )}
        </section>
      ) : null}

      <div className="caption">EdgeProof · your edge, proven — never exposed</div>
    </main>
  );
}

function Landing({
  onCheck,
  onLookup,
  onDemo,
  hasDemo,
}: {
  onCheck: () => void;
  onLookup: () => void;
  onDemo: () => void;
  hasDemo: boolean;
}) {
  return (
    <section className="landing">
      <div className="hero">
        <div className="mark">
          EdgeProof<span className="dot">.</span>
        </div>
        <h1 className="hero-title">Prove your track record without revealing a trade.</h1>
        <p className="hero-sub">
          Commit a private trade log to Midnight and generate zero-knowledge proofs of your win rate, net
          P&amp;L, and drawdown. Only the proof goes public — never the trades.
        </p>
      </div>

      <div className="choices">
        <button className="choice is-check" type="button" onClick={onCheck}>
          <span className="choice-k">For traders</span>
          <span className="choice-t">Check my trades</span>
          <span className="choice-d">
            Load your trade file, preview what it proves, then publish a verified card on-chain. Your trades
            never leave your browser.
          </span>
          <span className="choice-go">Start</span>
        </button>

        <button className="choice is-lookup" type="button" onClick={onLookup}>
          <span className="choice-k">For anyone</span>
          <span className="choice-t">Look up a contract</span>
          <span className="choice-d">
            Paste a contract address to read its verified performance card straight from the Midnight ledger
            — trusting the math, not the trader.
          </span>
          <span className="choice-go">Verify</span>
        </button>
      </div>

      {hasDemo ? (
        <button className="demo-link" type="button" onClick={onDemo}>
          or see a proven example card →
        </button>
      ) : null}
    </section>
  );
}

function PreviewPanel({ preview }: { preview: Preview & { fileName: string } }) {
  return (
    <section className="preview" aria-label="Trade preview">
      <div className="preview-stats">
        <div className="pstat">
          <span className="pk">Trades</span>
          <span className="pv">{preview.realCount}</span>
        </div>
        <div className="pstat">
          <span className="pk">Win rate</span>
          <span className="pv">{preview.winRatePct.toFixed(1)}%</span>
        </div>
        <div className="pstat">
          <span className="pk">Net</span>
          <span className="pv">
            {preview.netPips >= 0 ? "+" : ""}
            {preview.netPips.toFixed(1)} pips
          </span>
        </div>
        <div className="pstat">
          <span className="pk">Max drawdown</span>
          <span className="pv">{preview.maxDrawdownPips.toFixed(1)} pips</span>
        </div>
      </div>
      <div className="preview-claims">
        <span className="pclaim-label">Provable at defaults</span>
        <span className={preview.netPips > 0 ? "yes" : "no"}>net &gt; 0</span>
        <span className={preview.winRatePct >= 50 ? "yes" : "no"}>win rate ≥ 50%</span>
        <span className={preview.maxDrawdownPips <= 100 ? "yes" : "no"}>drawdown ≤ 100 pips</span>
      </div>
    </section>
  );
}

function PublishPanel({ fileName, onLookup }: { fileName: string; onLookup: () => void }) {
  const cmd = `npm --workspace cli run preprod -- --file ./data/${fileName}`;
  return (
    <section className="publish" aria-label="Publish on-chain">
      <div className="publish-head">
        <span className="publish-badge">↑ on-chain</span>
        <div>
          <div className="publish-title">Publish this as a verified card</div>
          <p className="publish-sub">
            Proving runs on <b>your machine</b> so the trades never leave it. Run this once — it commits your
            log and posts a zero-knowledge proof for each claim to Midnight.
          </p>
        </div>
      </div>
      <CopyCmd cmd={cmd} />
      <p className="publish-note">
        It prints a <b>contract address</b>. Share it — anyone can paste it into{" "}
        <button className="linklike" type="button" onClick={onLookup}>
          Look up a contract
        </button>{" "}
        to confirm your claims against the ledger.
      </p>
    </section>
  );
}

function CopyCmd({ cmd }: { cmd: string }) {
  const [copied, setCopied] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(true);
      if (t.current) clearTimeout(t.current);
      t.current = setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked — the command is still visible to select manually */
    }
  };
  return (
    <button className="cmd" type="button" data-state={copied ? "copied" : "idle"} onClick={copy} title="Copy command">
      <span className="cmd-prompt">$</span>
      <code className="cmd-txt">{cmd}</code>
      <span className="cmd-ic">{copied ? "copied" : "copy"}</span>
    </button>
  );
}
