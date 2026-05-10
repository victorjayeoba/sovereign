# Sovereign — AI Inference Architecture Spec

**Author:** AI Engineer | **Target:** 8-second end-to-end demo on Mac M-series

---

## 1. Pipeline Diagram

```
[ Renderer drops PDF ]
        |
        v
[ Stage 0: PDF Rasterizer (Node Worker) ]   ~600ms
  pdfjs-dist @ 200 DPI -> PNG buffers
        |
        v
[ Stage 1: QVAC OCR singleton ]             ~2400ms (5 pages)
  ocr.blockStream(png) -> text+bbox+conf
  Per-page parallelism = 1 (Metal busy)
        |
        v
[ Stage 2a: Regex address sweep ]           ~5ms
  Solana base58 + ETH 0x + BTC bech32
        |
        v
[ Stage 2b: QVAC LLM tool-call ]            ~3200ms (5 pages)
  extract_entities(page_text + regex_hits)
  Streamed per page, KV-cache reused
  Zod-validated structured output
        |
        v
[ Stage 3: QVAC Embed dedup ]               ~250ms
  GTE_LARGE_FP16(entity_string) -> cosine
  Cluster threshold > 0.92
        |
        v
[ Stage 4: Per-address Sentinel lookup ]    ~1400ms (5 addrs)
  x402 402 -> USDT-SPL pay -> verdict
  Concurrency = 3
        |
        v
[ ForensicReport: entities + flags + evidence(pageNum, bbox, snippet) ]

TOTAL: 7855 ms (145 ms headroom)
```

## 2. QVAC Singleton

One Bare worker, app-lifetime. Eager-load all three models at boot:

```ts
class QvacSingleton {
  private static _instance: QvacSingleton
  private qvac!: QVAC
  llm!: LlmHandle; ocr!: OcrHandle; embed!: EmbedHandle

  static async boot() {
    if (this._instance) return this._instance
    const inst = new QvacSingleton()
    inst.qvac = await QVAC.create({ device: 'metal', cacheDir: '~/.qvac/models' })

    // Smallest first (memory fragmentation)
    inst.ocr   = await inst.qvac.loadModel({ kind:'ocr-onnx',
                  detector: CRAFT_DETECTOR_LATIN, recognizer: LATIN_RECOGNIZER })
    inst.embed = await inst.qvac.loadModel({ kind:'embed-llamacpp',
                  model: GTE_LARGE_FP16, contextSize: 512 })
    inst.llm   = await inst.qvac.loadModel({ kind:'llm-llamacpp',
                  model: LLAMA_3_2_1B_INST_Q4_0, contextSize: 4096,
                  nGpuLayers: -1 /* all on Metal */ })
    this._instance = inst
    return inst
  }
}
```

**Memory budget on 16 GB Mac:** OS+Electron+Node ~2.5 GB · OCR 0.05 GB · Embed 0.6 GB · LLM 0.7 GB · KV cache 0.25 GB · Working set ~1 GB → **~10 GB headroom**. No unload needed during demo.

## 3. OCR Pipeline

- **pdfjs-dist runs in dedicated `worker_threads`** (CPU-bound canvas blocks main loop)
- **DPI: 200** (lowest where CRAFT detects 8pt body text reliably; 300 DPI doubles latency for 3% recall gain)
- **Format: PNG** (QVAC accepts BMP/JPEG/PNG)
- **Streaming `blockStream` per page, pages serial** — UI shows live extraction; pipelining lets LLM page N start while OCR page N+1 runs (saves ~800ms)

```ts
for (const page of pages) {
  for await (const block of qvac.ocr.blockStream(page.png)) {
    blocks.push({ ...block, pageNum: page.pageNum, pageDims: { ... } })
    ipc.send('ocr:block', { pageNum: page.pageNum, ...block })
  }
}
```

