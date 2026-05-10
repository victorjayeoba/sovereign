import { cn } from '@renderer/lib/cn'

interface PrivacyBadgeProps {
  online?: boolean
  className?: string
}

/**
 * The persistent trust signal — top-right of the app, visible at all times.
 * The cyan dot pulses to reinforce that local inference is live.
 */
export function PrivacyBadge({ online = true, className }: PrivacyBadgeProps) {
  return (
    <div
      className={cn(
        'glass flex items-center gap-2.5 px-3.5 py-2 select-none',
        className
      )}
    >
      <span
        className={cn(
          'cyan-dot',
          online && 'animate-pulse-cyan'
        )}
        aria-hidden
      />
      <span className="font-instrument text-[12px] font-medium tracking-wide text-text-secondary uppercase">
        100% Local Inference
      </span>
    </div>
  )
}
