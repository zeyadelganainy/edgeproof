# EdgeProof — submission

**Track:** Confidential DeFi on Midnight
**Tagline:** Prove your trading track record without revealing a single trade.

## Links
- **Live app:** https://edgeproof-62xakoxxk-zeyadelganainys-projects.vercel.app/
  *(use your Vercel **production** domain — Dashboard → edgeproof → Domains — as the canonical submission link)*
- **Code:** https://github.com/zeyadelganainy/edgeproof
- **Demo video:** _(add link — see `docs/demo-script.md` for the 2-min script)_

---

## Elevator pitch
Traders can't prove they're profitable without handing over their trade history — and that history *is*
their edge. EdgeProof breaks the paradox: commit a private trade log on Midnight, then generate
zero-knowledge proofs of threshold claims — **net PnL positive**, **win rate ≥ X%**, **max drawdown ≤ Y
pips** — that anyone can verify on-chain, while the individual trades never leave the trader's machine.
The output is a shareable, on-chain-verified performance card.

## The problem
To raise capital, get a prop-firm allocation, or sell a signal service, a trader has to prove a track
record. The only accepted proof today is the raw trade history — which leaks the strategy. So honest
traders either over-share or aren't believed.

## What it does
- **Commit** a private, padded 32-trade log as a salted `persistentHash` (SHA-256) on the ledger.
- **Prove** three threshold claims in zero-knowledge, each bound to that commitment (no cherry-picking a
  different log per claim). Each proof is its own on-chain transaction.
- **Verify** — anyone reads the contract's ledger and sees only the commitment + the proven claims and
  thresholds. Never a trade.
- **Two ways in (web app):** *Check my trades* (load a file locally → preview → get a copy-paste publish
  command; the file never uploads) and *Look up a contract* (read any EdgeProof card straight from the
  Midnight indexer).
- **Bring your own trades:** a TradingView "List of Trades" CSV adapter maps a real export into the
  canonical schema, then the same deploy-and-prove pipeline runs on it.

## How we built it — Midnight's three-layer model
| Layer | What lives here |
|---|---|
| **Private state** (TypeScript witness) | the 32-trade log + a commitment salt — never leaves the prover |
| **Compact circuit** | computes the metric over the log, asserts the threshold, discloses only what's public |
| **Public ledger** | a salted `persistentHash` commitment + the proven claims and their thresholds |

Every claim circuit **first** asserts `persistentHash(trades, salt) == commitment`, binding all claims to
one committed log.

**Engineered around real Compact constraints:**
- **No signed integers** → P&L stored unsigned as deci-pips with a bias; equity carried in an
  `OFFSET`-biased running total; subtractions rearranged into additions to avoid underflow.
- **No mutable loop accumulators** (`let` is reserved) → every reduction is a **witnessed prefix array**
  whose recurrence is verified in-circuit (one assertion per index). This also keeps proofs cheap.
- **`Field` has no ordering** → comparisons use `Uint<64>`.
- **Max drawdown avoids division** → `peak ≤ equity + D` at every point instead of `(peak−equity)/peak`.

**Stack:** Compact 0.30.0 · midnight-js 4.x · proof-server 8.0.3 · React 19 + Vite (in-browser ledger
decode via the on-chain WASM) · Lace dapp-connector.

## Accomplishments (all verified this session)
- **9/9** contract Simulator tests (each claim: proves-on-pass, rejects-on-fail, commitment-bound).
- **Deploy + prove all 3 claims** on a local Midnight stack → verified card (~22–24s per proof).
- **Soundness:** the same circuit **rejects** a losing log asked to prove profit (assertion fires in the prover).
- **Bring-your-own-trades:** TradingView CSV → adapter → `--file` → verified `[IMPORTED]` card, end-to-end.
- **Public web app** deployed (two-path flow; browser reads the ledger with no server).

## Challenges (honest)
Getting a **public Preprod** deploy to run locally was the hard part. It OOM'd in two tiers: the WSL VM's
~11 GB cap ("external memory pressure"), then Node's 8 GB V8 heap. Raising the VM to **16 GB + 16 GB swap**
and the heap to **13 GB** cleared both — the deploy went from dying at ~18 min to running for hours. The
remaining wall is **compute, not memory**: Preprod's initial full-history shielded-wallet sync is
CPU-bound (~500% CPU, no progress readout) and did not finish after **4+ hours** on this machine. A single
successful Preprod deploy would persist the contract permanently; the app already reads any Preprod
contract via the public indexer. The reliable on-chain path shown in the demo is the local **Standalone**
stack — real deploys, real proofs, real reads.

## What's next
- One Preprod deploy on a faster box (or wallet-state persistence between runs) → lights up the public
  "see a proven example" card.
- More ingest adapters + broker-binding (tie a claim to a *verified* account, e.g. an Alpaca agent
  auto-committing real fills).
- Browser-side proving (today the browser reads on-chain and the CLI proves locally).

## Built with
`midnight` · `compact` · `typescript` · `react` · `vite` · `zero-knowledge-proofs` · `docker` · `vercel`

---

## Submission checklist
- [x] Public GitHub repo (no secrets — verified `.secrets/` untracked, seed absent)
- [x] README with problem, architecture, ZK engineering, reproduce steps
- [x] Web app deployed publicly (Vercel)
- [x] 9/9 contract tests green; deploy + prove + soundness + BYO-trades verified
- [x] Honest Preprod writeup (README + demo script)
- [ ] **Record the 2-min video** (`docs/demo-script.md`) and add the link above
- [ ] Put the **Vercel production domain** as the Devpost "Try it" link
- [ ] Fill Devpost fields (paste sections above: pitch / problem / what it does / how / challenges / next)
- [ ] Submit before the deadline
