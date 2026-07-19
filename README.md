# EdgeProof

**Prove your trading track record without revealing a single trade.**

EdgeProof is a confidential-DeFi dApp on [Midnight](https://midnight.network). A trader commits a
private trade log on-chain, then generates zero-knowledge proofs of threshold performance claims —
**net PnL positive**, **win rate ≥ X%**, **max drawdown ≤ Y pips** — that anyone can verify on-chain,
while the individual trades never leave the trader's machine.

It solves the **trader's paradox**: you can't prove your track record without leaking the strategy
that produced it.

> The demo dataset is synthetic, seeded, and clearly labeled **DEMO DATASET** (`scripts/generate-dataset.ts`),
> modeled on a real GBPUSD London-session profile — no fabricated numbers. EdgeProof also takes **real
> trades**: import a TradingView export (see [Bring your own trades](#bring-your-own-trades)).

---

## The money shot

Deploying to a Midnight chain and proving all three claims against the winning dataset
(`demo_pass.json`) produces a verified, on-chain performance card:

```
──────────────────────────────────────────────────────────────
  EdgeProof — Verified Performance Card        [DEMO DATASET]
──────────────────────────────────────────────────────────────
  Network    : Standalone
  Contract   : 034bd39234393c020f23071ebf7a1e29229fb932867190484b36147741772a51
  Commitment : d2a4c12bc82df07c5fa5e6a56c9be4a8e16040a08cbcb883438909b1a38c32e4
──────────────────────────────────────────────────────────────
  Net PnL positive         : ✓ VERIFIED
  Win rate >= 50%          : ✓ VERIFIED
  Max drawdown <= 100 pips  : ✓ VERIFIED
──────────────────────────────────────────────────────────────
  Proven in zero-knowledge on Midnight - no trade was revealed.
──────────────────────────────────────────────────────────────
```

Each claim is a **real ZK proof** submitted as its own on-chain transaction; the results are read
back from the **public ledger**. The trade log stays in local private state the whole time. A React
**performance card** (`ui/`) renders this straight from the on-chain ledger — see
[The performance card](#the-performance-card-browser).

### Soundness: the same circuit refuses to lie

Point the exact same contract at the losing dataset (`demo_fail.json` — 42.9% win rate, net negative)
and try to prove "net PnL positive". The assertion fires **during proof generation** — a false claim
simply cannot be proven:

```
  Attempting to prove 'net PnL positive' on a net-negative log...
  ✓ REJECTED — the circuit will not prove a false claim.
    reason: ... Error: failed assert: net PnL below claimed threshold
```

This is what separates a real ZK proof from a rubber stamp. It's also covered by 9 contract-level
Simulator tests (each claim: proves on pass, rejected on fail, commitment-bound, boundary-correct).

---

## Bring your own trades

The demo isn't limited to generated data — a trader can prove **their own** track record. The trades
live only as a local **canonical JSON** file (`TradeRecord` schema in `scripts/types.ts`); a
**TradingView "List of Trades" CSV adapter** maps a real export into that schema:

```bash
npm run adapt:tradingview -- ./my-export.csv ./data/my-trades.json --symbol GBPUSD
npm --workspace cli run standalone -- --file ./data/my-trades.json
#   optional thresholds:  --win-rate 55  --max-dd 80  --min-net 0
```

This was verified end-to-end — the example export (`scripts/adapters/example-tradingview.csv`, 6
trades) went CSV → adapter → `--file` → **deploy + 3 proofs, all VERIFIED** on-chain (a fresh
contract `70ad7783…`), and its card was written back to the UI. Claims your data doesn't support are
marked *not proven* rather than crashing the run — the circuit still won't lie. In the browser, the
**Load a trade file** picker parses + previews any canonical JSON **locally** (it's never uploaded),
showing your trade count, win rate, net, and drawdown, and which claims are provable.

---

## The performance card (browser)

`ui/` is a Vite + React app (Midnight's own brand: Outfit, near-black + electric blue, green =
verified). It:

- **Reads the card live from the chain** — `indexerPublicDataProvider.queryContractState(addr)` →
  `EdgeProof.ledger(...)` decoded in-browser via the on-chain WASM (no server), so the card is the
  real on-chain state: commitment, the three verified claims, and their thresholds.
- **Connects Lace** via the Midnight `dapp-connector` (auto-detecting the wallet's network).
- Shows each claim's **settlement transaction** (copyable) and a **how-to-verify** panel, so anyone
  can check it independently.

```bash
cd ui && npm run dev        # http://localhost:5173
```

---

## How it works — Midnight's three-layer model

| Layer | What lives here |
|-------|-----------------|
| **Private state** (TypeScript witness) | the padded 32-trade log + a commitment salt — never leaves the prover |
| **Compact circuit** | computes the metric over the log and asserts the threshold; discloses only what's public |
| **Public ledger** | a salted `persistentHash` (SHA-256) commitment + the proven claims and their thresholds |

Every claim circuit **first** asserts `persistentHash(trades, salt) == commitment`. This binds all
claims to one committed log — a trader can't cherry-pick a different log for each claim.

---

## The ZK engineering

Compact (Midnight's contract language) has real constraints; EdgeProof is designed around them:

- **No signed integers** → P&L is stored unsigned as deci-pips with a bias (`pnlEnc = pnlDeciPips + BIAS`),
  and equity is carried in an `OFFSET`-biased running total so it never goes negative. Subtractions are
  rearranged into additions on both sides of a comparison to avoid underflow.
- **No mutable loop accumulators** (`let` is a reserved keyword) → every reduction is done by
  **witnessing a running prefix array** (length 33, index 0 = baseline) and verifying its recurrence
  in-circuit with one assertion per index. Bonus: this keeps proofs cheap — the arithmetic happens in
  the witness, and the circuit only *verifies* it.
- **`Field` has no ordering operators** → all comparisons use `Uint<64>`.
- **Private by default** → the claimed thresholds are explicitly `disclose()`d to the ledger.
- **Max drawdown avoids division**: instead of `(peak − equity) / peak ≤ D`, the claim is the
  unsigned-safe `peak ≤ equity + D` at every point on the curve.

**Proof time** (this machine: 16 cores, 12 GB to Docker; standalone Midnight stack):

| Step | Time |
|------|------|
| Deploy contract | ~18–20 s |
| `commit` (hash of private log) | ~24 s |
| each claim proof (`proveNetPnL` / `proveWinRate` / `proveMaxDrawdown`) | ~24 s |

The `Vector<32>` claim circuits prove in the same ballpark as a trivial counter, confirming the
prefix-sum design keeps circuit size small.

---

## Reproduce it

**Prerequisites:** WSL2 + Ubuntu, Docker Desktop (WSL integration on), Node 22, and the Compact
toolchain **0.30.0** (`compact update 0.30.0`; if `compact update` fails on Ubuntu, `apt install zstd`
then `rm -rf ~/.compact` and retry — the compiler artifacts are zstd-compressed).

```bash
npm install                          # workspaces: contract + cli + ui
npm run gen                          # -> data/demo_pass.json, data/demo_fail.json (seeded)
npm run compact:contract             # compile the Compact contract -> managed circuit assets
npm run test:contract                # 9/9 Simulator tests: all 3 claims, pass + fail + binding

# Full on-chain demo on a fully-local Midnight stack (node + indexer + proof server):
cd cli && docker compose -f standalone.yml up -d
cd .. && npm --workspace cli run standalone        # deploy + prove 3 claims -> verified card
npm --workspace cli run standalone-fail            # same circuit rejects the losing log

# Bring your own trades:
npm run adapt:tradingview -- ./my-export.csv ./data/my-trades.json --symbol GBPUSD
npm --workspace cli run standalone -- --file ./data/my-trades.json

# The browser performance card (live on-chain read + Lace + file preview):
cd ui && npm run dev                 # http://localhost:5173
```

---

## Repo layout

```
edgeproof/
  contract/                          # @edgeproof/contract (Compact + TS bindings + tests)
    src/edgeproof.compact            # 4 circuits: commit, proveNetPnL, proveWinRate, proveMaxDrawdown
    src/witnesses.ts                 # private state + witnesses + dataset -> private-state builder
    src/test/                        # Simulator + 9 vitest tests
  cli/                               # @edgeproof/cli (deploy + prove, modeled on example-counter)
    src/api.ts                       # wallet, providers, deploy, the three proof calls
    src/run.ts                       # shared runner: --file, thresholds, graceful per-claim proving
    src/{standalone,preprod}.ts      # network entry points
    standalone.yml                   # local node + indexer + proof server
  ui/                                # @edgeproof/ui (Vite/React card: live ledger read, Lace, file preview)
  scripts/generate-dataset.ts        # seeded synthetic dataset generator (single source of truth)
  scripts/adapters/tradingview-csv.ts# TradingView "List of Trades" CSV -> canonical dataset
  data/{demo_pass,demo_fail}.json    # committed demo datasets
```

---

## Status & roadmap

**Working today (verified end-to-end):**
- All three claims, commitment-bound, proven with real ZK proofs and deployed on-chain to a local
  Midnight stack; soundness demonstrated (losing log rejected); 9/9 contract tests.
- **Bring-your-own-trades**: TradingView-CSV adapter → canonical JSON → `--file` → proven card.
- **Browser performance card**: live in-browser ledger read + Lace connect + local file preview.

**Preprod public testnet — attempted, memory-cleared but sync-time-bound.** The same contract and
proving are verified locally, and a live Preprod path is wired (`npm --workspace cli run preprod`
against a faucet-funded wallet). We attempted the public deployment and got **past** the wall that
blocked it earlier: raising the WSL VM to **16 GB + 16 GB swap** (`~/.wslconfig`) and the Node heap to
**13 GB** cleared the OOM — the deploy now runs for **hours** instead of dying at ~18 min. The remaining
blocker is **time, not memory**: Preprod's initial full-history shielded-wallet sync is CPU-bound
(~500% CPU, no progress readout) and **did not finish after 4+ hours** on this machine. It needs a
faster box or wallet-state persistence between runs. A successful Preprod deploy only has to happen
**once** — the contract then lives on Preprod permanently and the browser card reads it via the public
indexer (fast, no re-sync). Until then, the local **Standalone** stack is the reliable on-chain path
shown above.

**Roadmap:**
- **More ingest adapters + broker-binding** — beyond TradingView CSV, connect a live broker (e.g. an
  Alpaca agent auto-committing real fills) so a claim ties to a *verified account*, not just a file.
- **Browser-side proving** — today the card *reads* on-chain and the CLI *proves* locally; moving
  commit + prove into the browser (wallet-signed, in-page) is a larger lift on our SDK stack (its
  proving-key loading is Node-filesystem based).
