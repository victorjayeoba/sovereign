# Sovereign — Handoff Document

**Last updated:** 2026-05-09 (~50 hours before submission deadline)

This document is for an agent or developer picking up the Sovereign build mid-stream. It's self-contained: read this and you have everything needed to continue without context from the original conversation.

---

## 1. The Project in One Page

**Sovereign** is a desktop forensic AI app being built for the **Colosseum Frontier hackathon** (Solana ecosystem) with a side-track entry for the **Tether QVAC track**.

**Tagline:** *"Forensic AI that pays its own way."*

**What it does:** A user drops a sensitive PDF. Local AI (QVAC) extracts wallet addresses + entities entirely on-device. For each unique address, the app autonomously pays a remote intelligence API (Sentinel) in USDT-SPL on Solana via HTTP 402 (x402). Sentinel verifies the on-chain payment, looks the address up against the real OFAC SDN list, returns a verdict. Output: forensic report with evidence highlighting.

**Demo target:** end-to-end in 8 seconds on Mac M-series for a 5-7 page PDF with ~5 wallet addresses. (Slower on Windows — see §6.)

**Hackathon context:**
| | |
|---|---|
| Submission deadline | **2026-05-11 23:59 PDT** (= 2026-05-12 06:59 UTC) |
| Judging weights | **40% QVAC depth**, 30% product value, 20% innovation, 10% demo quality |
| Prizes | $10k main pool (5/3/2k) + $10k QVAC side track bonus |
| Submit to | (1) arena.colosseum.org (main), (2) Superteam Earn QVAC listing |

**The two pitch beats:**
1. **Phase 1 (offline)**: airplane mode → drop PDF → QVAC extracts entities locally. *"Document never leaves the device."*
2. **Phase 2 (online)**: airplane mode off → agent autonomously signs USDT-SPL transfers and queries Sentinel for each address. Settlement toasts pop. Final report renders.

---

## 2. Locked Tech Stack

| Layer | Choice |
|-------|--------|
| Desktop shell | Electron 33 + electron-vite + React 18 + TypeScript + Tailwind |
| AI inference | `@qvac/sdk` (LLM + OCR + Embeddings — three modules used deeply) |
| Wallet | `@tetherto/wdk-wallet-solana@1.0.0-beta.8` + `@tetherto/pear-wrk-wdk` Bare worklet |
| Chain | Solana **devnet** (mock USDT-SPL mint we deploy ourselves — real USDT-SPL is mainnet-only) |
| Payment protocol | HTTP 402 / x402 |
| Backend | Hono on Cloudflare Workers (the "Sentinel API") |
| Persistence | Plan: better-sqlite3 + keytar (not yet wired) |
| OFAC data | US Treasury SDN List XML (currently a curated fixture; cron refresh planned) |
| Monorepo | pnpm workspaces |

Architecture details: `docs/architecture.md`, `docs/architecture-backend.md`, `docs/architecture-ai.md`.

UI design system: `.claude/skills/sovereign-ui-architect/SKILL.md` (the "Classy Arctic" — Linear precision + Raycast glass material).

---

## 3. Repository Layout

