# Sovereign — Architecture Synthesis

**Forensic AI that pays its own way.**

This document is the synthesis of the two architectural specs:
- `architecture-backend.md` — system, IPC, Sentinel API, deployment, security
- `architecture-ai.md` — QVAC inference pipeline, latency budget, depth features

Read those for full detail. This file is the unified spec the implementer follows.

---

## What we're building

A desktop forensic app. User drops a sensitive PDF. Local QVAC AI extracts wallet addresses + entities. The agent autonomously pays a remote intelligence API in USDT-SPL on Solana for each address, retrieving real OFAC sanctions verdicts. Output: a forensic report with evidence highlighting (page + bbox).

**Demo target:** 8 seconds end-to-end on a Mac M-series for a 5-7 page PDF with ~5 wallet addresses.

---

## Stack (locked)

| Layer | Choice |
|-------|--------|
| Desktop shell | Electron + electron-vite + React + TypeScript + Tailwind |
| AI inference | `@qvac/sdk` (Bare runtime) — LLM + OCR + Embeddings, three modules used deeply |
| Wallet | `@tetherto/wdk-wallet-solana@1.0.0-beta.8` + `@tetherto/pear-wrk-wdk` Bare worklet |
| Chain | Solana devnet (we mint our own mock USDT-SPL because real USDT-SPL is mainnet-only) |
| Payment protocol | HTTP 402 / x402 |
| Backend | Hono on Cloudflare Workers (KV for SDN cache + nonces, R2 for XML mirror, Cron Triggers for daily refresh) |
| Persistence | better-sqlite3 (runs + entities), keytar (mnemonic), electron-store (settings) |
| OFAC data | US Treasury SDN XML, refreshed daily via cron |

---

## Critical decisions made by the agents

1. **One QVAC singleton Bare worker, app-lifetime.** All three models eager-loaded at boot (small → big to avoid memory fragmentation). Memory budget on 16 GB Mac is comfortable (~10 GB headroom).

2. **OCR streamed page-by-page; pages serial.** Pipelining lets LLM page N start while OCR page N+1 streams → saves ~800ms. UI sees live extraction.

3. **Regex + LLM hybrid for entity extraction.** Regex is the source of truth for wallet addresses; LLM handles owner attribution and named entities. Critical: `regexSet` filter drops any LLM-hallucinated addresses before they reach Sentinel.

4. **Per-page LLM calls with KV-cache reuse.** Llama 3.2 1B context is too small for full-document calls; KV-cache caches the system prompt across pages, saving ~480ms.

5. **Embedding-based entity coreference (the demo A/B).** "Acme Holdings, LLC" / "Acme Hldgs." / "ACME" cluster at cosine > 0.92 with GTE-Large. String normalization gives 3 clusters. **Toggle dedup off in the demo for an A/B reveal — this is the most defensible QVAC depth claim.**

6. **Sentinel calls with concurrency = 3.** 5-way collides on Solana signing nonces and RPC rate limits; serial blows the 8s budget.

7. **Mock USDT-SPL on devnet.** Real USDT-SPL is mainnet-only. We deploy our own mock USDT mint, hardcode its address in `packages/shared/constants.ts`, and Sentinel verifies against this mint. Document in demo script.

8. **Cloudflare Workers, not Fly.io, for Sentinel.** 0ms cold start, free-tier KV + R2 + Cron, no infra to babysit. Fly.io is overkill for stateless verify + JSON lookup.

9. **OS keychain (`keytar`) for mnemonic.** Falls back to electron `safeStorage`. Refuses launch if both unavailable. Mnemonic crosses IPC only on `wallet:create` and the gated `wallet:export-mnemonic`. Signing happens inside the Bare worklet — main process never sees the private key.

10. **Renderer is fully sandboxed.** `nodeIntegration:false`, `contextIsolation:true`, `sandbox:true`, CSP locked to `'self'` + Sentinel host. The only renderer surface is the typed `window.sovereign` API exposed via `contextBridge`.

11. **Network-down mid-demo is the killer beat.** Local QVAC extraction continues; only Sentinel lookups pause. We open the demo with WiFi off, do the entire forensic extraction air-gapped, then turn WiFi on for the autonomous payment phase.

---

## 8-second latency budget

