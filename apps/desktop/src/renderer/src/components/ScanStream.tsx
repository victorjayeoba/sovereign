import { useLayoutEffect, useRef } from 'react'
import { cn } from '@renderer/lib/cn'
import type { ScanLine, ScanLineKind } from '@renderer/store/pipeline'

export type { ScanLine, ScanLineKind } from '@renderer/store/pipeline'

interface ScanStreamProps {
  lines: ScanLine[]
  active?: boolean
}

const PREFIX_COLOR: Record<ScanLineKind, string> = {
  system: 'text-cyan',
  finding: 'text-flag-amber',
  flag: 'text-flag-red',
  confirm: 'text-flag-green',
}

export function ScanStream({ lines, active }: ScanStreamProps) {
  const empty = lines.length === 0
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // Stick to the bottom as new lines arrive. useLayoutEffect runs after the
  // DOM mutates but before paint, so scrollHeight reflects the new <li>.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [lines])

  return (
    <div className={cn('glass flex h-full flex-col', active && 'glass-active')}>
      <header className="flex items-center justify-between px-5 pt-4 pb-3">
        <h3 className="font-bricolage text-[14px] font-700 tracking-tight text-text-primary">
          Scan Stream
        </h3>
        <span
          className={cn(
            'font-instrument text-[10.5px] font-medium tracking-wider uppercase',
            active ? 'text-cyan' : 'text-text-tertiary'
          )}
        >
          {active ? 'live' : 'idle'}
        </span>
      </header>
      <div className="hairline mx-5" />

      <div
        ref={scrollRef}
        className={cn(
          'flex-1 overflow-y-auto px-5 py-3 font-mono text-[12px] leading-[1.65]',
          empty && 'flex items-center justify-center'
        )}
      >
        {empty ? (
          <p className="font-instrument text-[11px] tracking-wide uppercase text-text-tertiary">
            Awaiting input
          </p>
        ) : (
          <ul className="space-y-1">
            {lines.map((line) => (
              <li key={line.id} className="flex gap-3 animate-fade-in">
                <span className="text-text-quaternary">[{line.ts}]</span>
                <span
                  className={cn(
                    'w-12 shrink-0 font-medium',
                    PREFIX_COLOR[line.kind]
                  )}
                >
                  {line.prefix}
                </span>
                <span className="text-text-secondary">→ {line.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
