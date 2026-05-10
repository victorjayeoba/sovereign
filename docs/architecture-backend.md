# Sovereign — Backend & System Architecture Spec

**Version:** 1.0 | **Owner:** Backend Architect | **Implementation budget:** ~60h solo

---

## 1. Component Diagram

```
                     ┌──────────────────────────────────────────────────────┐
                     │                  ELECTRON DESKTOP APP                │
                     │                                                      │
   ┌──────────────┐  │  ┌──────────────┐    IPC    ┌──────────────────┐    │
   │   USER       │──┼─▶│  RENDERER    │◀─ipc─────▶│   PRELOAD        │    │
   │ (drops PDF)  │  │  │  React/Vite  │  bridge   │  contextBridge   │    │
   └──────────────┘  │  │  (sandboxed) │           │  exposeInMain    │    │
                     │  └──────────────┘           └────────┬─────────┘    │
                     │                                      │ ipcRenderer  │
                     │                                      ▼              │
                     │  ┌────────────────────────────────────────────────┐ │
                     │  │            MAIN PROCESS (Node)                 │ │
                     │  │                                                │ │
                     │  │  ┌─────────────┐   ┌─────────────────────┐    │ │
                     │  │  │ Orchestrator│──▶│  QVAC SINGLETON     │    │ │
                     │  │  │ (pipeline   │   │  Bare worklet       │    │ │
                     │  │  │  state mgr) │   │  • OCR • LLM • emb. │    │ │
                     │  │  └──────┬──────┘   └─────────────────────┘    │ │
                     │  │         │                                     │ │
                     │  │         │           ┌─────────────────────┐   │ │
                     │  │         ├──────────▶│  WDK WALLET WORKER  │   │ │
                     │  │         │           │ pear-wrk-wdk (Bare) │   │ │
                     │  │         │           │ holds priv key      │   │ │
                     │  │         │           └─────────────────────┘   │ │
                     │  │         │                                     │ │
                     │  │         │           ┌─────────────────────┐   │ │
                     │  │         └──────────▶│   x402 CLIENT       │   │ │
                     │  │                     │ HTTP fetch + pay    │   │ │
                     │  │                     └──────┬──────────────┘   │ │
                     │  │                            │                  │ │
                     │  │  ┌────────────────────┐    │                  │ │
                     │  │  │ better-sqlite3 DB  │    │                  │ │
                     │  │  │ (history, runs)    │    │                  │ │
                     │  │  └────────────────────┘    │                  │ │
                     │  │  ┌────────────────────┐    │                  │ │
                     │  │  │ keytar (mnemonic)  │    │                  │ │
                     │  │  └────────────────────┘    │                  │ │
                     │  └────────────────────────────┼──────────────────┘ │
                     └───────────────────────────────┼────────────────────┘
                                                     │ HTTPS
                  ┌──────────────────────────────────┼──────────────────────┐
                  │                                  ▼                      │
                  │  ┌─────────────────────┐   ┌─────────────────────┐     │
                  │  │  SOLANA DEVNET RPC  │◀──│  SENTINEL API       │     │
                  │  │ api.devnet.solana   │──▶│  Hono / CF Workers  │     │
                  │  │ getParsedTransac…   │   │  /lookup, /sdn-     │     │
                  │  └─────────────────────┘   │   refresh           │     │
                  │           ▲                └──────┬──────────────┘     │
                  │           │ transfer                │                   │
                  │           │ USDT-SPL                ▼                   │
                  │           │                ┌─────────────────────┐     │
                  │           └────────────────│  KV: ofac-sdn cache │     │
                  │                            │  R2: sdn.xml mirror │     │
                  │                            └─────────────────────┘     │
                  └─────────────────────────────────────────────────────────┘
```

## 2. Monorepo Structure