```
sovereign/
├── package.json                  pnpm workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .npmrc                        public-hoist for electron, types
├── README.md
│
├── apps/
│   ├── desktop/                  Electron desktop app
│   │   ├── package.json
│   │   ├── electron.vite.config.ts
│   │   ├── electron-builder.yml
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.{node,web}.json
│   │   └── src/
│   │       ├── main/
│   │       │   ├── index.ts                  app boot, window, registers IPC
│   │       │   ├── ipc/handlers.ts           qvac:status/warmup/test, app:openExternal
│   │       │   └── qvac/
│   │       │       ├── types.ts              QvacEngine interface
│   │       │       ├── singleton.ts          backend selector + lifetime mgr
│   │       │       ├── mock.ts               MockQvacEngine (deterministic, fast)
│   │       │       └── real.ts               RealQvacEngine STUB (throws — replace on Mac)
│   │       ├── preload/index.ts              self-contained contextBridge
│   │       └── renderer/src/
│   │           ├── App.tsx                   bento grid layout
│   │           ├── main.tsx
│   │           ├── styles/globals.css        glass material, fonts
│   │           ├── lib/cn.ts                 clsx + tailwind-merge
│   │           └── components/
│   │               ├── GlassCard.tsx
│   │               ├── Sidebar.tsx
│   │               ├── PrivacyBadge.tsx      "100% Local Inference" pulse
│   │               ├── QvacStatus.tsx        live module status pill
│   │               ├── DropZone.tsx          drag-drop UI (not yet wired to pipeline)
│   │               ├── ScanStream.tsx        live log (currently uses hardcoded demo data)
│   │               ├── SettlementToast.tsx
│   │               └── WalletStatus.tsx
│   │
│   └── sentinel/                 Cloudflare Worker (Hono)
│       ├── package.json
│       ├── wrangler.toml
│       ├── .dev.vars.example
│       └── src/
│           ├── index.ts
│           ├── types.ts
│           ├── ofac/
│           │   ├── data/sdn-fixture.ts       Lazarus + Tornado Cash + Garantex addrs
│           │   ├── matcher.ts                in-process address index
│           │   └── parser.ts                 SDN XML stub (unused currently)
│           ├── x402/challenge.ts             402 challenge generator
│           ├── intent/store.ts               in-memory nonce store (TTL)
│           ├── solana/verify-tx.ts           USDT-SPL tx verifier (direct JSON-RPC)
│           └── routes/
│               ├── health.ts                 GET /v1/health
│               ├── lookup.ts                 POST /v1/lookup (the meat)
│               └── sdn.ts                    GET /v1/sdn/version, POST /v1/sdn/refresh
│
├── packages/shared/
│   └── src/
│       ├── index.ts
│       ├── schemas.ts                        Zod: Entity, X402Challenge, LookupReq/Resp, etc.
│       ├── ipc-contract.ts                   IPC channel constants + SovereignApi type
│       └── constants.ts                      USDT mint, RPC URLs, regex patterns
│
├── scripts/
│   └── warmup-models.ts                      QVAC pre-cache (placeholder)
│
├── docs/
│   ├── architecture.md                       Unified spec
│   ├── architecture-backend.md               System + IPC + Sentinel + deployment
│   ├── architecture-ai.md                    QVAC pipeline + 8s budget
│   └── handoff.md                            ← THIS FILE
│
├── demo-assets/                              (placeholder for sample PDF + recorded video)
│
└── .claude/
    ├── agents/
    │   ├── engineering-ai-engineer.md
    │   └── engineering-backend-architect.md
    └── skills/
        └── sovereign-ui-architect/SKILL.md   The Classy Arctic design system
```

---

## 4. State of Each Component

### ✅ DONE — Working end-to-end

| Component | What works |
|-----------|------------|
| **Workspace + Electron skeleton** | `pnpm install` clean. `pnpm dev` opens window. Vite HMR works. |
| **Classy Arctic UI** | Sidebar, glass cards, bento grid, fonts (Bricolage/Inter/Instrument Sans), cyan accents, settlement toast — all rendered per skill spec. |
| **Sentinel API (local)** | `pnpm --filter sentinel dev` runs on `localhost:8787`. `GET /v1/health` returns 200. `POST /v1/lookup` returns 402 challenge with valid nonce/intent. |
| **OFAC matcher** | Curated fixture with real Lazarus / Tornado Cash / Garantex addresses. `lookupAddress(addr)` returns matches. |
| **x402 challenge generator** | Creates UUID nonces, persists in in-memory store with 60s TTL, returns valid x402 challenge body. |
| **Solana tx verifier** | Direct JSON-RPC implementation (no `@solana/web3.js` bloat) ready to verify USDT-SPL transferChecked. Will work once a real tx is signed against the deployed mock USDT mint. |
| **QvacEngine interface** | Clean abstraction over OCR / LLM tool-calling / embeddings. |
| **MockQvacEngine** | Loads in ~1.5s, returns deterministic placeholder data. Fast iteration on any machine. |
| **QVAC singleton** | Backend selector via `SOVEREIGN_QVAC_BACKEND=real\|mock` env. Real backend lazy-loaded with try/catch fallback. |
| **IPC plumbing** | `qvac:status`, `qvac:warmup`, `qvac:test`, `qvac:load-progress`, `qvac:ready`, `qvac:error` all flowing. Verified via the live `QvacStatusPill` in the header. |
| **Preload bridge** | Self-contained (no workspace-package runtime imports). `window.sovereign` exposed cleanly. |

