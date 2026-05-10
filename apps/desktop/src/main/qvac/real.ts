import { z } from 'zod'
import {
  loadModel,
  unloadModel,
  completion,
  embed,
  ocr,
  close,
  LLAMA_3_2_1B_INST_Q4_0,
  GTE_LARGE_FP16,
  OCR_CRAFT_DETECTOR,
  OCR_LATIN_RECOGNIZER_1,
  MODEL_TYPES,
  type Tool,
} from '@qvac/sdk'
import type { QvacLoadProgressEvent, QvacStatus, QvacModuleKey } from '@sovereign/shared'
import type { QvacEngine, OcrBlock, ExtractedEntity } from './types.js'

/**
 * Real QVAC engine — wraps `@qvac/sdk`.
 *
 * Three modules loaded eagerly at app boot:
 *   - OCR  : @qvac/ocr-onnx (CRAFT detector + Latin recognizer)  ~50 MB
 *   - Embed: @qvac/embed-llamacpp (GTE-large fp16, 1024-dim)     ~600 MB
 *   - LLM  : @qvac/llm-llamacpp (Llama 3.2 1B Q4_0 + tool calls) ~700 MB
 *
 * Models download from QVAC's P2P registry on first run into ~/.qvac/models/.
 * Subsequent runs are instant (cache hit).
 *
 * Runs on Bare runtime (spawned automatically by the SDK on first RPC call).
 * Inference accelerated by Metal (macOS), Vulkan (Linux/Windows), CUDA where
 * available; CPU fallback otherwise.
 */
export class RealQvacEngine implements QvacEngine {
  readonly backend = 'real' as const

  private llmId?: string
  private embedId?: string
  private ocrId?: string
  private ready = false

  private modules: Record<QvacModuleKey, { loaded: boolean; bytesTotal: number; bytesLoaded: number }> = {
    ocr: { loaded: false, bytesTotal: 50_000_000, bytesLoaded: 0 },
    embed: { loaded: false, bytesTotal: 600_000_000, bytesLoaded: 0 },
    llm: { loaded: false, bytesTotal: 700_000_000, bytesLoaded: 0 },
  }