```
sovereign/
├── package.json                  # workspaces: ["apps/*", "packages/*"]
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .gitignore                    # node_modules, dist, out, *.db, .env*, models/
├── .env.example
│
├── apps/
│   ├── desktop/                  # Electron app
│   │   ├── electron.vite.config.ts
│   │   ├── electron-builder.yml
│   │   ├── tailwind.config.ts
│   │   └── src/
│   │       ├── main/
│   │       │   ├── index.ts
│   │       │   ├── ipc/{handlers,channels}.ts
│   │       │   ├── pipeline/{orchestrator,pdf-rasterizer}.ts
│   │       │   ├── qvac/singleton.ts
│   │       │   ├── wallet/{wallet-service,keystore,faucet}.ts
│   │       │   ├── x402/{client,solana-pay}.ts
│   │       │   └── db/{schema.sql,store.ts}
│   │       ├── preload/index.ts
│   │       └── renderer/         # React UI (owned by ui-architect)
│   │
│   └── sentinel/                 # Cloudflare Worker
│       ├── wrangler.toml
│       └── src/
│           ├── index.ts          # Hono entry
│           ├── routes/{lookup,health,sdn}.ts
│           ├── x402/{challenge,verify}.ts
│           └── ofac/{parser,matcher}.ts
│
└── packages/shared/
    ├── package.json
    └── src/
        ├── schemas.ts            # Zod: Entity, LookupRequest, LookupResponse, X402Challenge
        ├── ipc-contract.ts
        └── constants.ts          # USDT_MINT_DEVNET, LOOKUP_PRICE, RPC default
```

## 3. IPC Contract

| Channel | Direction | Request | Response |
|---|---|---|---|
| `wallet:status` | R → M | `{}` | `{ initialized, address?, usdtBalance?, solBalance? }` |
| `wallet:create` | R → M | `{}` | `{ address, mnemonic }` (one-time return) |
| `wallet:fund-devnet` | R → M | `{}` | `{ txSig, usdtBalance }` |
| `pipeline:start` | R → M | `{ pdfPath }` | `{ runId }` (async work) |
| `pipeline:cancel` | R → M | `{ runId }` | `{ ok }` |
| `history:list` | R → M | `{ limit? }` | `{ runs }` |

**Events (M → R):**
- `pipeline:progress` `{ runId, stage, pct, etaMs? }`
- `pipeline:entity-found` `{ runId, entity }`
- `pipeline:lookup-result` `{ runId, address, sanctioned, matches, paymentTxSig }`
- `pipeline:done` `{ runId, totalMs, entityCount, sanctionedCount, totalPaidUsdt }`
- `pipeline:error` `{ runId, stage, code, message, retriable }`
- `wallet:balance-changed` `{ usdtBalance, solBalance }`

`nodeIntegration:false`, `contextIsolation:true`, `sandbox:true`. No exception.

## 4. Sentinel API (Cloudflare Workers + Hono)

**Routes:**
- `POST /v1/lookup` — 402 if no `X-PAYMENT` header; verifies on-chain USDT-SPL on retry
- `GET /v1/health`
- `GET /v1/sdn/version`
- `POST /v1/sdn/refresh` (admin, also wired to cron `0 6 * * *`)

**Payment lifecycle:**
1. Client POSTs without `X-PAYMENT` → Worker generates UUID nonce, stores in KV (TTL 60s) → returns 402 + challenge JSON
2. Client signs USDT-SPL `transferChecked` ix with memo=nonce, sends to Solana
3. Client retries with `X-PAYMENT: base64({txSig, payer, amount, nonce})`
4. Worker `getParsedTransaction(txSig)` → walks ix → asserts mint, destination, amount → consumes nonce → runs OFAC matcher → returns 200

**OFAC loading:** Cron pulls `treasury.gov/ofac/downloads/sdn.xml` → parses with `fast-xml-parser` → emits `Map<address, SdnEntry[]>` → KV `sdn:index` + R2 audit.

**Critical:** USDT-SPL only exists on mainnet. **Deploy our own mock USDT mint on devnet** and hardcode its address. Document this in the demo script.

## 5. Wallet & Key Handling