| Stage | ms | Source |
|-------|-----|--------|
| Cold model load | 0 | Pre-cached via `warmup-models.ts` |
| PDF rasterize (6 pages @ 200 DPI) | 600 | pdfjs-dist in `worker_threads` |
| OCR (6 pages, streamed) | 2400 | QVAC OCR ~400ms/page on Metal |
| Regex sweep | 5 | |
| LLM extraction (6 pages, KV-reused) | 3200 | Llama 3.2 1B Q4_0 + per-page tool call |
| Embed dedup (~30 strings) | 250 | GTE-Large FP16 batch |
| 5× Sentinel @ concurrency 3 | 1400 | 2 batches × 700ms (sign + commit + verify) |
| Report + IPC | 50 | |
| **Total** | **7905** | **95ms headroom** |

Pipelining (OCR N+1 || LLM N) is mandatory; without it, total = 8900ms (over budget).

---

## Implementation order (60-hour solo budget)

| Hours | Milestone |
|-------|-----------|
| 0-4 | Monorepo scaffold (Electron + Vite + React + Tailwind), shared schemas in `packages/shared`, Sentinel skeleton deployed to Cloudflare Workers |
| 4-10 | Wallet service: `keytar` keystore, `pear-wrk-wdk` Bare worklet plumbing, devnet airdrop helper, mock USDT mint deployed |
| 10-18 | Sentinel: OFAC XML parser, KV load, `/v1/lookup` with x402 challenge + USDT-SPL verifier |
| 18-26 | x402 client: 402 detect → sign with WDK → retry. End-to-end payment flow tested. |
| 26-34 | QVAC pipeline: singleton boot, OCR with `blockStream`, LLM tool calling with KV reuse, embedding dedup |
| 34-44 | Renderer (per the `sovereign-ui-architect` skill): drop zone, scan stream, settlement toast, privacy badge, report |
| 44-52 | End-to-end testing, error path coverage, history persistence in sqlite |
| 52-58 | Packaging (electron-builder DMG), model pre-cache on demo Mac, demo rehearsal |
| 58-60 | Buffer |

---

## What's been cut from scope (don't reintroduce)

- ❌ SmolVLM2 multimodal LLM
- ❌ Hyperswarm DHT delegated inference
- ❌ QVAC built-in RAG package (we do simpler embed-based dedup)
- ❌ Translation, STT, TTS modules
- ❌ Multi-chain wallet (Solana only)
- ❌ Mobile, web, multi-user, login
- ❌ Long descriptions or agent reasoning (deterministic pipeline only)

---

## Demo flow (60 seconds)

| Time | Action | Visible result |
|------|--------|----------------|
| 0:00 | User drops `meridian_atlas_memo.pdf` into the app | Drop zone activates, glass card lights cyan |
| 0:01 | **Toggle WiFi OFF** | Privacy Badge pulses (still 100% Local) |
| 0:01-0:08 | QVAC pipeline runs offline | Scan Stream streams: OCR blocks, entity findings, dedup clusters |
| 0:08 | Local extraction complete: 4 addresses, 8 entities, no payments yet | Report card materializes with "lookup pending" badges |
| 0:09 | **Toggle WiFi ON** | Network indicator turns cyan |
| 0:09-0:11 | Agent autonomously pays Sentinel for each address | Settlement toasts slide in: "0.05 USDT-SPL → ✓ confirmed in 1.4s" × 4 |
| 0:11 | Final report renders | 1 OFAC-flagged (Lazarus), 1 Tornado Cash mixer, 2 clean. Total spent: $0.20 USDT. |
| 0:12-0:60 | Pitch close + Q&A | "100% local AI. Autonomous USDT payments. No subscription. No cloud. Built on Tether's stack — all of it." |

---

## Submission deliverables

1. **GitHub repo** (public, MIT) — pushed to `github.com/victorjayeoba/sovereign`
2. **Demo video** (3 min, YouTube unlisted) — recorded May 10
3. **README** — quickstart + architecture diagram + demo GIF + warmup-models instructions
4. **Pitch deck** — 5 slides
5. **Submitted to**:
   - Colosseum Frontier hackathon (arena.colosseum.org)
   - Superteam Earn QVAC track listing
6. **Deadline:** May 11, 2026 11:59 PM PDT
