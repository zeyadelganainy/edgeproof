import { useState, type ReactNode } from "react";

export type Claim = {
  label: string;
  sub: string;
  verified: boolean;
  txId?: string;
  block?: number;
};

export type CardData = {
  network: string;
  chain?: string;
  contract: string;
  commitment: string;
  dataset: string;
  instrument: string;
  provenAt?: string;
  claims: Claim[];
};

function CopyIcon() {
  return (
    <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

function CopyButton({
  value,
  className,
  ariaLabel,
  children,
}: {
  value: string;
  className: string;
  ariaLabel: string;
  children: ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1300);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <button
      type="button"
      className={className}
      data-state={copied ? "copied" : undefined}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

function short(id: string, head = 8, tail = 8): string {
  return id.length > head + tail + 1 ? `${id.slice(0, head)}…${id.slice(-tail)}` : id;
}

function formatDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function PerformanceCard({ card }: { card: CardData }) {
  const chain = card.chain ?? "Midnight";
  const proven = formatDate(card.provenAt);
  const verifiedCount = card.claims.filter((c) => c.verified).length;
  const onChain = card.dataset === "On-chain";

  return (
    <article className="statement" aria-label="EdgeProof verified performance card">
      <header className="letterhead">
        <div className="brand">
          <div className="mark">
            EdgeProof<span className="dot">.</span>
          </div>
          <div className="doctype">Verified Performance Card</div>
        </div>
        <div className="head-right">
          <span className="chip is-verified">
            <span className="dot" aria-hidden="true" />
            Verified on {chain}
          </span>
          <span className={`chip ${onChain ? "is-live" : "is-demo"}`}>
            <span className="dot" aria-hidden="true" />
            {card.dataset === "DEMO DATASET" ? "Demo dataset" : card.dataset}
          </span>
        </div>
      </header>

      <div className="body">
        <div className="col col-left">
          <section className="meta" aria-label="Attestation details">
            <div className="row">
              <span className="k">Instrument</span>
              <span className="v">{card.instrument}</span>
            </div>
            <div className="row">
              <span className="k">Network</span>
              <span className="v">
                {chain} · <span className="accent">{card.network}</span>
              </span>
            </div>
            {proven ? (
              <div className="row">
                <span className="k">Proven</span>
                <span className="v">{proven}</span>
              </div>
            ) : null}
            <div className="row">
              <span className="k">Contract</span>
              <CopyButton className="copy" value={card.contract} ariaLabel="Copy contract address">
                <span className="txt">{short(card.contract)}</span>
                <CopyIcon />
                <span className="done">Copied</span>
              </CopyButton>
            </div>
            <div className="row">
              <span className="k">Commitment</span>
              <CopyButton className="copy" value={card.commitment} ariaLabel="Copy commitment hash">
                <span className="txt">{short(card.commitment)}</span>
                <CopyIcon />
                <span className="done">Copied</span>
              </CopyButton>
            </div>
          </section>

          <div className="verify-panel">
            <div className="verify-title">How to verify</div>
            <ol className="verify-steps">
              <li>
                <span className="vn">1</span>
                <span>
                  <b>Copy</b> any hash — click a contract, commitment, or proof to put it on your clipboard.
                </span>
              </li>
              <li>
                <span className="vn">2</span>
                <span>
                  <b>Look it up</b> — paste a proof transaction into the Midnight block explorer to watch it settle.
                </span>
              </li>
              <li>
                <span className="vn">3</span>
                <span>
                  <b>Confirm</b> — read the contract's ledger to check the commitment binds the log.
                </span>
              </li>
            </ol>
          </div>
        </div>

        <div className="col col-right">
          <div className="claims-head">
            <h2 className="claims-title">Proven in zero-knowledge</h2>
            <span className="claims-count">
              {verifiedCount} / {card.claims.length} verified
            </span>
          </div>
          <ul>
            {card.claims.map((c, i) => (
              <li className="claim" key={i}>
                <div className="claim-main">
                  <div className="claim-label">{c.label}</div>
                  <div className="claim-sub">{c.sub}</div>
                  {c.txId ? (
                    <div className="proofline">
                      <span className="proof-key">Proof</span>
                      <CopyButton
                        className="proof"
                        value={c.txId}
                        ariaLabel={`Copy settlement transaction for: ${c.label}`}
                      >
                        <span className="lbl">tx {short(c.txId, 8, 7)}</span>
                        <CopyIcon />
                        <span className="done">Copied</span>
                      </CopyButton>
                      {c.block != null ? <span className="proof-block">block {c.block}</span> : null}
                    </div>
                  ) : null}
                </div>
                {c.verified ? (
                  <div className="seal">
                    <span className="check" aria-hidden="true">
                      ✓
                    </span>
                    Verified
                  </div>
                ) : (
                  <div className="seal seal-no">Not proven</div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <footer className="foot">
        <p className="assurance">
          Each claim is a zero-knowledge proof settled on Midnight. The trade log never left the trader's machine —{" "}
          <strong>only these claims and a salted commitment are public</strong>, and the same contract mathematically
          refuses to prove any claim the trades don't support.
        </p>
        <p className="fine-print">
          Synthetic demonstration data, seeded and reproducible, modeled on a real GBP/USD London-session strategy
          profile. Not investment advice and not a record of actual trading.
        </p>
      </footer>
    </article>
  );
}