| Concern | Decision |
|---|---|
| Generation | `@scure/bip39` (12 words) inside Bare worklet at first run |
| Storage | OS keychain via `keytar`; falls back to electron `safeStorage`; refuses launch if both unavailable |
| Loading | Main reads keychain → forwards via stdin to worklet → main heap zeroed immediately |
| Signing | Inside worklet only. Main only sees signed tx bytes back. |

**First-run flow:** boot → `wallet:status` → `{initialized:false}` → onboarding → "Create Wallet" → mnemonic shown ONCE → user confirms → `wallet:fund-devnet` → SOL airdrop + mock-USDT mint → ready.

## 6. State & Persistence

**better-sqlite3** at `app.getPath('userData')/sovereign.db`. Tables:

```sql
CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  pdf_name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  total_ms INTEGER,
  entity_count INTEGER DEFAULT 0,
  sanctioned_count INTEGER DEFAULT 0,
  total_paid_usdt TEXT DEFAULT '0',
  status TEXT NOT NULL CHECK(status IN ('running','done','error','cancelled'))
);

CREATE TABLE entities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  value TEXT NOT NULL,
  chain TEXT,
  confidence REAL,
  sanctioned INTEGER,
  matches_json TEXT,
  payment_tx_sig TEXT,
  latency_ms INTEGER
);
```

Mnemonic: keychain only. App settings: electron-store. Pipeline state: RAM only.

## 7. Error Handling

| Failure | Behavior |
|---|---|
| QVAC model load fails | `pipeline:error` `QVAC_LOAD`, retriable. App still works for history. |
| Solana RPC down | x402 client retries 3x exp backoff (400/800/1600ms), then `RPC_DOWN`. Continue with remaining entities. |
| Sentinel 5xx after pay | Retry POST same nonce/txSig 3x. Persist payment proof in DB. Auto-retry next launch — never double-charge. |
| Network down mid-demo | Banner "Offline — pipeline paused". Local QVAC extraction continues. **This is the killer demo moment.** |
| Insufficient USDT | Block at orchestrator. `INSUFFICIENT_FUNDS` with "Tap to refill devnet". |
| Worklet crash | Main respawns, retries pending tx. If second crash, abort run. |

## 8. Security

- Renderer: `nodeIntegration:false`, `contextIsolation:true`, `sandbox:true`, CSP `default-src 'self'; connect-src 'self' https://sentinel.<host>.workers.dev`
- Mnemonic crosses IPC only on `wallet:create` (one time) + `wallet:export-mnemonic` (gated dialog)
- pino redact: `['*.mnemonic','*.privateKey','*.seed','*.secretKey']`
- No PDF content in logs; only filename
- HTTPS only for Sentinel
- `app:openExternal` allowlists `solscan.io, explorer.solana.com, treasury.gov`

## 9. Deployment

**Sentinel:**
```bash
pnpm dlx wrangler kv:namespace create SDN_KV
pnpm dlx wrangler kv:namespace create NONCE_KV
pnpm dlx wrangler r2 bucket create sovereign-sdn
pnpm dlx wrangler secret put TREASURY_PRIVATE_KEY
pnpm dlx wrangler secret put ADMIN_BEARER
pnpm dlx wrangler deploy
curl -X POST https://sentinel.<sub>.workers.dev/v1/sdn/refresh -H "Authorization: Bearer $ADMIN_BEARER"
```

**Desktop packaging (electron-builder.yml):**
- Target: dmg, mac-arm64
- `extraResources` includes pre-cached QVAC models
- `asarUnpack` for keytar, better-sqlite3, @tetherto/* native deps
- Hackathon scope: skip Apple notarization

**Demo pre-flight:**
1. Wifi 30 min before
2. Wallet status: USDT ≥ 1.0, SOL ≥ 0.05
3. `curl /v1/health` → `sdnEntries > 0`
4. Throwaway PDF run → confirm <8s
5. Clean DB (`DELETE FROM runs; DELETE FROM entities;`)
6. macOS Do Not Disturb on
7. Backup recorded video at hand
