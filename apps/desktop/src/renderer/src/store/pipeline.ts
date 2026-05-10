import { create } from 'zustand'
import {
  LOOKUP_PRICE_USDT,
  type Entity,
  type EntityFoundEvent,
  type LookupResultEvent,
  type MixerResultEvent,
  type MixerMatch,
  type PageText,
  type PipelineDoneEvent,
  type PipelineErrorEvent,
  type PipelineProgress,
  type PipelineStage,
  type SdnMatch,
} from '@sovereign/shared'

/**
 * Single source of truth for one in-flight (or last completed) pipeline run.
 *
 * Driven entirely by main-process events; no derivation in components.
 */

export type ScanLineKind = 'system' | 'finding' | 'flag' | 'confirm'
export type ScanPrefix = 'INIT' | 'OCR' | 'LLM' | 'EMBED' | 'FLAG' | 'PAY' | 'TX' | 'MIXER'

export interface ScanLine {
  id: string
  ts: string
  kind: ScanLineKind
  prefix: ScanPrefix
  message: string
}

export interface EntityRecord extends Entity {
  // OFAC signal
  sanctioned?: boolean
  matches?: SdnMatch[]
  paymentTxSig?: string
  // Mixer-linkage signal
  mixerLinked?: boolean
  mixerMatches?: MixerMatch[]
  mixerPaymentTxSig?: string
}

export interface ToastItem {
  id: string
  amount: string
  recipient: string
  txSig: string
  latencyMs: number
}

export type RunStatus = 'idle' | 'running' | 'done' | 'error'

export interface RunTotals {
  totalMs: number
  entityCount: number
  sanctionedCount: number
  totalPaidUsdt: string
}

interface PipelineStore {
  runId: string | null
  pdfName: string | null
  status: RunStatus
  startedAt: number | null
  stage: PipelineStage | null
  pct: number
  scanLines: ScanLine[]
  entities: EntityRecord[]
  toasts: ToastItem[]
  totals: RunTotals | null
  errorMessage: string | null

  startRun: (pdfName: string, pages?: PageText[]) => Promise<void>
  cancel: () => Promise<void>
  reset: () => void
  dismissToast: (id: string) => void

  // Event handlers — wired in usePipelineEvents()
  _onProgress: (e: PipelineProgress) => void
  _onEntity: (e: EntityFoundEvent) => void
  _onLookup: (e: LookupResultEvent) => void
  _onMixer: (e: MixerResultEvent) => void
  _onDone: (e: PipelineDoneEvent) => void
  _onError: (e: PipelineErrorEvent) => void
}

const formatTs = (relativeMs: number): string => {
  const ms = Math.max(0, relativeMs)
  const totalSec = Math.floor(ms / 1000)
  const cs = Math.floor((ms % 1000) / 10)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}

const lineId = (() => {
  let n = 0
  return () => `sl-${++n}`
})()

const truncAddr = (a: string): string =>
  a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a

/**
 * Push a settlement toast. Shared between OFAC + Mixer settlements so each
 * autonomous payment animates a notification individually. FIFO-evicts when
 * MAX_VISIBLE exceeded so the stack never obscures the Forensic Findings.
 */
function pushSettlementToast(
  set: (
    fn: (s: { toasts: ToastItem[] }) => Partial<{ toasts: ToastItem[] }>
  ) => void,
  address: string,
  txSig: string,
  latencyMs: number
): void {
  const MAX_VISIBLE = 3
  const id = `toast-${address}-${txSig}`
  const next: ToastItem = {
    id,
    amount: LOOKUP_PRICE_USDT,
    recipient: 'Sentinel',
    txSig,
    latencyMs,
  }
  set((s) => {
    const merged = [...s.toasts, next]
    const trimmed =
      merged.length > MAX_VISIBLE ? merged.slice(merged.length - MAX_VISIBLE) : merged
    return { toasts: trimmed }
  })
  setTimeout(() => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  }, 4000)
}

