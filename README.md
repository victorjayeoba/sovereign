# Sovereign

**Forensic AI that pays its own way.**

A local-first desktop agent that reads sensitive documents, extracts on-chain
entities with on-device AI, and autonomously pays a remote intelligence API in
**USDT-SPL on Solana via HTTP 402** — without the document ever leaving your
machine.

Built for the **Colosseum Frontier hackathon** + **Tether QVAC side track**,
May 2026. Repo: [`github.com/victorjayeoba/sovereign`](https://github.com/victorjayeoba/sovereign).

---

## Demo

**Watch the 3-minute demo:** [`<DEMO_VIDEO_LINK>`](#)

> _Replace this placeholder with the public YouTube / Loom link before
> submission._

A sample input document is included at the repo root:
[`Meridian Capital Partners — Project ATLAS Risk Assessment.pdf`](./Meridian%20Capital%20Partners%20—%20Project%20ATLAS%20Risk%20Assessment.pdf).

---

## The problem

A journalist receives a leaked due-diligence file. A lawyer receives a
sealed discovery PDF. An auditor reviews an unreleased earnings report.

Sending any of these to a cloud LLM is the leak. But local LLMs are blind —
they can't reach paid intelligence APIs, and they can't transact.

**Sovereign** is the first local-first agent with its own non-custodial
wallet that can autonomously pay for live external data, without leaking
the document that prompted the question.

---

## How it works

1. User drops a sensitive PDF into the desktop app
2. **QVAC OCR** rasterizes and reads every page — fully on-device
3. **QVAC LLM (Llama 3.2 1B)** extracts named entities and wallet addresses
   via structured tool calling, and attributes each wallet to its stated
   owner — fully on-device
4. **QVAC Embeddings (GTE-large)** cluster duplicate entities across pages
   so one wallet referenced three times becomes one finding — fully on-device
5. For each unique address, the agent calls the **Sentinel API**, which
   returns **HTTP 402 Payment Required**
6. The agent's **WDK Solana wallet** signs a **USDT-SPL payment** on Solana
   devnet and re-requests with the payment proof
7. Sentinel verifies the on-chain transfer, queries the **real OFAC SDN
   list**, and returns a verdict
8. The desktop app renders a forensic report with per-finding evidence
   (source page, bounding box, owner attribution, sanction status)

**The only data that ever leaves the device is a public wallet address,
after the user explicitly clicks "investigate."** The document, the
prompts, the intermediate reasoning, and the embeddings never touch the
network.

---

## How we used QVAC (3 modules, deeply integrated)

The depth-of-integration judging weight (40%) is the primary axis we
optimized for. Every QVAC module is load-bearing in the demo path — none of
them are decorative.

| QVAC module | Model | Used for | File |
|---|---|---|---|
| **LLM with tool calling** | `LLAMA_3_2_1B_INST_Q4_0` (~700 MB) | Forced `extract_entities` tool call per page. Pulls out people, organizations, wallet addresses, dates, amounts, locations, and attributes each wallet to its on-page owner via a Zod-typed structured output. Hallucinated wallet addresses are rejected against a regex pre-pass. | [`apps/desktop/src/main/qvac/real.ts:195-294`](./apps/desktop/src/main/qvac/real.ts#L195-L294) |
| **OCR** | `OCR_CRAFT_DETECTOR` + `OCR_LATIN_RECOGNIZER_1` (~50 MB) | Streams text blocks with 4-corner polygon bounding boxes for every rasterized PDF page. Bounding boxes power the evidence highlighting in the final report. | [`apps/desktop/src/main/qvac/real.ts:160-193`](./apps/desktop/src/main/qvac/real.ts#L160-L193) |
| **Embeddings** | `GTE_LARGE_FP16` (~600 MB, 1024-dim) | Semantic deduplication of entity mentions across pages, so "Meridian Treasury Wallet" on page 2 and "Meridian's main wallet" on page 7 collapse into one finding. Batched embedding API used for throughput. | [`apps/desktop/src/main/qvac/real.ts:296-308`](./apps/desktop/src/main/qvac/real.ts#L296-L308) |

All three models are loaded eagerly via a single Bare-runtime worker through
the umbrella [`@qvac/sdk`](https://www.npmjs.com/package/@qvac/sdk) package
at app boot. Inference is accelerated by Metal on macOS, Vulkan on
Linux/Windows, with CPU fallback.

A deterministic **mock backend** mirrors the same interface so the team can
iterate on UI and pipeline logic on any machine without paying the model
load cost. The backend is switched with one env var:

```
SOVEREIGN_QVAC_BACKEND=real   # use @qvac/sdk (Mac M-series recommended)
SOVEREIGN_QVAC_BACKEND=mock   # deterministic stub (default)
```

See [`apps/desktop/src/main/qvac/`](./apps/desktop/src/main/qvac/) for the
full engine abstraction.

---

## How we used WDK + USDT

| Tether product | Use |
|---|---|
| **WDK Solana wallet** (`@tetherto/wdk-wallet-solana` v1.0.0-beta.8) | Generates a 24-word BIP-39 mnemonic on first run, stored in OS keychain via `keytar`. Signs USDT-SPL transfers autonomously when the Sentinel API returns HTTP 402. SLIP-0010 derivation path `m/44'/501'/0'/0'`. |
| **USDT-SPL on Solana devnet** | Settlement asset for every Sentinel lookup. Each address investigation costs 0.05 USDT, settled in ~1.2s on Solana devnet. The Sentinel API verifies the on-chain transfer before returning intel. |
| **x402 (HTTP 402 Payment Required)** | The payment-required-then-pay-then-retry handshake between the agent and the Sentinel API. Implemented end-to-end against the proposed x402 spec. |

The three Tether products are designed to be used together — QVAC gives the
agent a private brain, WDK gives it a wallet, and USDT gives it a unit of
account. **Sovereign is the only hackathon entry (as of submission) that
uses all three on the demo path.**

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                  Sovereign Desktop (Electron + React)                   │
│                                                                         │
│  ┌─────────────┐   ┌──────────────────────────────────────────────┐    │
│  │  Renderer   │◄──┤  Main process                                │    │
│  │  (React)    │   │  ┌────────────────────────────────────────┐  │    │
│  └─────────────┘   │  │  QVAC engine (Bare runtime)            │  │    │
│         ▲          │  │   • LLAMA_3_2_1B + tool calls          │  │    │
│         │ IPC      │  │   • OCR (CRAFT + Latin)                │  │    │
│         │          │  │   • GTE_LARGE_FP16 embeddings          │  │    │
│         ▼          │  └────────────────────────────────────────┘  │    │
│  ┌─────────────┐   │  ┌────────────────────────────────────────┐  │    │
│  │  Pipeline   │◄──┤  WDK Solana wallet (pear-wrk-wdk worklet)  │  │    │
│  │ orchestrator│   │   • BIP-39 mnemonic in OS keychain         │  │    │
│  └─────────────┘   │   • Signs USDT-SPL transfers               │  │    │
│                    │  └────────────────────────────────────────┘  │    │
│                    └──────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                          │                            ▲
                          │ HTTP 402 / x402            │ USDT-SPL transfer
                          ▼                            │ on Solana devnet
┌─────────────────────────────────────────────────────────────────────────┐
│        Sentinel API (Cloudflare Workers + Hono)                         │
│           1. Return 402 with price + recipient                          │
│           2. Verify on-chain transfer on retry                          │
│           3. Query OFAC SDN list + mixer linkage data                   │
│           4. Return forensic verdict                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

Detailed architecture docs:

- [`docs/architecture.md`](./docs/architecture.md) — system overview
- [`docs/architecture-ai.md`](./docs/architecture-ai.md) — QVAC pipeline
- [`docs/architecture-backend.md`](./docs/architecture-backend.md) — Sentinel + x402

---

## Tech stack

| Layer | Tech |
|---|---|
| Desktop shell | Electron 33 + electron-vite + React 18 + TypeScript + Tailwind |
| On-device AI | [`@qvac/sdk`](https://www.npmjs.com/package/@qvac/sdk) v0.9.1 (LLM + OCR + Embeddings) |
| Wallet | [`@tetherto/wdk-wallet-solana`](https://www.npmjs.com/package/@tetherto/wdk-wallet-solana) v1.0.0-beta.8 in a Bare worklet |
| Chain | Solana devnet, USDT-SPL settlement |
| Payment protocol | HTTP 402 / x402 |
| Sentinel API | Hono on Cloudflare Workers |
| OFAC data | US Treasury SDN list, refreshed daily |
| PDF rasterization | `pdfjs-dist` (PDF → canvas → buffer → QVAC OCR) |
| Persistence | better-sqlite3 (history), keytar (mnemonic), electron-store (settings) |
| Validation | Zod schemas, shared across renderer / main / Worker |

---

## Repository layout

```
sovereign/
├── apps/
│   ├── desktop/      Electron app (main + preload + renderer)
│   ├── sentinel/     Cloudflare Worker — paywalled OFAC lookup API
│   └── landing/      Public Next.js landing page
├── packages/
│   └── shared/       Zod schemas, IPC contract, constants
├── scripts/          warmup-models, faucet, deploy helpers
├── docs/             Architecture specs
├── demo-assets/      Sample documents and recordings
└── Meridian Capital Partners — Project ATLAS Risk Assessment.pdf
```

---

## Quickstart

### Prerequisites

- Node.js ≥ 22.17 (see `.nvmrc`)
- pnpm ≥ 10.15
- macOS arm64 (M1+) recommended for `real` QVAC backend (Metal). Linux and
  Windows work but fall back to CPU inference.

### Install

```bash
git clone https://github.com/victorjayeoba/sovereign.git
cd sovereign
pnpm install
```

### Run (two terminals)

```bash
# Terminal 1 — Sentinel API on http://localhost:8787
pnpm dev:sentinel

# Terminal 2 — Sovereign desktop app
pnpm dev
```

Both must be running for the autonomous-payment flow to work end-to-end.

By default the desktop app boots with the **mock QVAC backend** so iteration
is fast. To run the real models (~1.35 GB downloaded on first run):

```bash
# macOS / Linux
SOVEREIGN_QVAC_BACKEND=real pnpm dev

# Windows PowerShell
$env:SOVEREIGN_QVAC_BACKEND="real"; pnpm dev
```

To pre-cache the QVAC models on a demo machine before judging:

```bash
pnpm tsx scripts/warmup-models.ts
```

---

## Demo flow (60 seconds)

| Time | Action |
|---|---|
| 0:00 | User drops `Meridian Capital Partners — Project ATLAS Risk Assessment.pdf` |
| 0:01 | **Airplane mode ON** — privacy badge pulses, network panel goes flat |
| 0:01–0:08 | QVAC pipeline runs entirely offline. Scan-stream renders OCR blocks, entity findings, and dedup clusters in real time |
| 0:08 | Local extraction complete. Report materializes with "lookup pending" badges next to each wallet |
| 0:09 | **Airplane mode OFF** |
| 0:09–0:11 | Agent autonomously pays Sentinel for each unique address. Settlement toasts: `0.05 USDT-SPL → confirmed in 1.2s` |
| 0:11 | Final report: 1 OFAC-flagged (Lazarus Group, DPRK), 1 Tornado Cash exit, 2 clean. Total spent: $0.20 USDT in 11 seconds |

---

## Hackathon context

- **Event:** [Colosseum Frontier](https://arena.colosseum.org) (May 2026)
- **Side track:** Tether QVAC bonus prize pool
- **Judging weights:** QVAC integration depth 40%, Product value 30%,
  Innovation 20%, Demo quality 10%

---

## License

MIT — see [`LICENSE`](./LICENSE).