### 🟡 STUBBED (interface ready, real impl pending)

| Component | What's stubbed |
|-----------|----------------|
| **RealQvacEngine** | `apps/desktop/src/main/qvac/real.ts` is a throwing stub. Replace with `@qvac/sdk` calls once on Mac. Mock fallback kicks in automatically if real init fails. |
| **OFAC SDN parser** | `apps/sentinel/src/ofac/parser.ts` returns `[]`. Curated fixture works for the demo; cron-driven XML refresh comes later. |
| **scripts/warmup-models.ts** | Placeholder logs only. Implement once `@qvac/sdk` is wired. |

### 🔴 NOT BUILT YET

| Component | What's missing |
|-----------|----------------|
| **Pipeline orchestrator** | No `apps/desktop/src/main/pipeline/orchestrator.ts` yet. DropZone is unwired. ScanStream shows hardcoded `useDemoScanLines()` array. |
| **PDF rasterization** | No pdfjs-dist integration. Recommended: do text extraction + page rendering renderer-side via pdfjs-dist's web worker, then send page text + (optional) image buffers to main. |
| **Real entity extraction** | Mock only. Real path: regex sweep (already in `packages/shared/src/constants.ts: ADDRESS_PATTERNS`) + QVAC LLM tool call with Zod schema (`packages/shared/src/schemas.ts: ExtractEntitiesArgsSchema`). |
| **Embedding-based dedup** | Mock embeddings exist; clustering algorithm not yet wired. Threshold `ENTITY_DEDUP_THRESHOLD = 0.92` defined in shared constants. |
| **WDK wallet integration** | No wallet code in main. Architecture spec calls for: BIP-39 mnemonic via `@scure/bip39` inside Bare worklet, key stored in OS keychain via `keytar`, signing isolated to `@tetherto/pear-wrk-wdk` worker. |
| **Mock USDT-SPL mint on devnet** | Wrangler.toml has `USDT_MINT_DEVNET = "PLACEHOLDER_..."`. Need to deploy a mock SPL token mint on devnet, mint some to a faucet wallet, set the address in env. |
| **x402 client (Electron side)** | Architecture exists in spec; no code yet. Detect 402 → ask wallet to sign → POST retry with `X-Payment` header. |
| **Sentinel deploy** | Currently runs locally only via `wrangler dev`. Need `wrangler deploy` to a public URL (free Cloudflare Workers tier). |
| **Persistence (sqlite)** | No `runs` / `entities` tables yet. Architecture defines the schema in `docs/architecture-backend.md §6`. |
| **Demo PDF** | A draft of `meridian_atlas_memo.pdf` content was produced in the planning conversation (a fake "Meridian Capital" pre-investment memo with real OFAC-sanctioned addresses embedded). Not yet committed to `demo-assets/`. |
| **Pitch deck + demo video** | Nothing recorded yet. Plan: 5 slides, 3-min video. |

---

## 5. How to Run (cold start)

### Prerequisites

- Node.js ≥ 22.17 (user has 22.17.1)
- pnpm ≥ 10.15 (user has 10.15.1)
- Windows 10+ x64 (user) — works fine for development. Mac M-series strongly recommended for the actual demo.

### Install + run

```powershell
cd c:\Users\HI\hack\tether\sovereign
pnpm install                             # ~3 min, downloads Electron binary
```

Two terminals:

```powershell
# Terminal 1 — Sentinel API
pnpm --filter sentinel dev               # listens on http://localhost:8787

# Terminal 2 — Electron desktop app
pnpm dev                                 # opens window with QVAC mock loading
```

