import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { EntityRecord, RunTotals } from './pipeline'

/**
 * Persisted history of completed pipeline runs.
 *
 * Storage: localStorage via Zustand's persist middleware. Each completed run
 * is captured as a snapshot of the state needed to re-render the full
 * InvestigationReport without consulting the live pipeline.
 *
 * For the hackathon scope this is sufficient. Migration to better-sqlite3
 * (per docs/architecture-backend.md §6) lands when wallet/x402 ship.
 */

export interface RunSnapshot {
  runId: string
  pdfName: string | null
  startedAt: number | null
  status: 'done'
  entities: EntityRecord[]
  totals: RunTotals
}

export interface RunHistoryEntry {
  id: string // same as runId
  pdfName: string | null
  createdAt: number
  totalMs: number
  entityCount: number
  walletCount: number
  sanctionedCount: number
  totalPaidUsdt: string
  snapshot: RunSnapshot
}

interface HistoryStore {
  runs: RunHistoryEntry[]
  /** Persist a completed run. Most-recent first. */
  add: (entry: RunHistoryEntry) => void
  get: (id: string) => RunHistoryEntry | null
  remove: (id: string) => void
  clear: () => void
}

const MAX_HISTORY = 50

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set, get) => ({
      runs: [],
      add: (entry) =>
        set((s) => {
          const existing = s.runs.findIndex((r) => r.id === entry.id)
          const next =
            existing >= 0
              ? [entry, ...s.runs.filter((r) => r.id !== entry.id)]
              : [entry, ...s.runs]
          return { runs: next.slice(0, MAX_HISTORY) }
        }),
      get: (id) => get().runs.find((r) => r.id === id) ?? null,
      remove: (id) => set((s) => ({ runs: s.runs.filter((r) => r.id !== id) })),
      clear: () => set({ runs: [] }),
    }),
    {
      name: 'sovereign-history',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
)
