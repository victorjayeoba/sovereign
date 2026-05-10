import { useMemo } from 'react'
import { History as HistoryIcon, FileText, AlertOctagon, CheckCircle2, Trash2 } from 'lucide-react'
import { GlassCard } from '../GlassCard'
import { cn } from '@renderer/lib/cn'
import { useHistoryStore, type RunHistoryEntry } from '@renderer/store/history'

interface HistoryViewProps {
  /** Called when the user clicks a past run — App opens the InvestigationReport pre-populated. */
  onOpenRun?: (entry: RunHistoryEntry) => void
}

const formatDate = (ts: number): string => {
  const d = new Date(ts)
  const now = Date.now()
  const sameDay = new Date(now).toDateString() === d.toDateString()
  const yesterday = new Date(now - 86_400_000).toDateString() === d.toDateString()
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  if (sameDay) return `Today · ${time}`
  if (yesterday) return `Yesterday · ${time}`
  const days = Math.floor((now - ts) / 86_400_000)
  if (days < 7) return `${days} days ago · ${time}`
  return `${d.toISOString().slice(0, 10)} · ${time}`
}

export function HistoryView({ onOpenRun }: HistoryViewProps = {}) {
  const runs = useHistoryStore((s) => s.runs)
  const remove = useHistoryStore((s) => s.remove)
  const clear = useHistoryStore((s) => s.clear)
  const empty = runs.length === 0

  // Aggregated cost / total for the header strip
  const stats = useMemo(() => {
    const totalUsdt = runs
      .reduce((sum, r) => sum + Number(r.totalPaidUsdt || 0), 0)
      .toFixed(2)
    const flaggedRuns = runs.filter((r) => r.sanctionedCount > 0).length
    return { totalUsdt, flaggedRuns }
  }, [runs])

  return (
    <main className="flex-1 flex flex-col gap-4 overflow-hidden">
      <header className="shrink-0">
        <p className="font-instrument text-[10.5px] font-medium tracking-[0.12em] text-text-tertiary uppercase">
          Investigations
        </p>
        <h2 className="font-bricolage text-[26px] font-700 tracking-tight text-text-primary mt-1">
          History.
          <span className="text-text-tertiary"> Every report Sovereign has produced.</span>
        </h2>
      </header>

      <GlassCard className="flex-1 flex flex-col min-h-0">
        <header className="flex items-center justify-between px-5 pt-4 pb-3">
          <div className="flex items-center gap-2.5">
            <HistoryIcon size={14} strokeWidth={1.75} className="text-text-secondary" />
            <h3 className="font-bricolage text-[14px] font-700 tracking-tight text-text-primary">
              Past Investigations
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-instrument text-[10.5px] font-medium tracking-wider uppercase text-text-tertiary">
              {empty
                ? 'no runs yet'
                : `${runs.length} run${runs.length !== 1 ? 's' : ''} · ${stats.flaggedRuns} flagged · ${stats.totalUsdt} USDT spent`}
            </span>
            {!empty && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Clear all investigation history? This cannot be undone.')) clear()
                }}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md glass glass-hover transition-colors"
                aria-label="Clear all history"
              >
                <Trash2 size={11} strokeWidth={1.75} className="text-text-tertiary" />
                <span className="font-instrument text-[9.5px] font-medium tracking-wider uppercase text-text-tertiary">
                  Clear
                </span>
              </button>
            )}
          </div>
        </header>
        <div className="hairline mx-5" />

        <div className="flex-1 overflow-y-auto">
          {empty ? (
            <div className="flex h-full items-center justify-center px-8 py-16 text-center">
              <div className="max-w-[420px]">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-glass-tint text-text-tertiary mx-auto mb-5">
                  <HistoryIcon size={20} strokeWidth={1.5} />
                </div>
                <h3 className="font-bricolage text-[18px] font-700 tracking-tight text-text-primary">
                  No investigations yet.
                </h3>
                <p className="font-inter text-[12.5px] text-text-secondary mt-2 leading-relaxed">
                  Drop a document on the Investigate tab. When the agent finishes,
                  the run will land here. Click any past run to reopen its full
                  forensic report.
                </p>
                <p className="font-instrument text-[10px] font-medium tracking-wider uppercase text-text-quaternary mt-4">
                  Stored locally · this device only
                </p>
              </div>
            </div>
          ) : (
            <ul className="px-5 py-2">
              {runs.map((run) => (
                <RunRow
                  key={run.id}
                  run={run}
                  onOpen={() => onOpenRun?.(run)}
                  onRemove={() => remove(run.id)}
                />
              ))}
            </ul>
          )}
        </div>

        {!empty && (
          <>
            <div className="hairline mx-5" />
            <footer className="flex items-center justify-between px-5 py-3">
              <span className="font-instrument text-[10.5px] font-medium tracking-wider uppercase text-text-tertiary">
                Click a run to reopen its report
              </span>
              <span className="font-mono text-[10.5px] tracking-tight text-text-quaternary">
                localStorage · sovereign-history
              </span>
            </footer>
          </>
        )}
      </GlassCard>
    </main>
  )
}

function RunRow({
  run,
  onOpen,
  onRemove,
}: {
  run: RunHistoryEntry
  onOpen: () => void
  onRemove: () => void
}) {
  const flagged = run.sanctionedCount > 0
  const Icon = flagged ? AlertOctagon : CheckCircle2
  const tone = flagged ? 'text-flag-red' : 'text-flag-green'

  return (
    <li
      onClick={onOpen}
      className="group flex items-center gap-4 py-3 border-b border-glass-border last:border-b-0 hover:bg-glass-tint -mx-2 px-2 rounded-lg transition-colors duration-200 cursor-pointer"
    >
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-glass-tint',
          tone
        )}
      >
        <Icon size={15} strokeWidth={1.75} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-inter text-[13px] font-medium text-text-primary truncate">
            {run.pdfName ?? 'Untitled'}
          </span>
          <span className="font-mono text-[10.5px] tracking-tight text-text-quaternary">
            {run.id.slice(0, 8)}
          </span>
        </div>
        <p className="font-instrument text-[10.5px] font-medium tracking-wider uppercase text-text-tertiary mt-0.5">
          {formatDate(run.createdAt)} · {(run.totalMs / 1000).toFixed(1)}s ·{' '}
          {run.walletCount} {run.walletCount === 1 ? 'wallet' : 'wallets'} ·{' '}
          {run.totalPaidUsdt} USDT-SPL
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {flagged ? (
          <span className="font-instrument text-[10.5px] font-medium tracking-wider uppercase text-flag-red">
            {run.sanctionedCount} flagged
          </span>
        ) : (
          <span className="font-instrument text-[10.5px] font-medium tracking-wider uppercase text-flag-green">
            clean
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            if (confirm(`Delete ${run.pdfName ?? 'this run'}?`)) onRemove()
          }}
          aria-label="Delete run"
          className="opacity-0 group-hover:opacity-100 text-text-quaternary hover:text-flag-red transition-all"
        >
          <Trash2 size={12} strokeWidth={1.75} />
        </button>
        <FileText
          size={14}
          strokeWidth={1.75}
          className="text-text-tertiary group-hover:text-cyan transition-colors"
        />
      </div>
    </li>
  )
}