export const usePipelineStore = create<PipelineStore>()((set, get) => {
  const tsNow = (): string => {
    const startedAt = get().startedAt
    return formatTs(startedAt ? Date.now() - startedAt : 0)
  }

  const pushLine = (line: Omit<ScanLine, 'id' | 'ts'>): void => {
    set((s) => ({
      scanLines: [...s.scanLines, { id: lineId(), ts: tsNow(), ...line }],
    }))
  }

  return {
    runId: null,
    pdfName: null,
    status: 'idle',
    startedAt: null,
    stage: null,
    pct: 0,
    scanLines: [],
    entities: [],
    toasts: [],
    totals: null,
    errorMessage: null,

    startRun: async (pdfName, pages) => {
      // Reset before starting
      const initLine: ScanLine = {
        id: lineId(),
        ts: '00:00.00',
        kind: 'system',
        prefix: 'INIT',
        message: 'QVAC ready · 3 modules loaded',
      }
      set({
        runId: null,
        pdfName,
        status: 'running',
        startedAt: Date.now(),
        stage: null,
        pct: 0,
        scanLines: [initLine],
        entities: [],
        toasts: [],
        totals: null,
        errorMessage: null,
      })

      const res = await window.sovereign.pipeline.start({
        pdfPath: pdfName,
        pages,
      })
      set({ runId: res.runId })
    },

    cancel: async () => {
      const { runId } = get()
      if (!runId) return
      await window.sovereign.pipeline.cancel(runId)
      set({ status: 'idle', stage: null })
    },

    reset: () => {
      set({
        runId: null,
        pdfName: null,
        status: 'idle',
        startedAt: null,
        stage: null,
        pct: 0,
        scanLines: [],
        entities: [],
        toasts: [],
        totals: null,
        errorMessage: null,
      })
    },

    dismissToast: (id) => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    },

    _onProgress: (e) => {
      set({ stage: e.stage, pct: e.pct })

      // Notes from the orchestrator render as system scan lines. The prefix
      // is derived from the stage so the log keeps its color-coded shape.
      if (e.note) {
        const prefix: ScanPrefix =
          e.stage === 'ocr'
            ? 'OCR'
            : e.stage === 'dedup'
            ? 'EMBED'
            : e.stage === 'lookup'
            ? 'PAY'
            : 'INIT'
        pushLine({ kind: 'system', prefix, message: e.note })
      }

      // EMBED summary still derived from current state at dedup completion.
      if (e.stage === 'dedup' && e.pct === 100 && !e.note) {
        const entCount = get().entities.length
        pushLine({
          kind: 'system',
          prefix: 'EMBED',
          message: `${entCount} strings · clustered at cosine ≥ 0.92`,
        })
      }
    },

    _onEntity: (e) => {
      const ent = e.entity as EntityRecord
      set((s) => ({ entities: [...s.entities, ent] }))

      let msg = ''
      if (ent.type === 'wallet_address') {
        msg = `wallet ${truncAddr(ent.value)}${ent.ownerEntityValue ? ` · ${ent.ownerEntityValue}` : ''}`
      } else if (ent.type === 'organization') {
        msg = `org ${ent.value}`
      } else if (ent.type === 'person') {
        msg = `person ${ent.value}`
      } else {
        msg = `${ent.type} ${ent.value}`
      }
      pushLine({
        kind: ent.type === 'wallet_address' ? 'finding' : 'system',
        prefix: 'LLM',
        message: msg,
      })
    },

    _onLookup: (e) => {
      // Attach OFAC verdict to the matching wallet entity
      set((s) => ({
        entities: s.entities.map((ent) =>
          ent.type === 'wallet_address' && ent.value === e.address
            ? {
                ...ent,
                sanctioned: e.sanctioned,
                matches: e.matches,
                paymentTxSig: e.paymentTxSig,
              }
            : ent
        ),
      }))

      // FLAG line — only for sanctioned hits, render before PAY/TX
      if (e.sanctioned && e.matches.length > 0) {
        const m = e.matches[0]!
        pushLine({
          kind: 'flag',
          prefix: 'FLAG',
          message: `${truncAddr(e.address)} matched OFAC SDN — ${m.name}`,
        })
      }
      pushLine({
        kind: 'system',
        prefix: 'PAY',
        message: `${LOOKUP_PRICE_USDT} USDT-SPL → Sentinel · OFAC check · ${truncAddr(e.address)}`,
      })
      pushLine({
        kind: 'confirm',
        prefix: 'TX',
        message: `${e.paymentTxSig} confirmed · ${(e.latencyMs / 1000).toFixed(2)}s${
          e.sanctioned ? '' : ' · OFAC clean'
        }`,
      })

      pushSettlementToast(set, e.address, e.paymentTxSig, e.latencyMs)
    },

    _onMixer: (e) => {
      // Attach mixer-linkage verdict to the matching wallet entity
      set((s) => ({
        entities: s.entities.map((ent) =>
          ent.type === 'wallet_address' && ent.value === e.address
            ? {
                ...ent,
                mixerLinked: e.mixerLinked,
                mixerMatches: e.matches,
                mixerPaymentTxSig: e.paymentTxSig,
              }
            : ent
        ),
      }))

      // FLAG line for mixer hits — distinct prefix so the timeline shows
      // the agent making a separate paid query against a different source.
      if (e.mixerLinked && e.matches.length > 0) {
        const m = e.matches[0]!
        const dir = m.type === 'deposit' ? 'deposit' : m.type === 'exit' ? 'exit' : 'direct'
        pushLine({
          kind: 'flag',
          prefix: 'MIXER',
          message: `${truncAddr(e.address)} mixer-linked — ${m.name} ${dir}`,
        })
      }
      pushLine({
        kind: 'system',
        prefix: 'PAY',
        message: `${LOOKUP_PRICE_USDT} USDT-SPL → Sentinel · Mixer check · ${truncAddr(e.address)}`,
      })
      pushLine({
        kind: 'confirm',
        prefix: 'TX',
        message: `${e.paymentTxSig} confirmed · ${(e.latencyMs / 1000).toFixed(2)}s${
          e.mixerLinked ? '' : ' · mixer clean'
        }`,
      })

      pushSettlementToast(set, e.address, e.paymentTxSig, e.latencyMs)
    },

    _onDone: (e) => {
      const totals: RunTotals = {
        totalMs: e.totalMs,
        entityCount: e.entityCount,
        sanctionedCount: e.sanctionedCount,
        totalPaidUsdt: e.totalPaidUsdt,
      }
      set({
        status: 'done',
        stage: null,
        pct: 100,
        totals,
      })

      // Persist to history. Lazy-import the store to avoid a circular
      // dependency at module load time (history depends on EntityRecord
      // exported here).
      const { runId, pdfName, startedAt, entities } = get()
      if (runId) {
        const wallets = entities.filter((ent) => ent.type === 'wallet_address')
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        import('./history.js').then(({ useHistoryStore }) => {
          useHistoryStore.getState().add({
            id: runId,
            pdfName,
            createdAt: startedAt ?? Date.now(),
            totalMs: e.totalMs,
            entityCount: e.entityCount,
            walletCount: wallets.length,
            sanctionedCount: e.sanctionedCount,
            totalPaidUsdt: e.totalPaidUsdt,
            snapshot: {
              runId,
              pdfName,
              startedAt,
              status: 'done',
              entities,
              totals,
            },
          })
        })
      }
    },

    _onError: (e) => {
      set({ status: 'error', errorMessage: e.message })
      pushLine({
        kind: 'flag',
        prefix: 'FLAG',
        message: `pipeline error · ${e.message}`,
      })
    },
  }
})
