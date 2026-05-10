# Sovereign

**Forensic AI that pays its own way.**

A local-first forensic document analyzer for crypto investigations. Drop a PDF, get a flagged-entity report in 8 seconds. 100% on-device AI via Tether's QVAC SDK. Autonomous USDT-SPL payments via WDK on Solana. Zero subscription. Zero data leakage.

Built for the **Colosseum Frontier hackathon** + **Tether QVAC side track**, May 2026.

---

## What it does

1. User drops a sensitive PDF into the desktop app
2. **QVAC OCR** extracts text (locally, on-device)
3. **QVAC LLM** with Zod tool calling extracts wallet addresses + entities (locally)
4. **QVAC embeddings** dedupe entities across pages (locally)
5. For each unique address, the agent autonomously pays a remote intelligence API in **USDT-SPL on Solana** via **HTTP 402 (x402)**
6. The Sentinel API verifies the on-chain payment, queries the **real OFAC SDN list**, returns the verdict
7. App renders a forensic report with evidence highlighting (page + bounding box)

**Demo target:** end-to-end in 8 seconds on a Mac M-series for a 5-7 page PDF.

---

## Tech stack

| Layer | Tech |
|-------|------|
| Desktop shell | Electron + electron-vite + React + TypeScript + Tailwind |
| AI inference | `@qvac/sdk` (LLM + OCR + Embeddings, three modules used deeply) |
| Wallet | `@tetherto/wdk-wallet-solana` v1.0.0-beta.8 + `@tetherto/pear-wrk-wdk` Bare worklet |
| Chain | Solana devnet (mock USDT-SPL minted for the demo) |
| Payment protocol | HTTP 402 / x402 |
| Backend | Hono on Cloudflare Workers (KV + R2 + Cron) |
| Persistence | better-sqlite3 (history), keytar (mnemonic), electron-store (settings) |
| OFAC data | US Treasury SDN List XML, refreshed daily |

See [`docs/architecture.md`](docs/architecture.md) for the full system spec.

---

## Quickstart

### Prerequisites

- Node.js ≥ 22.17
- pnpm ≥ 10.15
- macOS arm64 (M1+) recommended for the demo (Metal GPU); Linux/Windows work but CPU-fallback is slower

### Install + run

```bash
# Clone and install
git clone https://github.com/victorjayeoba/sovereign.git
cd sovereign
pnpm install
```

Sovereign needs **two processes running** — the desktop app and the Sentinel
API. Open two terminals:

```bash
# Terminal 1 — Sentinel API on http://localhost:8787
# This is the *third-party* the agent autonomously pays for intel.
pnpm dev:sentinel
```

```bash
# Terminal 2 — Sovereign desktop app
# Opens an Electron window connected to localhost:8787.
pnpm dev
```

Both must be running for the agent's autonomous-payment flow to work end-to-end.

### Real QVAC backend (Mac M-series recommended)

By default Sovereign uses a deterministic mock backend so dev iteration is
fast. To run the real `@qvac/sdk` models (~1.35 GB downloaded on first run):

```bash
# macOS / Linux
SOVEREIGN_QVAC_BACKEND=real pnpm dev

# Windows PowerShell
$env:SOVEREIGN_QVAC_BACKEND="real"; pnpm dev
```

First boot pulls the LLM (700 MB), Embed (600 MB), and OCR (50 MB) models
from QVAC's Hyperswarm registry. Subsequent boots are instant.

### First-run model download

QVAC models (~1.4 GB total) download on first launch from the QVAC P2P registry into `~/.qvac/models/`:

- `LLAMA_3_2_1B_INST_Q4_0` — ~700 MB
- `GTE_LARGE_FP16` — ~600 MB
- OCR (CRAFT detector + Latin recognizer) — ~50 MB

To pre-cache on a demo machine:

```bash
pnpm tsx scripts/warmup-models.ts
```

---

## Project structure

```
sovereign/
├── apps/
│   ├── desktop/           # Electron app (main + preload + renderer)
│   └── sentinel/          # Cloudflare Worker — paywalled OFAC lookup API
├── packages/
│   └── shared/            # Zod schemas, IPC contract, constants
├── scripts/               # Warmup, faucet, deploy helpers
├── docs/
│   ├── architecture.md
│   ├── architecture-backend.md
│   └── architecture-ai.md
├── demo-assets/           # Sample PDFs, recorded video
└── .claude/
    ├── agents/            # AI Engineer, Backend Architect agent personas
    └── skills/
        └── sovereign-ui-architect/
```

---

## Demo flow (60 seconds)

| Time | Action |
|------|--------|
| 0:00 | User drops `meridian_atlas_memo.pdf` |
| 0:01 | **WiFi OFF** — Privacy Badge pulses |
| 0:01-0:08 | QVAC pipeline runs entirely offline. Scan Stream renders OCR, entity findings, dedup clusters. |
| 0:08 | Local extraction complete. Report card materializes with "lookup pending" badges. |
| 0:09 | **WiFi ON** |
| 0:09-0:11 | Agent autonomously pays Sentinel for each address. Settlement toasts: "0.05 USDT-SPL → ✓ confirmed in 1.4s" |
| 0:11 | Final report: 1 OFAC-flagged (Lazarus Group, DPRK), 1 Tornado Cash mixer, 2 clean. Total: $0.20 USDT in 11 seconds. |

---

## License

MIT