**Bbox preservation:** every block carries `{text, bbox, pageNum, pageDims}` end-to-end. Final report ships `evidence: {pageNum, bbox, snippet}` for renderer to highlight.

**Failure handling:** `confidence < 0.5` blocks tagged `lowConfidence: true` (don't drop — Llama can salvage). Zero-block pages flagged `imagelessPage`.

## 4. Entity Extraction (LLM tool calling)

**Division of labor:**
- **Regex** (deterministic): catches all wallet addresses. **LLM never invents addresses.**
- **LLM**: people, orgs, dates, amounts, AND address↔owner attribution

```ts
const EntitySchema = z.object({
  type: z.enum(['person', 'organization', 'wallet_address',
                'date', 'amount', 'location']),
  value: z.string().min(1).max(200),
  matchedRegexHit: z.string().optional(),  // wallet_address only — must match a regex hit
  ownerEntityValue: z.string().optional(), // address ↔ owner attribution
  sourceText: z.string().min(1).max(300),  // verbatim from page
  confidence: z.number().min(0).max(1)
})

export const ExtractEntitiesTool = {
  name: 'extract_entities',
  description: 'Extract every named entity and link wallet addresses to owners.',
  parameters: z.object({ entities: z.array(EntitySchema).max(40) })
}
```

**Per-page call** (not per-document) — 1B model with 4k ctx struggles >2k input; KV-cache reuse across pages caches the system prompt.

**System prompt (cached):**
```
You are a forensic entity extractor. Given a page of text and a list of
candidate wallet addresses already found by regex, call the
extract_entities tool exactly once.

RULES:
1. Never invent a wallet address. Only use addresses from the supplied
   candidate list.
2. For each wallet, attempt to attribute it to a person or organization
   on the same page. Set ownerEntityValue.
3. Copy sourceText verbatim from the page (no paraphrasing).
4. Confidence < 0.6 means you're guessing — emit it anyway, we filter.
```

**Defensive parsing:**
```ts
let parsed
try {
  parsed = ExtractEntitiesTool.parameters.parse(raw.toolCalls[0].arguments)
} catch (e) {
  parsed = await repairJson(raw.rawText) ?? { entities: [] }
}
// Hard-filter hallucinated addresses
const regexSet = new Set(regexHits.map(h => h.address))
parsed.entities = parsed.entities.filter(e =>
  e.type !== 'wallet_address' || regexSet.has(e.value))
```

## 5. Embedding-Based Dedup

**Why embeddings beat string normalization:** "Acme Holdings, LLC" / "Acme Hldgs." / "ACME" all cluster at cosine > 0.93 with GTE-Large; normalize-and-compare gives 3 separate clusters. Report shows "Acme Holdings (3 mentions, owns 2 wallets)" instead of 3 orphan rows. **This is the most defensible "QVAC depth" claim** to a judge — toggle dedup off for the live A/B.

**Algorithm:** single-link clustering, threshold 0.92.

```ts
const vecs = await qvac.embed.encodeBatch(entityStrings)
const clusters: number[][] = []
for (let i = 0; i < vecs.length; i++) {
  const hit = clusters.findIndex(c => c.some(j => cosine(vecs[i], vecs[j]) > 0.92))
  if (hit >= 0) clusters[hit].push(i)
  else clusters.push([i])
}
```

In-memory only. ~30 entities × 1024 floats × 4 bytes = 120 KB.

## 6. Per-Address Sentinel Lookup

**Concurrency: 3.** Five-way blows out Solana RPC rate limits + signing nonce contention; serial blows the budget. 5 ÷ 3 ≈ 2 batches × 700ms = **~1400ms**.

**Order:** page order, confidence-tiebreak descending within page (matches the demo storyboard scroll).

## 7. Performance Budget (8s target)

Demo: 6-page PDF, 5 unique addresses, M2 Mac.

| Stage | Budget (ms) | Reasoning |
|---|---|---|
| Cold model load | 0 | Pre-cached + warmup |
| PDF rasterize | 600 | pdfjs-dist ~100ms/page on M-series |
| OCR | 2400 | QVAC OCR ~400ms/page on Metal, streamed |
| Regex sweep | 5 | Microseconds |
| LLM extraction | 3200 | Llama-3.2-1B Q4_0 Metal: ~80 tok/s prefill, ~120 tok/s decode; KV reuse saves ~80ms/page |
| Embed dedup | 250 | GTE-Large FP16 batch ~8ms/string + cosine matrix |
| 5× Sentinel @ conc 3 | 1400 | 2 batches × 700ms (sign 50µs + commit 250ms + Sentinel 400ms) |
| Report + IPC | 50 | |
| **Total** | **7905** | **95ms headroom** |

**Pipelining is non-negotiable:** OCR page N+1 streams in parallel with LLM page N → effective LLM time hidden behind OCR. Without it: 8900ms (over budget).

## 8. Pre-Caching

`scripts/warmup-models.ts` — runs once post-install + before packaging:

```ts
const q = await QVAC.create({ cacheDir: '~/.qvac/models' })
const llm   = await q.loadModel({ kind:'llm-llamacpp',   model: LLAMA_3_2_1B_INST_Q4_0 })
const ocr   = await q.loadModel({ kind:'ocr-onnx',
                detector: CRAFT_DETECTOR_LATIN, recognizer: LATIN_RECOGNIZER })
const embed = await q.loadModel({ kind:'embed-llamacpp', model: GTE_LARGE_FP16 })

// Smoke tests
const ocrOut = await ocr.recognize(fixturePng())
const llmOut = await llm.chat({ messages: [{role:'user', content:'ping'}], maxTokens: 4 })
const eVec   = await embed.encode('test')
assert(eVec.length === 1024)
```

**Total cache:** ~1.35 GB at `~/.qvac/models/`.

**Pre-judging smoke:** `npm run smoke` runs the above + a 1-page fixture PDF through full pipeline asserting `< 2000ms`. Run 5 min before demo.

## 9. "Depth" Features (the 40% judging weight)

1. **All three QVAC modules on critical path** — none decorative. Pull any one and the report degrades.
2. **KV-cache reuse across per-page LLM calls** (`qvac.llm.session()`) — saves ~480ms over 6 pages, shows knowledge of llama.cpp internals beyond `chat()`.
3. **Streaming OCR `blockStream` piped to renderer** — report area populates live during demo. Visually obvious depth.
4. **Embedding-based entity coreference** — concrete A/B win on a single PDF (Acme/ACME/Acme Hldgs). String-normalize cannot match.
5. **Regex/LLM hybrid hallucination filter** — explicitly defends against the #1 small-model failure. Tells judges we know how 1B models fail in production.

## 10. Failure Modes

| Failure | Recovery |
|---|---|
| Model load fails at boot | Warmup smoke catches before demo. Live: splash "Recreating model cache…" + re-run warmup. Air-gapped fallback: demo on dev machine where cache is warm. |
| LLM hallucinates address | `regexSet` filter drops it before Sentinel call. Address never reaches network unless regex saw it. |
| OCR misses an address | Acceptable: false positives worse than negatives. `lowConfidence` flag tells user to re-scan. |
| LLM JSON parse fails | `repairJson()` single retry, then page falls back to regex-only entities. Pipeline never crashes. |
| Sentinel API down | Each wallet ships `verdict: 'unavailable'`. Report still renders with locally-extracted entities + bboxes. **Phase 1 (air-gapped) of demo runs entirely on this fallback.** |
| Memory pressure | Won't happen on 16GB. If it does, `inst.ocr.unload()` after Stage 1 (50MB reclaim). |
| Wrong PDF dropped | Demo uses one fixture PDF, locked. Different PDF allowed to take >8s; only storyboard PDF needs the budget. |
