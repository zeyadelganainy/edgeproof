# EdgeProof — submission

**Track:** Confidential DeFi on Midnight
**Tagline:** Prove your trading track record without revealing a single trade.

## Links
- **Live app:** https://edgeproof-seven.vercel.app/
- **Code:** https://github.com/zeyadelganainy/edgeproof
- **Demo video:** _(add link — see `docs/demo-script.md` for the script)_

---

## Elevator pitch (≤200 chars — paste into the Devpost pitch field)
Prove your trading track record on Midnight with zero-knowledge proofs — win rate, net P&L, drawdown —
without revealing a single trade. Only the proof is public; your strategy stays private.

---

## About the project (paste into the Devpost "About the project" field — Markdown + LaTeX)

### Inspiration

Every trader hits the same wall. To raise capital, land a prop-firm allocation, or sell a signal
service, you have to prove you're profitable — and the only proof anyone accepts is your raw trade
history. But that history **is** your edge. Hand it over and you've leaked the strategy; keep it private
and nobody believes your numbers.

I wanted to break that paradox: **prove the claims about a track record without revealing the trades
behind them.** Midnight — a chain built for private smart contracts with zero-knowledge proofs — was the
natural place to do it.

### What it does

EdgeProof lets a trader commit a private trade log on-chain and generate zero-knowledge proofs of
threshold claims:

- **Net P&L is positive**
- **Win rate ≥ X%**
- **Max drawdown ≤ Y pips**

Anyone can verify these on the public ledger, but the individual trades never leave the trader's machine.
What lands publicly is only a salted commitment and the proven claims. The result is a shareable,
on-chain-verified performance card. The web app has two doors: *Check my trades* (preview a trade file
entirely in your browser) and *Look up a contract* (read anyone's verified card straight from the ledger).

### How I built it

Midnight's model is three layers, and EdgeProof uses all three:

| Layer | What lives here |
|---|---|
| **Private state** (TypeScript witness) | the padded 32-trade log + a commitment salt — never leaves the prover |
| **Compact circuit** | computes each metric, asserts the threshold, discloses only what's public |
| **Public ledger** | a salted `persistentHash` commitment + the proven flags and thresholds |

Every claim circuit **first** asserts

$$H(\text{trades} \,\|\, \text{salt}) = \text{commitment}$$

so all three claims are bound to one committed log — you can't cherry-pick a different history per claim.

The CLI deploys the contract and generates a real proof per claim (each its own transaction), then reads
the card back. The React app decodes the ledger in-browser via Midnight's WASM — no server. A TradingView
"List of Trades" CSV adapter maps a real export into the canonical schema, so it works on actual trades,
not just demo data.

### The ZK engineering (my favorite part)

Compact has real constraints, and designing around them was the interesting work.

**No signed integers.** P&L can be negative, so I store it unsigned with a bias,
$\text{pnlEnc} = \text{pnl}_{\text{decipips}} + \text{BIAS}$, and rearrange every comparison so nothing
underflows. "Net profitable" becomes

$$\sum_i \text{pnlEnc}_i \;>\; \text{total} \cdot \text{BIAS}.$$

Win rate avoids division entirely:

$$\text{wins} \cdot 100 \;\ge\; 50 \cdot \text{total}.$$

**Max drawdown without division.** The textbook drawdown is
$\frac{\text{peak}-\text{equity}}{\text{peak}} \le D$, but division and a possibly-non-positive
denominator are both landmines in a circuit. So I rewrote it as the equivalent unsigned-safe inequality,
checked at every point on the equity curve:

$$\text{peak}_i \;\le\; \text{equity}_i + D.$$

**No mutable loop accumulators** (`let` is a reserved keyword). Instead of accumulating in a loop, I
*witness* the running prefix arrays (equity and peak) and have the circuit verify their recurrence — one
assertion per index. The heavy arithmetic happens in the witness; the circuit only checks it. That keeps
proofs cheap: the 32-trade claim circuits prove in about the same time as a trivial counter (~24 s each).

### What I learned

- How Midnight's *private-state → circuit → ledger* model actually fits together, and how to think in
  terms of what's **disclosed** versus what stays **witnessed**.
- A genuinely new mental model for arithmetic: with no signed ints, no division, and no mutable
  accumulators, you express everything as unsigned inequalities and witness-verified recurrences. That
  "prove it in the witness, check it in the circuit" pattern was the unlock.
- That proof time is a first-class design constraint — I measured it for every circuit from the start.

### Challenges I ran into

The contract, the proofs, and the browser card all came together on a local Midnight stack — **9/9 tests,
three verified claims, a losing log correctly *rejected* by the same circuit, and real imported trades**
all the way to a verified card. The wall was **deploying to public Preprod.**

It ran out of memory — twice. First the WSL VM hit its ~11 GB cap ("external memory pressure"); I raised
it to 16 GB + 16 GB swap. Then Node's V8 heap capped out at 8 GB; I raised `--max-old-space-size` to
13 GB. That took the deploy from dying at ~18 minutes to running for *hours* — but it exposed the real
ceiling: **compute, not memory.** Preprod's initial full-history shielded-wallet sync is CPU-bound
(pinned at ~500% CPU, with no progress readout), and it hadn't finished after 4+ hours on my machine.

So I made an honest call. Everything demoed runs on the local **Standalone** stack — real deploys, real ZK
proofs, real ledger reads — and I documented the Preprod attempt exactly as it happened. A single
successful Preprod deploy would persist the contract forever (the app already reads any Preprod contract
via the public indexer); it just needs a faster machine or wallet-state persistence between runs. I'd
rather ship something true than claim "live on testnet" over a run that never landed.

### What's next

- One Preprod deploy on a beefier machine (or caching wallet sync state) to light up a public example card.
- More ingest adapters and broker-binding — tie a claim to a *verified* account (e.g. an agent
  auto-committing real fills), not just a file.
- Move proving into the browser so the whole flow is wallet-signed and in-page.

---

## Accomplishments (quick factual reference)
- **9/9** contract Simulator tests (each claim: proves-on-pass, rejects-on-fail, commitment-bound).
- **Deploy + prove all 3 claims** on a local Midnight stack → verified card (~22–24 s per proof).
- **Soundness:** the same circuit **rejects** a losing log asked to prove profit (assertion fires in the prover).
- **Bring-your-own-trades:** TradingView CSV → adapter → `--file` → verified `[IMPORTED]` card, end-to-end.
- **Public web app** deployed (two-path flow; browser reads the ledger with no server).

## Built with
`midnight` · `compact` · `typescript` · `react` · `vite` · `zero-knowledge-proofs` · `docker` · `vercel`

---

## Submission checklist
- [x] Public GitHub repo (no secrets — verified `.secrets/` untracked, seed absent)
- [x] README with problem, architecture, ZK engineering, reproduce steps
- [x] Web app deployed publicly (Vercel) — https://edgeproof-seven.vercel.app/
- [x] 9/9 contract tests green; deploy + prove + soundness + BYO-trades verified
- [x] Honest Preprod writeup (README + demo script)
- [x] Record the ~2-min video (`docs/demo-script.md`)
- [ ] **Upload the video** (YouTube unlisted / Vimeo) and paste its link in the Links section above
- [ ] Fill Devpost: pitch (≤200), About-the-project story, Built with, links
- [ ] Submit before the deadline
