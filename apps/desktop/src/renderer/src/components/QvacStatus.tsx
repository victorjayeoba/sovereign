import { useEffect, useMemo, useState } from 'react'
import { Activity, CheckCircle2, AlertTriangle } from 'lucide-react'
import type { QvacStatus as QvacStatusT } from '@sovereign/shared'
import { cn } from '@renderer/lib/cn'

const KEY_LABEL: Record<'llm' | 'ocr' | 'embed', string> = {
  ocr: 'OCR',
  embed: 'EMBED',
  llm: 'LLM',
}

interface QvacStatusProps {
  className?: string
}

/**
 * Compact pill that shows whether QVAC is loading, ready, or errored.
 * Drives off main-process events and polls status on mount.
 */
export function QvacStatusPill({ className }: QvacStatusProps) {
  const [status, setStatus] = useState<QvacStatusT | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [warmupTriggered, setWarmupTriggered] = useState(false)

  // Boot: fetch initial status, then trigger warmup if needed
  useEffect(() => {
    if (!window.sovereign?.qvac) {
      setError('Preload bridge unavailable (window.sovereign missing)')
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const s = await window.sovereign.qvac.status()
        if (!cancelled) setStatus(s)
        if (!cancelled && !s.ready && !warmupTriggered) {
          setWarmupTriggered(true)
          await window.sovereign.qvac.warmup()
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Subscribe to load progress + ready events
  useEffect(() => {
    if (!window.sovereign?.qvac) return
    const offProgress = window.sovereign.qvac.onLoadProgress(() => {
      void window.sovereign.qvac.status().then(setStatus).catch(() => {})
    })
    const offReady = window.sovereign.qvac.onReady(() => {
      void window.sovereign.qvac.status().then(setStatus).catch(() => {})
    })
    const offError = window.sovereign.qvac.onError((e) => {
      setError(e.message)
    })
    return () => {
      offProgress()
      offReady()
      offError()
    }
  }, [])

  const ready = status?.ready ?? false
  const overallPct = status?.overallPct ?? 0

  const label = useMemo(() => {
    if (error) return 'QVAC Error'
    if (!status) return 'QVAC Loading…'
    // Display is backend-agnostic — same label whether mock or real engine
    // is selected. Keeps the UI clean on Windows dev runs while still
    // accurately reflecting "real" runtime on Mac demo machines.
    if (ready) return 'QVAC Ready'
    return `Loading QVAC · ${Math.round(overallPct)}%`
  }, [error, status, ready, overallPct])

  const Icon = error ? AlertTriangle : ready ? CheckCircle2 : Activity

  return (
    <div
      className={cn(
        'glass flex items-center gap-2.5 px-3.5 py-2',
        error && 'border-flag-red/60',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <Icon
        size={14}
        strokeWidth={1.75}
        className={cn(
          error
            ? 'text-flag-red'
            : ready
            ? 'text-flag-green'
            : 'text-cyan animate-pulse-cyan'
        )}
      />
      <span
        className={cn(
          'font-instrument text-[12px] font-medium tracking-wide uppercase',
          error ? 'text-flag-red' : 'text-text-secondary'
        )}
      >
        {label}
      </span>

      {/* Per-module dots */}
      <span className="flex items-center gap-1 ml-1.5">
        {(status?.modules ?? []).map((m) => (
          <span
            key={m.key}
            title={`${KEY_LABEL[m.key]} ${m.loaded ? 'ready' : 'loading'}`}
            className={cn(
              'h-1.5 w-1.5 rounded-full transition-colors',
              m.loaded ? 'bg-cyan' : 'bg-text-quaternary'
            )}
          />
        ))}
      </span>
    </div>
  )
}
