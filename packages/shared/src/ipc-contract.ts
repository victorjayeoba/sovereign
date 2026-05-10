import type {
  ForensicReport,
  PageText,
  PipelineProgress,
  PipelineErrorCode,
  PipelineStage,
  Entity,
  SdnMatch,
  MixerMatch,
  WalletStatus,
} from './schemas.js'

/**
 * Typed IPC channel contract used by main, preload, and renderer.
 * Renderer never sees ipcRenderer directly — only window.sovereign.
 */

export const IPC_CHANNELS = {
  // QVAC engine (renderer → main, request/response)
  QVAC_STATUS: 'qvac:status',
  QVAC_WARMUP: 'qvac:warmup',
  QVAC_TEST: 'qvac:test',

  // QVAC events (main → renderer)
  QVAC_LOAD_PROGRESS: 'qvac:load-progress',
  QVAC_READY: 'qvac:ready',
  QVAC_ERROR: 'qvac:error',

  // Wallet (renderer → main, request/response)
  WALLET_STATUS: 'wallet:status',
  WALLET_CREATE: 'wallet:create',
  WALLET_FUND_DEVNET: 'wallet:fund-devnet',
  WALLET_EXPORT_MNEMONIC: 'wallet:export-mnemonic',

  // Pipeline control (renderer → main)
  PIPELINE_START: 'pipeline:start',
  PIPELINE_CANCEL: 'pipeline:cancel',

  // History (renderer → main)
  HISTORY_LIST: 'history:list',
  HISTORY_GET: 'history:get',

  // App (renderer → main)
  APP_OPEN_EXTERNAL: 'app:openExternal',
  APP_PICK_PDF: 'app:pickPdf',

  // Pipeline events (main → renderer, fire-and-forget)
  PIPELINE_PROGRESS: 'pipeline:progress',
  PIPELINE_ENTITY_FOUND: 'pipeline:entity-found',
  PIPELINE_LOOKUP_RESULT: 'pipeline:lookup-result',
  PIPELINE_MIXER_RESULT: 'pipeline:mixer-result',
  PIPELINE_DONE: 'pipeline:done',
  PIPELINE_ERROR: 'pipeline:error',

  // Wallet events (main → renderer)
  WALLET_BALANCE_CHANGED: 'wallet:balance-changed',
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]

// ── Request/response payload types ──────────────────────────────────────

export type PickPdfResponse =
  | { cancelled: true }
  | { cancelled: false; name: string; bytes: Uint8Array }

export interface WalletCreateResponse {
  address: string
  /** Returned ONCE — never persisted to disk in plaintext after this. */
  mnemonic: string
}

export interface WalletFundDevnetResponse {
  txSig: string
  usdtBalance: string
}

export interface PipelineStartRequest {
  pdfPath: string
  /**
   * Pre-extracted page text from the renderer (pdfjs-dist). When omitted, the
   * orchestrator falls back to its built-in fixture so the click-to-demo path
   * still works without a real PDF.
   */
  pages?: PageText[]
}

export interface PipelineStartResponse {
  runId: string
}

export interface HistoryListRequest {
  limit?: number
}

export interface RunSummary {
  id: string
  pdfName: string
  createdAt: number
  totalMs: number | null
  entityCount: number
  sanctionedCount: number
  totalPaidUsdt: string
  status: 'running' | 'done' | 'error' | 'cancelled'
}

export interface HistoryListResponse {
  runs: RunSummary[]
}

// ── Event payload types (main → renderer) ───────────────────────────────

export interface EntityFoundEvent {
  runId: string
  entity: Entity
}

export interface LookupResultEvent {
  runId: string
  address: string
  sanctioned: boolean
  matches: SdnMatch[]
  paymentTxSig: string
  latencyMs: number
}

export interface MixerResultEvent {
  runId: string
  address: string
  mixerLinked: boolean
  matches: MixerMatch[]
  paymentTxSig: string
  latencyMs: number
}

export interface PipelineDoneEvent {
  runId: string
  totalMs: number
  entityCount: number
  sanctionedCount: number
  totalPaidUsdt: string
}

export interface PipelineErrorEvent {
  runId: string
  stage: PipelineStage
  code: PipelineErrorCode
  message: string
  retriable: boolean
}

export interface WalletBalanceChangedEvent {
  usdtBalance: string
  solBalance: string
}

// ── QVAC ────────────────────────────────────────────────────────────────

export type QvacBackend = 'mock' | 'real'

export type QvacModuleKey = 'llm' | 'ocr' | 'embed'

export interface QvacModuleStatus {
  key: QvacModuleKey
  loaded: boolean
  bytesTotal?: number
  bytesLoaded?: number
}

export interface QvacStatus {
  backend: QvacBackend
  ready: boolean
  modules: QvacModuleStatus[]
  /** Roughly: average pct across modules */
  overallPct: number
  message?: string
}

export interface QvacLoadProgressEvent {
  key: QvacModuleKey
  pct: number
  message?: string
}

export interface QvacReadyEvent {
  backend: QvacBackend
  durationMs: number
}

export interface QvacErrorEvent {
  key?: QvacModuleKey
  message: string
}

export interface QvacTestRequest {
  prompt?: string
}

export interface QvacTestResponse {
  llmTokens: number
  llmDurationMs: number
  embedDims: number
  embedDurationMs: number
  ocrConfidence: number
  ocrDurationMs: number
  sample: string
}

// ── window.sovereign API surface (consumed by renderer) ─────────────────

export interface SovereignApi {
  qvac: {
    status: () => Promise<QvacStatus>
    warmup: () => Promise<{ runId: string }>
    test: (req?: QvacTestRequest) => Promise<QvacTestResponse>
    onLoadProgress: (cb: (e: QvacLoadProgressEvent) => void) => () => void
    onReady: (cb: (e: QvacReadyEvent) => void) => () => void
    onError: (cb: (e: QvacErrorEvent) => void) => () => void
  }
  wallet: {
    status: () => Promise<WalletStatus>
    create: () => Promise<WalletCreateResponse>
    fundDevnet: () => Promise<WalletFundDevnetResponse>
    exportMnemonic: () => Promise<{ mnemonic: string }>
  }
  pipeline: {
    start: (req: PipelineStartRequest) => Promise<PipelineStartResponse>
    cancel: (runId: string) => Promise<{ ok: boolean }>
    onProgress: (cb: (e: PipelineProgress) => void) => () => void
    onEntity: (cb: (e: EntityFoundEvent) => void) => () => void
    onLookup: (cb: (e: LookupResultEvent) => void) => () => void
    onMixer: (cb: (e: MixerResultEvent) => void) => () => void
    onDone: (cb: (e: PipelineDoneEvent) => void) => () => void
    onError: (cb: (e: PipelineErrorEvent) => void) => () => void
  }
  history: {
    list: (req?: HistoryListRequest) => Promise<HistoryListResponse>
    get: (runId: string) => Promise<{ run: ForensicReport }>
  }
  app: {
    openExternal: (url: string) => Promise<{ ok: boolean }>
    pickPdf: () => Promise<PickPdfResponse>
  }
  events: {
    onWalletBalanceChanged: (cb: (e: WalletBalanceChangedEvent) => void) => () => void
  }
}
