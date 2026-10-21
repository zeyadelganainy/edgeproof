# EdgeProof

[![CI](https://github.com/zeyadelganainy/edgeproof/actions/workflows/ci.yml/badge.svg)](https://github.com/zeyadelganainy/edgeproof/actions/workflows/ci.yml)

A dApp on [Midnight](https://midnight.network) that lets a trader prove claims about their track
record (net P&L positive, win rate of at least X%, maximum drawdown of at most Y pips) with
zero-knowledge proofs, without revealing a single trade. Built solo for the Midnight Hackathon
(Confidential DeFi track, July 2026).

**Live app:** https://edgeproof-seven.vercel.app
The live app previews a trade file in the browser. Reading a verified card from the chain needs the
local Standalone Midnight stack described below: the public Preprod deploy did not finish syncing,
so there is no public contract to look up yet.

## The problem

A trader cannot prove a track record without exposing the trades, and the trades are the strategy.
EdgeProof commits to a private trade log on-chain and then proves threshold claims about it. The
claims are public and verifiable; the trades never leave the trader's machine.

## Key design decisions

- **Three layers, with a clear line between private and public.** The padded 32-trade log and a
  commitment salt stay in private state. A Compact circuit computes each metric and asserts its
  threshold. The public ledger holds only a salted SHA-256 commitment and the proven claims.
- **Every claim is bound to one log.** Each claim circuit first checks that the hash of the private
  trades matches the on-chain commitment, so a trader cannot use a different log for each claim.
- **Soundness, not just success.** Given a losing log, the same circuit refuses to prove profit: the
  assertion fails inside the prover, so a false claim cannot be produced.
- **Designed around Compact's constraints.** There are no signed integers, so P&L is stored unsigned
  with a bias and comparisons are rearranged to avoid underflow. There is no division, so win rate
  is checked as `wins * 100 >= threshold * total` and drawdown as `peak <= equity + D` at every
  point. There are no mutable loop accumulators, so running totals are supplied as a length-33
  prefix array and verified in-circuit one index at a time. This keeps circuits small: a 32-trade
  claim proves in about 24 seconds, close to a trivial counter contract.
- **Bring your own trades.** A TradingView "List of Trades" CSV adapter converts a real export into
  the canonical schema. This was verified end to end: CSV to adapter to deploy to three proofs, all
  verified.

## Tech stack

Compact (Midnight's contract language), TypeScript, Midnight.js SDK, React and Vite for the
performance card, Docker for the local Midnight node, indexer and proof server, Vitest, and Vercel.

## Run it locally

Requires WSL2 with Ubuntu, Docker Desktop, Node 22 and, only if you change the contract, the Compact
toolchain 0.30.0. The compiled circuits are committed, so the tests run without it.

```bash
npm install
npm run test:contract                          # 9 contract tests
cd cli && docker compose -f standalone.yml up -d   # local node + indexer + proof server
cd .. && npm --workspace cli run standalone        # deploy and prove all three claims
npm --workspace cli run standalone-fail            # the same circuit rejects a losing log
cd ui && npm run dev                               # performance card at http://localhost:5173
```

Measured on a 16-core machine with 12 GB for Docker: deploy takes about 18 to 20 seconds and each
proof about 24 seconds. The walkthrough is in [docs/demo-script.md](docs/demo-script.md).

## How it's tested

`npm run test:contract` runs 9 Vitest tests against Midnight's contract Simulator. For each of the
three claims they check that a passing log proves, a failing log is rejected, and the claim is bound
to the committed log. CI runs them on every push. The full on-chain flow (deploy, three proofs,
ledger read-back, and rejection of the losing log) was verified on the local Standalone stack.

## Known limitations and next steps

- **Not on a public network yet.** A Preprod testnet deploy was attempted. Memory limits were
  cleared (16 GB WSL plus 16 GB swap, 13 GB Node heap), but Preprod's first full wallet sync is
  CPU-bound and did not finish in over 4 hours. Next: deploy once from a faster machine or persist
  wallet sync state between runs.
- **The proof covers a file, not an account.** EdgeProof proves facts about the committed log, not
  that the log came from a real brokerage account. Next: bind the log to broker data, for example
  fills committed directly from a broker API.
- **Fixed size.** The circuit takes exactly 32 trade slots; shorter logs are padded.
- **Proving runs in the CLI.** The browser reads the ledger but does not prove yet, because the SDK
  loads proving keys from the Node file system.

## How it was built

I used Claude Code for implementation while making the architecture decisions and reviewing the
output myself.

## Repository layout

```
contract/   Compact contract, TypeScript witnesses, compiled circuits and Simulator tests
cli/        deploy and prove (standalone and preprod entry points, local Docker stack)
ui/         Vite + React performance card
scripts/    seeded demo dataset generator and the TradingView CSV adapter
data/       demo datasets (labelled DEMO DATASET; synthetic and seeded)
```

## License

All rights reserved: the code is public for review and is not licensed for reuse. The exception is
the wallet and provider code in `cli/`, which is adapted from Midnight's example-counter and remains
under that project's Apache-2.0 license.
