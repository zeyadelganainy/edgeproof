# EdgeProof — demo script (~1:50, read-aloud)

**Live app:** https://edgeproof-seven.vercel.app/ · **Repo:** https://github.com/zeyadelganainy/edgeproof

**How to read this:** say the plain text out loud; *italic bits in asterisks* are what to **do** on
screen. Each beat is tagged **[🌐 deployed URL]**, **[💻 localhost:5173]**, or **[⌨️ terminal]**.

**Pacing fix:** don't run the TradingView proving in a terminal on camera — the proofs take ~2 min.
Demo "bring your own trades" in the **browser** instead: *Check my trades → Load a trade file →*
`data/verify-import.json` previews instantly. The only terminal beat is the soundness rejection, and you
**pre-record** that and cut to the result.

**Pre-roll (off camera):**
```bash
cd /mnt/d/midnight-hackathon/cli && docker compose -f standalone.yml up -d   # node + indexer + proof server
cd .. && npm --workspace cli run standalone                                  # deploy + prove -> live contract to read back
cd ui && npm run dev                                                         # localhost:5173
```
Money-shot contract (all 3 proven; its tx receipts are in `ui/public/card.json`, so the card shows
clickable **Proof · tx** links): `e1a07923d31590ebb186c11e3aa78c8a486b2a1f0cbcdd84f92fe2a5ce460948`

---

## The script (say this ↓)

**[0:00–0:15 — hook]  [🌐 deployed URL]**
Hi, I'm Zeyad — this is **EdgeProof**, my solo build for the Midnight DeFi track. *Open the live site.*
Every trader hits the same wall: to prove you're actually profitable, you have to hand over your trade
history — and that history *is* your edge. EdgeProof fixes that on Midnight.

**[0:15–0:38 — your trades, private (this is the "bring your own trades" part)]  [🌐 deployed URL]**
These are my real trades — exported from TradingView. *Click "Check my trades," then "Load a trade file,"
pick `data/verify-import.json`; the preview stats appear.* I load them and it previews my win rate, net,
and drawdown right here — but watch: the file **never leaves my browser**. Nothing is uploaded. It's all
on my side of the screen.

**[0:38–1:12 — the proof]  [💻 localhost:5173]**
Now the actual proof — putting it on-chain. *Switch to localhost:5173; "Look up a contract," network
Standalone, paste the contract, hit "Read from chain."* This card is read **live from the Midnight
ledger**. Net profit, positive — win rate over fifty percent — max drawdown under a hundred pips — all
**verified in zero-knowledge**, and each one is its own on-chain transaction. *Click a "Proof · tx" to
copy it.* And notice what's *not* here — *gesture across the card* — not a single trade.

**[1:12–1:38 — it can't lie]  [⌨️ terminal · pre-record + cut to the result]**
And it can't be faked. *Run `npm --workspace cli run standalone-fail`; cut to the red "REJECTED" line.*
Point the same circuit at a *losing* record and ask it to prove profit — the proof simply fails. A false
claim is mathematically impossible to produce.

**[1:38–1:50 — close]  [🌐 deployed URL / editor]**
Nine tests, proven on-chain, and it's live and public. *Flash the deployed URL or the "9 passed" line.*
EdgeProof — your edge, proven, never exposed. Thanks for watching.

---

## Filming order
1. **[🌐 deployed URL]** — hook + the private "Check my trades" file preview (0:00–0:38).
2. **[💻 localhost:5173]** — the live on-chain card read via "Look up a contract" → Standalone (0:38–1:12).
3. **[⌨️ terminal, pre-recorded]** — the soundness rejection; cut straight to "REJECTED" (1:12–1:38).

## If you're still running long
- Trim the hook to one sentence ("…and that history *is* your edge — EdgeProof fixes that on Midnight").
- On the money shot, name only **two** of the three claims out loud; the card shows all three anyway.
- The close can be a single line over the card, no terminal flash.

## Assets to have ready
- The deployed site + the browser card at `localhost:5173` in **dark mode**.
- `data/verify-import.json` loaded in "Check my trades" (the TradingView-derived file).
- Pre-recorded terminal of `npm --workspace cli run standalone-fail` (cut to "REJECTED").
- Optional: `npm run test:contract` ("9 passed") and a glance at `contract/src/edgeproof.compact`.

**Honest note — don't claim "live on Preprod" on camera.** Everything shown runs on the local
**Standalone** stack (real deploy, real ZK proofs, real ledger reads). A public Preprod deploy was
attempted; the memory walls were cleared but Preprod's initial full-history wallet sync is CPU-bound and
didn't finish in 4+ hours on this machine. Standalone is the honest, reproducible on-chain path shown here.
