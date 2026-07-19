# EdgeProof — 2-minute demo video shot-list

Total ~120s. Proofs take ~24s each, so **pre-record the runs and cut/speed-ramp the waits** — don't
make judges watch proofs in real time. Dark terminal + the browser card in dark mode (matches the
Midnight look). The card's **On-chain / Demo dataset** badge stays visible — honesty is a feature.

Pre-roll (off camera):
```bash
cd /mnt/d/midnight-hackathon/cli && docker compose -f standalone.yml up -d   # fresh stack, node+indexer healthy
cd ../ui && npm run dev                                                       # browser card at localhost:5173
```

**Networks note (honest):** the demo runs on the fully-local **Standalone** Midnight stack — real
deploy, real ZK proofs, real on-chain reads. We also **attempted a public Preprod deploy**: raising the
WSL VM to 16 GB + 16 GB swap and the Node heap to 13 GB cleared the OOM that blocked earlier tries (it
now runs for hours instead of crashing at ~18 min), but Preprod's initial full-history shielded-wallet
sync is CPU-bound and **did not finish after 4+ hours** on this machine — a hardware/time limit, not a
correctness one. A single successful Preprod deploy would persist the contract permanently; the browser
card already reads any Preprod contract via the public indexer. Don't claim "live on Preprod" on camera
unless that run has actually landed.

---

### 0:00–0:12 — The problem (hook)
**On screen:** title card — "EdgeProof — prove your track record without revealing a trade."
**VO:** "Every trader hits the same wall: to prove you're profitable, you hand over your trade history —
and that history *is* your strategy. You can't prove it without leaking it."

### 0:12–0:28 — The idea
**On screen:** one-line diagram `private trade log → ZK circuit → on-chain claim`.
**VO:** "EdgeProof runs on Midnight. Your trades stay on your machine as private state. A zero-knowledge
circuit proves threshold claims about them — win rate, net P&L, drawdown — and only a commitment and the
verified claims ever touch the chain."

### 0:28–1:05 — The money shot (the verified card)
**On screen:** the **browser performance card** at `localhost:5173` (dark mode). Pan the three green
**✓ Verified** claims, the contract + commitment, and the copyable **Proof · tx … · block …** on each
claim. Optionally show a captured `npm --workspace cli run standalone` terminal underneath as proof the
card came from a real deploy + proofs.
**VO:** "It commits the log, then generates a real ZK proof for each claim — each its own on-chain
transaction. This card is read straight back from the public ledger, and every claim links to the
transaction that settled it. Notice what's *not* here: not a single trade. Twenty-eight went in; zero
were revealed."

### 1:05–1:32 — It's real: bring your own trades
**On screen:** a **TradingView "List of Trades" CSV**, then:
```bash
npm run adapt:tradingview -- ./my-export.csv ./data/my-trades.json --symbol GBPUSD
npm --workspace cli run standalone -- --file ./data/my-trades.json
```
Speed-ramp the proofs; land on the card now badged **IMPORTED**. (Or show the browser **Load a trade
file** picker previewing the file's win rate / net / drawdown locally.)
**VO:** "This isn't demo data. Export your trades from TradingView, run one command, and they go through
the exact same pipeline — into a verified, shareable card. The trades never leave your machine."

### 1:32–1:52 — Soundness (the circuit refuses to lie)
**On screen:** run + capture:
```bash
npm --workspace cli run standalone-fail
```
Land on the red **✓ REJECTED — the circuit will not prove a false claim.**
**VO:** "And it can't be faked. Point the *same* circuit at a losing record and ask it to prove profit —
the assertion fires inside the prover. A false claim is mathematically impossible to produce."

### 1:52–2:00 — Close
**On screen:** quick flash of `edgeproof.compact` (the circuits) + the `9 passed` test line.
**VO:** "Commitment-bound, no signed integers, no division — verified by nine tests and proven on-chain.
EdgeProof: your edge, proven — never exposed."

---

## Assets to have ready
- Browser card at `localhost:5173` in dark mode (the money-shot visual) — plus the shareable artifact if useful.
- Terminal capture of `npm --workspace cli run standalone` (verified card + timings).
- The TradingView flow: `example-tradingview.csv` → `adapt:tradingview` → `--file` run → **IMPORTED** card.
- Terminal capture of `npm --workspace cli run standalone-fail` (the rejection).
- `npm run test:contract` output (the `9 passed` line); a glance at `contract/src/edgeproof.compact`.

## What the demo must prove (README parity)
Private log never hits the ledger · claims mathematically verifiable · commitment-bound (no
cherry-picking) · real enforcement (fail rejected) · works on **real** imported trades · reproducible ·
honest (labeled datasets, no fabricated numbers).