  async initialize(onProgress: (e: QvacLoadProgressEvent) => void): Promise<void> {
    const t0 = Date.now()
    console.log('[qvac.real] initialize() — loading 3 modules')

    // Heartbeat: prints elapsed time every 5s so we can see if loadModel is
    // hanging vs progressing silently (DHT discovery doesn't fire onProgress
    // until first byte arrives).
    let heartbeatStage = 'OCR'
    const heartbeat = setInterval(() => {
      const elapsed = Math.floor((Date.now() - t0) / 1000)
      console.log(`[qvac.real] still loading ${heartbeatStage}… ${elapsed}s elapsed`)
    }, 5000)

    // OCR first (smallest — fail fast if anything is wrong)
    console.log('[qvac.real] loading OCR (CRAFT + Latin recognizer, ~50 MB)…')
    onProgress({ key: 'ocr', pct: 0, message: 'Loading CRAFT detector + Latin recognizer' })
    this.ocrId = await loadModel({
      modelSrc: OCR_LATIN_RECOGNIZER_1,
      modelType: MODEL_TYPES.ocr,
      modelConfig: {
        detectorModelSrc: OCR_CRAFT_DETECTOR,
      },
      onProgress: (p) => {
        const pct = Math.round((p?.progress ?? 0) * 100)
        if (pct % 10 === 0) console.log(`[qvac.real] OCR ${pct}%`)
        this.modules.ocr.bytesLoaded = Math.floor(
          (pct / 100) * this.modules.ocr.bytesTotal
        )
        onProgress({ key: 'ocr', pct, message: 'CRAFT + Latin' })
      },
    })
    this.modules.ocr.loaded = true
    this.modules.ocr.bytesLoaded = this.modules.ocr.bytesTotal
    onProgress({ key: 'ocr', pct: 100, message: 'OCR ready' })

    console.log(`[qvac.real] OCR ready in ${((Date.now() - t0) / 1000).toFixed(1)}s`)

    // Embeddings — used for cross-page entity dedup
    const t1 = Date.now()
    heartbeatStage = 'EMBED'
    console.log('[qvac.real] loading EMBED (GTE-large fp16, ~600 MB)…')
    onProgress({ key: 'embed', pct: 0, message: 'Loading GTE-large embeddings' })
    this.embedId = await loadModel({
      modelSrc: GTE_LARGE_FP16,
      modelType: MODEL_TYPES.embeddings,
      onProgress: (p) => {
        const pct = Math.round((p?.progress ?? 0) * 100)
        if (pct % 10 === 0) console.log(`[qvac.real] EMBED ${pct}%`)
        this.modules.embed.bytesLoaded = Math.floor(
          (pct / 100) * this.modules.embed.bytesTotal
        )
        onProgress({ key: 'embed', pct, message: 'GTE-large fp16' })
      },
    })
    this.modules.embed.loaded = true
    this.modules.embed.bytesLoaded = this.modules.embed.bytesTotal
    onProgress({ key: 'embed', pct: 100, message: 'Embeddings ready' })

    console.log(`[qvac.real] EMBED ready in ${((Date.now() - t1) / 1000).toFixed(1)}s`)

    // LLM — used for entity extraction + owner attribution via tool calling
    const t2 = Date.now()
    heartbeatStage = 'LLM'
    console.log('[qvac.real] loading LLM (Llama 3.2 1B Q4_0, ~700 MB)…')
    onProgress({ key: 'llm', pct: 0, message: 'Loading Llama 3.2 1B' })
    this.llmId = await loadModel({
      modelSrc: LLAMA_3_2_1B_INST_Q4_0,
      modelType: MODEL_TYPES.llm,
      modelConfig: {
        ctx_size: 4096,
        gpu_layers: -1, // all layers on GPU when available
        tools: true,
        temp: 0.1,
        repeat_penalty: 1.1,
      },
      onProgress: (p) => {
        const pct = Math.round((p?.progress ?? 0) * 100)
        if (pct % 10 === 0) console.log(`[qvac.real] LLM ${pct}%`)
        this.modules.llm.bytesLoaded = Math.floor(
          (pct / 100) * this.modules.llm.bytesTotal
        )
        onProgress({ key: 'llm', pct, message: 'Llama 3.2 1B Q4_0' })
      },
    })
    this.modules.llm.loaded = true
    this.modules.llm.bytesLoaded = this.modules.llm.bytesTotal
    onProgress({ key: 'llm', pct: 100, message: 'LLM ready' })

    console.log(`[qvac.real] LLM ready in ${((Date.now() - t2) / 1000).toFixed(1)}s`)

    clearInterval(heartbeat)
    this.ready = true
    console.log(`[qvac.real] all 3 modules ready in ${((Date.now() - t0) / 1000).toFixed(1)}s`)
  }

  getStatus(): QvacStatus {
    const mods = (Object.keys(this.modules) as QvacModuleKey[]).map((key) => ({
      key,
      loaded: this.modules[key].loaded,
      bytesTotal: this.modules[key].bytesTotal,
      bytesLoaded: this.modules[key].bytesLoaded,
    }))
    const loadedCount = mods.filter((m) => m.loaded).length
    return {
      backend: 'real',
      ready: this.ready,
      modules: mods,
      overallPct: (loadedCount / mods.length) * 100,
      message: this.ready ? 'QVAC engine ready' : 'Loading…',
    }
  }

  // ── OCR ─────────────────────────────────────────────────────────────

  async *ocr(args: {
    pageImage: Buffer
    pageNum: number
    pageDims: { w: number; h: number }
  }): AsyncIterable<OcrBlock> {
    if (!this.ocrId) throw new Error('OCR model not loaded — call initialize() first')

    const { blockStream } = ocr({
      modelId: this.ocrId,
      image: { type: 'base64', value: args.pageImage.toString('base64') },
      stream: true,
    })

    for await (const blocks of blockStream) {
      for (const block of blocks) {
        // QVAC returns axis-aligned bbox [x1,y1,x2,y2]; our type uses
        // 4-corner polygon [x1,y1,x2,y2,x3,y3,x4,y4]. Convert.
        const bbox = block.bbox
        const polygon: OcrBlock['bbox'] = bbox
          ? [bbox[0], bbox[1], bbox[2], bbox[1], bbox[2], bbox[3], bbox[0], bbox[3]]
          : [0, 0, 0, 0, 0, 0, 0, 0]

        yield {
          text: block.text,
          bbox: polygon,
          confidence: block.confidence ?? 0,
          pageNum: args.pageNum,
          pageDims: args.pageDims,
        }
      }
    }
  }

