# EdgeProof — demo script (2-minute video)

**Live app:** https://edgeproof-62xakoxxk-zeyadelganainys-projects.vercel.app/ · **Repo:** https://github.com/zeyadelganainy/edgeproof
> Use your Vercel **production** domain (Dashboard → edgeproof → Domains) as the submission link — it always points at the latest deploy.

Total ~120s. Proofs take ~24s each, so **pre-record the runs and cut/speed-ramp the waits** — don't make
judges watch proofs in real time. Dark terminal + the browser card in dark mode (matches the Midnight
look). The card's **On-chain / Demo dataset** badge stays visible — honesty is a feature.

**Pre-roll (off camera):**
```bash
cd /mnt/d/midnight-hackathon/cli && docker compose -f standalone.yml up -d   # node + indexer + proof server, healthy
cd .. && npm --workspace cli run standalone                                  # deploy + prove -> writes ui/public/card.json
cd ui && npm run dev                                                         # browser card at localhost:5173
```
After the pre-roll run you have a live contract to read back. This session's verified contracts:
- demo_pass (all 3 proven): `d4581b439a38276bad77024b17bd136b09c292cc45129a455b1c322fe57efdd8`
- imported (TradingView, all 3 proven): `496f6a31bd8590c3dabe3796975e4ccfcca0928da0ee3297658f020918b64690`

**Networks note (honest):** the demo runs on the fully-local **Standalone** Midnight stack — real deploy,
real ZK proofs, real on-chain reads. We also **attempted a public Preprod deploy**: raising the WSL VM to
16 GB + 16 GB swap and the Node heap to 13 GB cleared the OOM that blocked earlier tries (it now runs for
hours instead of crashing at ~18 min), but Preprod's initial full-history shielded-wallet sync is
CPU-bound and **did not finish after 4+ hours** on this machine — a hardware/time limit, not a correctness
one. Don't claim "live on Preprod" on camera unless that run has actually landed.

---

### 0:00–0:12 — The problem (hook)
**On screen:** the deployed landing page — "Prove your track record without revealing a trade."
**VO:** "Every trader hits the same wall: to prove you're profitable, you hand over your trade history —
and that history *is* your strategy. You can't prove it without leaking it."

### 0:12–0:26 — The idea + it's live
**On screen:** the public URL in the address bar; the two-path fork (**Check my trades** / **Look up a
contract**).
**VO:** "EdgeProof runs on Midnight. Your trades stay on your machine as private state; a zero-knowledge
circuit proves threshold claims — win rate, net P&L, drawdown — and only a commitment and the verified
claims ever touch the chain. It's deployed and public."

### 0:26–1:04 — The money shot (the verified card)
**On screen:** **Look up a contract** → network **Standalone** → paste the demo_pass contract above →
**Read from chain**. The card renders live: three green **✓ Verified** claims, the contract + commitment,
each claim's copyable **Proof · tx … · block …**. Optionally show the captured `standalone` terminal
underneath as proof it came from a real deploy + proofs.
**VO:** "It commits the log, then generates a real ZK proof for each claim — each its own on-chain
transaction. This card is read straight back from the ledger, and every claim links to the transaction
that settled it. Notice what's *not* here: not a single trade."

### 1:04–1:30 — It's real: bring your own trades
**On screen:** a **TradingView "List of Trades" CSV**, then:
```bash
npm run adapt:tradingview -- ./scripts/adapters/example-tradingview.csv ./data/my-trades.json --symbol GBPUSD
npm --workspace cli run standalone -- --file ./data/my-trades.json
```
Speed-ramp the proofs; land on the card badged **IMPORTED**. (Or show the browser **Check my trades** →
**Load a trade file** picker previewing win rate / net / drawdown locally — the file never uploads.)
**VO:** "This isn't demo data. Export from TradingView, run one command, and your real trades go through
the exact same pipeline — into a verified, shareable card. They never leave your machine."

### 1:30–1:50 — Soundness (the circuit refuses to lie)
**On screen:** run + capture:
```bash
npm --workspace cli run standalone-fail
```
Land on **✓ REJECTED — the circuit will not prove a false claim.**
**VO:** "And it can't be faked. Point the *same* circuit at a losing record and ask it to prove profit —
the assertion fires inside the prover. A false claim is mathematically impossible to produce."

### 1:50–2:00 — Close
**On screen:** quick flash of `contract/src/edgeproof.compact` (the circuits) + the `9 passed` test line.
**VO:** "Commitment-bound, no signed integers, no division — verified by nine tests and proven on-chain.
EdgeProof: your edge, proven — never exposed."

---

## Assets to have ready
- The deployed site (public URL) + the browser card at `localhost:5173` in dark mode (money-shot visual).
- Terminal capture of `npm --workspace cli run standalone` (verified card + ~24s proof timings).
- The TradingView flow: `example-tradingview.csv` → `adapt:tradingview` → `--file` run → **IMPORTED** card.
- Terminal capture of `npm --workspace cli run standalone-fail` (the rejection).
- `npm run test:contract` output (the `9 passed` line); a glance at `contract/src/edgeproof.compact`.

## What the demo must prove (README parity)
Private log never hits the ledger · claims mathematically verifiable · commitment-bound (no
cherry-picking) · real enforcement (fail rejected) · works on **real** imported trades · reproducible ·
honest (labeled datasets, no fabricated numbers).