### Smoke tests (Sentinel)

```powershell
# Health
curl.exe http://localhost:8787/v1/health

# 402 challenge (use curl.exe — PowerShell's curl alias has different syntax)
curl.exe -X POST http://localhost:8787/v1/lookup `
  -H "Content-Type: application/json" `
  -d '{\"address\":\"0x098B716B8Aaf21512996dC57EB0615e2383E2f96\",\"chain\":\"ethereum\"}'
```

Expected: 200 OK with `sdnEntries: 3` for health, 402 with payment intent JSON for lookup.

### Smoke tests (Desktop)

After `pnpm dev`:
- Window opens with DevTools auto-detached (in dev only)
- DevTools Console shows: `[preload] window.sovereign exposed — keys: [...]`
- Header pill animates "QVAC Loading 0% → 33% → 66% → QVAC Ready · Mock"
- Three small dots fill cyan one-at-a-time as OCR / Embed / LLM "load"

---

## 6. Critical Constraints (don't relitigate)

- **Solo developer** with ~50 hours till deadline as of writing.
- **Windows 11, Intel Iris Xe, 16 GB RAM, recently freed up ~35 GB** of disk. Demo MUST run on Mac M-series for the 8s budget. Solo dev plans to find a Mac before May 10 to record the demo. If no Mac available, fallback is a slower Windows demo with a "production target: M-series" disclaimer.
- **QVAC won't load on Windows easily** — needs Vulkan ICD, performance is poor on Iris Xe (~10 tok/s vs Mac's 120 tok/s). Hence the mock-first strategy. Real `@qvac/sdk` integration happens on Mac via `SOVEREIGN_QVAC_BACKEND=real`.
- **USDT-SPL on Solana mainnet only.** For demo we deploy our own mock SPL mint on devnet and hardcode it. Document this clearly in the pitch and README — it's a hackathon norm.
- **`sandbox: false`** in `webPreferences` is required so the bundled preload can use bundled deps. Renderer security still preserved by `contextIsolation: true` + `nodeIntegration: false`. Same as VS Code, Discord, Slack.
- **Preload outputs `index.mjs`** (not `.js`) because `apps/desktop/package.json` has `"type": "module"`. Main process loads via `join(__dirname, '../preload/index.mjs')`. **Do not change without updating the path.**
- **`.npmrc` hoists electron + electron-vite** to root via `public-hoist-pattern[]=...`. Without this, the bin shim in `apps/desktop/node_modules/.bin/electron-vite` doesn't resolve.
- **`electron-vite` config excludes `@sovereign/shared` from `externalizeDepsPlugin`** so the workspace package is bundled into main + preload (not externalized).
- **Preload is fully self-contained** — no `@sovereign/shared` runtime imports. Channel name strings are duplicated and must be kept in sync with `packages/shared/src/ipc-contract.ts`. This was a deliberate robustness choice after fighting bundler issues.

---

## 7. The Next Chunks (in priority order)

### 🎯 Next: pipeline orchestrator (mock end-to-end)

**Goal:** drop a PDF (or click DropZone) → 5 seconds of streaming events → ScanStream populates live → Forensic Findings card renders entities → Settlement Toasts pop.

**No real PDF parsing yet — mock everything.** This validates the IPC flow end-to-end, gives a visible win, and lays the path for real implementation.

**Files to create:**

- `apps/desktop/src/main/pipeline/orchestrator.ts` — A class `PipelineOrchestrator` with `start({ pdfPath, runId })` method that emits events over ~5s:
  - 0ms: emit `pipeline:progress` `{ stage: 'rasterize', pct: 0 }`
  - 600ms: `{ stage: 'rasterize', pct: 100 }` then `{ stage: 'ocr', pct: 0 }`
  - 600-3000ms: stream `pipeline:entity-found` events (use `mockQvac.ocr()` then `mockQvac.extractEntities()`)
  - 3000ms: `{ stage: 'dedup', pct: 0..100 }`
  - 3500ms: `{ stage: 'lookup', pct: 0 }` — for each address, emit a fake `pipeline:lookup-result` with mocked OFAC verdict
  - 5000ms: `pipeline:done` with totals