  // ── LLM (entity extraction with forced tool calling) ────────────────

  async extractEntities(args: {
    pageText: string
    pageNum: number
    regexCandidateAddresses: string[]
  }): Promise<ExtractedEntity[]> {
    if (!this.llmId) throw new Error('LLM model not loaded — call initialize() first')

    const extractTool: Tool = {
      name: 'extract_entities',
      description:
        'Extract every named entity from the page and link wallet addresses to their stated owners.',
      parameters: z.object({
        entities: z
          .array(
            z.object({
              type: z.enum([
                'person',
                'organization',
                'wallet_address',
                'date',
                'amount',
                'location',
              ]),
              value: z.string().min(1).max(200),
              matchedRegexHit: z.string().optional(),
              ownerEntityValue: z.string().optional(),
              sourceText: z.string().min(1).max(300),
              confidence: z.number().min(0).max(1),
            })
          )
          .max(40),
      }),
    }

    const SYSTEM = `You are a forensic entity extractor. Given a page of text and a list of candidate wallet addresses already found by regex, call extract_entities exactly once.

RULES:
1. Never invent a wallet address. Only emit wallet_address entities whose value appears verbatim in the supplied candidate list.
2. For each wallet, attempt to attribute it to a person or organization mentioned on the same page. Set ownerEntityValue.
3. Copy sourceText verbatim from the page.
4. Confidence below 0.6 means you are guessing — emit it anyway, we filter.`

    const userMsg = `PAGE ${args.pageNum} TEXT:
"""
${args.pageText.slice(0, 6000)}
"""

REGEX_ADDRESS_CANDIDATES (do not invent others):
${JSON.stringify(args.regexCandidateAddresses)}`

    const result = completion({
      modelId: this.llmId,
      history: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: userMsg },
      ],
      stream: false,
      tools: [extractTool],
    })

    let parsed: { entities?: unknown[] } = {}
    try {
      const calls = await result.toolCalls
      const extract = calls.find((c) => c.name === 'extract_entities')
      if (extract) parsed = (extract.arguments ?? {}) as typeof parsed
    } catch (e) {
      console.warn('[qvac.real] extractEntities tool call failed:', e)
      return []
    }

    const candidateSet = new Set(args.regexCandidateAddresses)
    const out: ExtractedEntity[] = []
    for (const raw of parsed.entities ?? []) {
      const e = raw as Partial<ExtractedEntity> & { type?: string }
      if (
        !e ||
        typeof e.type !== 'string' ||
        typeof e.value !== 'string' ||
        typeof e.sourceText !== 'string'
      ) {
        continue
      }
      // Hard-filter hallucinated addresses
      if (e.type === 'wallet_address' && !candidateSet.has(e.value)) continue

      out.push({
        type: e.type as ExtractedEntity['type'],
        value: e.value,
        matchedRegexHit: e.matchedRegexHit,
        ownerEntityValue: e.ownerEntityValue,
        sourceText: e.sourceText,
        confidence: typeof e.confidence === 'number' ? e.confidence : 0.7,
        pageNum: args.pageNum,
      })
    }

    return out
  }

  // ── Embeddings ──────────────────────────────────────────────────────

  async embed(text: string): Promise<Float32Array> {
    if (!this.embedId) throw new Error('Embed model not loaded — call initialize() first')
    const { embedding } = await embed({ modelId: this.embedId, text })
    return new Float32Array(embedding)
  }

  async embedBatch(texts: string[]): Promise<Float32Array[]> {
    if (!this.embedId) throw new Error('Embed model not loaded — call initialize() first')
    const { embedding } = await embed({ modelId: this.embedId, text: texts })
    return embedding.map((vec) => new Float32Array(vec))
  }

  // ── Lifecycle ───────────────────────────────────────────────────────

  async shutdown(): Promise<void> {
    const ids = [this.llmId, this.embedId, this.ocrId].filter(Boolean) as string[]
    await Promise.all(
      ids.map((modelId) => unloadModel({ modelId }).catch(() => undefined))
    )
    try {
      await close()
    } catch (e) {
      console.warn('[qvac.real] close() failed:', e)
    }
    this.llmId = this.embedId = this.ocrId = undefined
    for (const k of Object.keys(this.modules) as QvacModuleKey[]) {
      this.modules[k].loaded = false
      this.modules[k].bytesLoaded = 0
    }
    this.ready = false
  }
}
