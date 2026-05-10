import type { QvacBackend, QvacLoadProgressEvent, QvacStatus } from '@sovereign/shared'

/**
 * QvacEngine — the abstraction over @qvac/sdk that the rest of the app talks to.
 *
 * Two implementations:
 * - mock: deterministic, fast, no models, no Bare runtime — for development on
 *   any machine including Windows + Intel iGPU
 * - real: wraps @qvac/sdk, loads actual models from QVAC's P2P registry, runs
 *   on Metal/Vulkan/CUDA. Used for the demo on Mac M-series.
 */

export interface OcrBlock {
  text: string
  /** [x1, y1, x2, y2, x3, y3, x4, y4] from QVAC OCR (4-corner polygon) */
  bbox: [number, number, number, number, number, number, number, number]
  confidence: number
  pageNum: number
  pageDims: { w: number; h: number }
}

export interface ExtractedEntity {
  type: 'person' | 'organization' | 'wallet_address' | 'date' | 'amount' | 'location'
  value: string
  matchedRegexHit?: string
  ownerEntityValue?: string
  sourceText: string
  confidence: number
  pageNum?: number
}

export interface QvacEngine {
  backend: QvacBackend

  /** Boots the engine; emits per-module progress until all modules loaded. */
  initialize(onProgress: (e: QvacLoadProgressEvent) => void): Promise<void>

  /** Current status snapshot (no IO). */
  getStatus(): QvacStatus

  /** Streams OCR blocks for one rasterized page. */
  ocr(args: {
    pageImage: Buffer
    pageNum: number
    pageDims: { w: number; h: number }
  }): AsyncIterable<OcrBlock>

  /** Calls the LLM with a forced `extract_entities` tool call; returns parsed JSON. */
  extractEntities(args: {
    pageText: string
    pageNum: number
    regexCandidateAddresses: string[]
  }): Promise<ExtractedEntity[]>

  /** Returns a single embedding (1024-dim for GTE_LARGE_FP16). */
  embed(text: string): Promise<Float32Array>

  /** Batched embeddings — much faster than looping `embed`. */
  embedBatch(texts: string[]): Promise<Float32Array[]>

  /** Releases all loaded models. Idempotent. */
  shutdown(): Promise<void>
}