- `apps/desktop/src/main/pipeline/types.ts` — Run state types

**IPC handlers to add to `apps/desktop/src/main/ipc/handlers.ts`:**

```ts
ipcMain.handle(IPC_CHANNELS.PIPELINE_START, async (_e, req: PipelineStartRequest) => {
  const runId = crypto.randomUUID()
  // Fire orchestrator (don't await), events stream back via webContents.send
  void orchestrator.start({ pdfPath: req.pdfPath, runId, sendToRenderer })
  return { runId }
})

ipcMain.handle(IPC_CHANNELS.PIPELINE_CANCEL, async (_e, req: { runId: string }) => {
  return orchestrator.cancel(req.runId)
})
```

**Renderer wiring:**

- `apps/desktop/src/renderer/src/App.tsx`: replace `useDemoScanLines()` with state hooked to pipeline events
- `apps/desktop/src/renderer/src/components/DropZone.tsx`: on file drop or click, call `window.sovereign.pipeline.start({ pdfPath: file.name })` (filepath isn't real — mock pipeline ignores it)
- New: `apps/desktop/src/renderer/src/store/pipeline.ts` — Zustand store for: current runId, scan lines (push from events), entities (push from events), lookups (push from events)
- Build a `<ForensicReport entities={entities} />` component to replace the placeholder text in the bottom-right card
- Show settlement toasts as lookups complete

**Acceptance test:**
1. Click "Drop a document"
2. Watch ScanStream populate live with `[t.tt] OCR → Page X / N extracted`, `LLM → 4 wallets · 8 entities`, `EMBED → ... clusters`, `FLAG → 0x098B71... matched OFAC SDN`, `PAY → 0.05 USDT-SPL`, `TX → ... confirmed`
3. ForensicReport card renders: 4 addresses, 1 OFAC-flagged, 0.20 USDT total
4. Settlement toasts slide in for each "payment"
5. After ~5s, `pipeline:done` fires, ScanStream goes idle

### After that, in order:

| # | Chunk | Files | Hours |
|---|-------|-------|-------|
| 1 | **Real pdfjs-dist text extraction** (renderer-side) — `pdfjs-dist` web worker reads PDF, extracts text per page, sends to main with `runId` | `apps/desktop/src/renderer/src/lib/pdfRead.ts` + worker setup | 2-3 |
| 2 | **Real regex address sweep** wired into orchestrator (replaces mock-only entity flow) | Update `orchestrator.ts` | 0.5 |
| 3 | **Real LLM tool call** through `MockQvacEngine.extractEntities()` (the mock already returns reasonable shapes) — switch to real on Mac | Already wired; just remove placeholder | 0 |
| 4 | **Embedding dedup wired** in orchestrator (call `mockQvac.embedBatch()`, cluster, emit deduped entities) | Update `orchestrator.ts` | 1-2 |
| 5 | **WDK Solana wallet** — first-run wallet creation, BIP-39 mnemonic in keychain (`keytar`), USDT-SPL signing | `apps/desktop/src/main/wallet/wallet-service.ts` + `keystore.ts` + `faucet.ts`. Architecture spec in `docs/architecture-backend.md §5`. | 4-5 |
| 6 | **Deploy mock USDT-SPL mint on devnet** — script that creates the mint + ATA + airdrops. Set wrangler.toml vars. | `scripts/deploy-mock-usdt.ts` | 2 |
| 7 | **x402 client** — replace mock pipeline lookup step with real Sentinel call: `fetch(SENTINEL_URL/v1/lookup) → 402 → sign tx → retry with X-Payment` | `apps/desktop/src/main/x402/client.ts` + `solana-pay.ts` | 3 |
| 8 | **Deploy Sentinel to Cloudflare** — `wrangler deploy`. Update `.env` with public URL. | (config only) | 1 |
| 9 | **End-to-end smoke test** — drop PDF → real OCR (mock) → real entities → real Sentinel call with real USDT-SPL devnet payment → real OFAC verdict | Integration | 2 |
| 10 | **Mac handoff** — clone repo on Mac, `pnpm add @qvac/sdk` in apps/desktop, replace `RealQvacEngine` stub with real `loadModel()` calls, run warmup, set `SOVEREIGN_QVAC_BACKEND=real` | `apps/desktop/src/main/qvac/real.ts` rewrite | 4-5 |
| 11 | **Pre-cache models on demo Mac** | `scripts/warmup-models.ts` | 1 |
| 12 | **Build + record demo video** (3 min, YouTube unlisted) | demo-assets/ | 3 |
| 13 | **Pitch deck** (5 slides) | demo-assets/ | 2 |
| 14 | **Submit** to Colosseum + Superteam Earn | (process) | 1 |

**Estimated remaining effort: ~35-40 hours.** Tight but doable in 50 hours.

---

## 8. Critical Decisions Already Made (don't relitigate)

1. **Vertical pivot: forensic doc analyzer, not generic agent.** The pitch is "drop a PDF, get a flagged-entity report" — not a chatbot, not a multi-purpose agent. Deterministic pipeline. No chat UI. (See conversation history for the VC reality-check that drove this pivot.)

2. **3 QVAC modules deeply, not 5 superficially.** Cut SmolVLM2 multimodal, Hyperswarm DHT delegated inference, RAG package, translation, STT, TTS. The judging weight is depth, not breadth.

3. **Mock USDT-SPL on devnet.** Real USDT-SPL is mainnet-only. We deploy a mock mint, hardcode its address, and pay against that. Document clearly.

4. **Cloudflare Workers, not Fly.io, for Sentinel.** 0ms cold start, free KV+R2+Cron, no infra babysitting.

5. **Self-contained preload (no workspace runtime imports).** Channel constants duplicated in preload to avoid bundler fights.

6. **`sandbox: false`** for the renderer's webPreferences — standard for Electron desktop apps. Renderer security via `contextIsolation: true`.

7. **Mac M-series for the demo, Windows for development.** Running QVAC on Intel Iris Xe is technically possible but slow. The 8s claim is for Mac.

---

## 9. Useful Pointers

- **UI design system:** `.claude/skills/sovereign-ui-architect/SKILL.md` — invoke this skill before doing any UI work. The Classy Arctic look is specific (Bricolage Grotesque + Inter + Instrument Sans, ice-blue glass `rgba(173,230,255,0.05)`, `backdrop-filter: blur(25px) saturate(160%)`, electric cyan `#00D1FF` for active states only).

- **Agent personas (advisory only):** `.claude/agents/engineering-ai-engineer.md`, `.claude/agents/engineering-backend-architect.md`. These are for guidance — `subagent_type` registration may not work in all environments; if not, embed the persona inline in agent prompts.

- **Architecture references:**
  - `docs/architecture.md` — synthesized spec
  - `docs/architecture-backend.md` — Electron, IPC, Sentinel, deployment
  - `docs/architecture-ai.md` — QVAC pipeline, latency budget

- **Hackathon details:** `c:\Users\HI\hack\tether\hackathondetails.txt` (parent directory, not in this repo)

- **The user's GitHub repo:** https://github.com/victorjayeoba/sovereign (currently empty — repo needs initial push at some point)

- **Memory across conversations:** `C:\Users\HI\.claude\projects\c--Users-HI-hack-tether\memory\` — has 7 memory files about user preferences, project decisions, hackathon constraints, demo API plan, tech stack, pitch scenario.

---

## 10. Quick Start for the Next Agent

1. Read this file (you're doing it)
2. Read `docs/architecture.md`
3. Run the smoke tests in §5 to confirm everything works on the dev machine
4. Pick up at "🎯 Next" in §7 — the pipeline orchestrator
5. Always invoke the `sovereign-ui-architect` skill before touching UI
6. When in doubt, optimize for: (a) does it work in the 60-second demo, (b) does it earn QVAC depth points

Good luck. The user wants 1st place — second place is failure.
