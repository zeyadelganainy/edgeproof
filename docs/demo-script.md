# EdgeProof — demo script (2-minute video, read-aloud)

**Live app:** https://edgeproof-62xakoxxk-zeyadelganainys-projects.vercel.app/ · **Repo:** https://github.com/zeyadelganainy/edgeproof
> Use your Vercel **production** domain (Dashboard → edgeproof → Domains) as the submission link.

**How to read this:** say the plain text out loud; *italic bits in asterisks* are what to **do** on
screen. Each beat is tagged **[🌐 deployed URL]**, **[💻 localhost:5173]**, or **[⌨️ terminal]** so you
know where to film it. Proofs take ~24s — pre-record the terminal runs and speed-ramp the waits.

**Why the switch:** the deployed HTTPS site can't read your *local* Standalone chain (browsers block an
HTTPS page from talking to a `http://localhost` chain). So film the intro + the private file-preview on
the **deployed public URL**, then switch to **localhost:5173** for the live on-chain card read. The UI is
identical; there's one scripted line to make the switch feel natural.

**Pre-roll (off camera):**
```bash
cd /mnt/d/midnight-hackathon/cli && docker compose -f standalone.yml up -d   # node + indexer + proof server
cd .. && npm --workspace cli run standalone                                  # deploy + prove -> live contract to read back
cd ui && npm run dev                                                         # localhost:5173
```
Contract to paste in the money shot (all 3 claims proven this session; its tx receipts are in
`ui/public/card.json`, so the card shows clickable **Proof · tx** links):
`e1a07923d31590ebb186c11e3aa78c8a486b2a1f0cbcdd84f92fe2a5ce460948`

---

## The script (say this ↓)

**[0:00 — intro]  [🌐 deployed URL]**
Hi, I'm Zeyad, and this is **EdgeProof** — my solo build for the Midnight DeFi track. *Open the live site;
let the public URL show in the address bar.* Every trader hits the same wall: to prove you're actually
profitable, you have to hand over your trade history — and that history *is* your edge. So you either
leak your strategy, or nobody believes your numbers.

**[0:18 — the idea]  [🌐 deployed URL]**
EdgeProof fixes that on Midnight. *Point to the two paths — "Check my trades" and "Look up a contract."*
Your trades stay on your own machine as private state, and a zero-knowledge circuit proves claims *about*
them — win rate, net profit, worst drawdown — so only the proof ever goes public. Never the trades.

**[0:34 — private, and genuinely live]  [🌐 deployed URL]**
And this is the real, deployed app — anyone can open this link. *Click "Check my trades," load a trade
file, show the preview stats.* Watch — I load my trades and it previews my win rate and drawdown right
here, but that file never leaves the browser. Everything so far is happening on your side of the screen.

**[0:54 — the switch + the money shot]  [💻 localhost:5173]**
That preview is just local math — the real thing is proving it *on-chain*. So let me read back a card
that's actually been committed and proven. *Switch the browser to localhost:5173.* I'm hopping to my
local Midnight stack for this, since that test chain only runs on my machine — but it's a real deploy
with real proofs. *Click "Look up a contract," set network to Standalone, paste the contract, hit "Read
from chain."* This card is coming straight off the ledger. *Point at the three green checks.* Net profit,
positive — verified. Win rate over fifty percent — verified. Max drawdown under a hundred pips — verified.
*Click a "Proof · tx" to copy it.* Each claim is a real zero-knowledge proof, its own on-chain
transaction. And notice what's *not* here — *gesture across the card* — not a single trade.

**[1:24 — bring your own trades]  [⌨️ terminal]**
And this isn't demo data. *Show the TradingView "List of Trades" CSV, then run the two commands.*
```bash
npm run adapt:tradingview -- ./scripts/adapters/example-tradingview.csv ./data/my-trades.json --symbol GBPUSD
npm --workspace cli run standalone -- --file ./data/my-trades.json
```
You export your real trades from TradingView, run one command, and they go through the exact same
pipeline into a verified card. *Land on the card, now badged "IMPORTED."* The file never leaves your
machine.

**[1:42 — it can't lie]  [⌨️ terminal]**
And the best part — it can't be faked. *Run `npm --workspace cli run standalone-fail`.* Point the same
circuit at a *losing* record and ask it to prove profit — *land on the red "REJECTED" line* — and the
proof simply fails. A false claim is mathematically impossible to produce.

**[1:54 — close]  [⌨️ terminal / editor]**
Commitment-bound, no cherry-picking, verified by nine tests and proven on-chain. *Flash
`contract/src/edgeproof.compact` and the "9 passed" test line.* That's EdgeProof — your edge, proven,
never exposed. Thanks for watching.

---

## Filming order cheat-sheet
1. **[🌐 deployed URL]** — intro, the idea, and the private "Check my trades" file preview (0:00–0:54).
2. **[💻 localhost:5173]** — the live on-chain card read via "Look up a contract" → Standalone (0:54–1:24).
3. **[⌨️ terminal]** — bring-your-own-trades, the soundness rejection, and the closing `.compact`/tests flash.

## Assets to have ready
- The deployed site + the browser card at `localhost:5173` in **dark mode**.
- Terminal captures: `standalone` (verified card + ~24s timings), `standalone-fail` (rejection),
  `npm run test:contract` (the `9 passed` line).
- The TradingView flow: `example-tradingview.csv` → `adapt:tradingview` → `--file` → **IMPORTED** card.

**Honest note — don't claim "live on Preprod" on camera.** Everything shown runs on the local
**Standalone** stack (real deploy, real ZK proofs, real ledger reads). A public Preprod deploy was
attempted; the memory walls were cleared but Preprod's initial full-history wallet sync is CPU-bound and
didn't finish in 4+ hours on this machine. Standalone is the honest, reproducible on-chain path shown here.
