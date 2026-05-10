import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '@renderer/lib/cn'

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  active?: boolean
  hoverable?: boolean
  children: ReactNode
}

/**
 * The signature glass surface. Use everywhere except <body>.
 * — `active`: applies cyan border + glow (use during scanning / payment)
 * — `hoverable`: brightens border on hover
 */
export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ active, hoverable, className, children, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'glass relative',
          hoverable && 'glass-hover cursor-pointer',
          active && 'glass-active',
          className
        )}
        {...rest}
      >
        {children}
      </div>
    )
  }
)

GlassCard.displayName = 'GlassCard'
