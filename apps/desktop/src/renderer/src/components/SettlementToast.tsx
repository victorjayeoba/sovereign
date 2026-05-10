import { Zap } from 'lucide-react'
import { cn } from '@renderer/lib/cn'

export interface SettlementToastProps {
  amount: string // "0.05"
  asset?: string // "USDT-SPL"
  recipient: string // "Sentinel"
  txSig: string // truncated already, e.g. "5fK9…3aBz"
  latencyMs: number
  className?: string
}

/**
 * The autonomous-payment notification — slides in bottom-right when the agent
 * settles a Sentinel lookup. Single-line compact form so multiple stacked
 * toasts do not obscure the Forensic Findings card. Auto-dismiss is handled
 * by the store (4s).
 */
export function SettlementToast({
  amount,
  asset = 'USDT-SPL',
  recipient,
  txSig,
  latencyMs,
  className,
}: SettlementToastProps) {
  return (
    <div
      className={cn(
        'glass animate-slide-in-right pointer-events-auto',
        'flex items-center gap-3 px-3.5 py-2.5 min-w-[280px] max-w-[320px]',
        className
      )}
      role="status"
    >
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-cyan">
        <Zap size={12} strokeWidth={2} />
      </div>

      <div className="flex-1 min-w-0 flex items-baseline gap-2">
        <span className="font-inter text-[12.5px] font-medium text-text-primary whitespace-nowrap">
          {amount} {asset}
        </span>
        <span className="font-mono text-[11px] tracking-tight text-text-tertiary truncate">
          {recipient} · {txSig} · {(latencyMs / 1000).toFixed(2)}s
        </span>
      </div>
    </div>
  )
}
