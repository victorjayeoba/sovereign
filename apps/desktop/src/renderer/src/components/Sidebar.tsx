import { useEffect } from 'react'
import { FileSearch, History, Settings, Coins, Wallet } from 'lucide-react'
import { cn } from '@renderer/lib/cn'
import { useWalletStore } from '@renderer/store/wallet'

type NavKey = 'investigate' | 'history' | 'wallet' | 'settings'

interface NavItem {
  key: NavKey
  label: string
  icon: typeof FileSearch
}

// Note: NavKey 'wallet' is preserved for compatibility but the user-facing
// label is "Funds" — distinguishes the agent's own wallet from wallet
// addresses found inside investigated documents.
const NAV: NavItem[] = [
  { key: 'investigate', label: 'Investigate', icon: FileSearch },
  { key: 'history', label: 'History', icon: History },
  { key: 'wallet', label: 'Funds', icon: Coins },
  { key: 'settings', label: 'Settings', icon: Settings },
]

interface SidebarProps {
  active: NavKey
  onSelect: (key: NavKey) => void
}

export function Sidebar({ active, onSelect }: SidebarProps) {
  return (
    <aside className="glass h-full w-[240px] shrink-0 flex flex-col py-5 px-3">
      {/* Wordmark */}
      <div className="px-3 pb-5">
        <h1 className="font-bricolage text-[22px] font-700 tracking-tight text-text-primary">
          Sovereign
        </h1>
        <p className="font-instrument text-[10.5px] font-medium tracking-[0.08em] text-text-tertiary uppercase mt-1">
          Forensic AI
        </p>
      </div>

      <div className="hairline mx-3 my-2" />

      {/* Nav */}
      <nav className="flex flex-col gap-1 mt-2">
        {NAV.map(({ key, label, icon: Icon }) => {
          const isActive = active === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              className={cn(
                'group flex items-center gap-3 px-3 py-2 rounded-lg text-left',
                'font-inter text-[13.5px] font-medium tracking-tight',
                'transition-colors duration-200',
                isActive
                  ? 'bg-glass-tint text-text-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-glass-tint'
              )}
            >
              <Icon
                size={16}
                strokeWidth={1.75}
                className={cn(
                  'transition-colors',
                  isActive ? 'text-cyan' : 'text-text-tertiary group-hover:text-text-secondary'
                )}
              />
              {label}
            </button>
          )
        })}
      </nav>

      <div className="flex-1" />

      {/* Compact funds panel — visible at all times, doesn't compete for
          bento grid real-estate */}
      <FundsPanel onSelect={onSelect} />

      {/* Footer metadata */}
      <div className="px-3 pt-3">
        <div className="hairline mb-2.5" />
        <p className="font-instrument text-[10px] font-medium tracking-wider text-text-quaternary uppercase">
          v0.1.0 · devnet
        </p>
      </div>
    </aside>
  )
}

// ── Compact funds panel ────────────────────────────────────────────────
//
// Shows the agent's own wallet/funds at a glance. Empty state prompts the
// user to create a wallet. When wired, will display address + USDT/SOL.

interface FundsPanelProps {
  onSelect: (key: NavKey) => void
}

function FundsPanel({ onSelect }: FundsPanelProps) {
  const initialized = useWalletStore((s) => s.initialized)
  const address = useWalletStore((s) => s.address) ?? undefined
  const usdtBalance = useWalletStore((s) => s.usdtBalance) ?? undefined
  const solBalance = useWalletStore((s) => s.solBalance) ?? undefined
  const refresh = useWalletStore((s) => s.refresh)

  // Subscribe to wallet state on mount; refresh from main process.
  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!initialized) {
    return (
      <button
        type="button"
        onClick={() => onSelect('wallet')}
        className={cn(
          'mx-3 mt-3 px-3 py-3 rounded-lg text-left',
          'glass glass-hover',
          'transition-colors duration-200'
        )}
      >
        <div className="flex items-center gap-2">
          <Wallet size={13} strokeWidth={1.75} className="text-text-tertiary" />
          <span className="font-instrument text-[10px] font-medium tracking-[0.12em] text-text-tertiary uppercase">
            Funds
          </span>
        </div>
        <p className="font-inter text-[11.5px] text-text-secondary mt-1.5 leading-snug">
          No agent wallet yet.
        </p>
        <p className="font-instrument text-[10px] font-medium tracking-wider text-cyan uppercase mt-1">
          Tap to create →
        </p>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onSelect('wallet')}
      className={cn(
        'mx-3 mt-3 px-3 py-3 rounded-lg text-left',
        'glass glass-hover',
        'transition-colors duration-200'
      )}
    >
      <div className="flex items-center gap-2">
        <Wallet size={13} strokeWidth={1.75} className="text-cyan" />
        <span className="font-instrument text-[10px] font-medium tracking-[0.12em] text-text-tertiary uppercase">
          Funds
        </span>
      </div>
      <p className="font-mono text-[11px] tracking-tight text-text-primary mt-1.5 truncate">
        {address ? truncateAddress(address) : '—'}
      </p>
      <div className="grid grid-cols-2 gap-2 mt-2">
        <div>
          <p className="font-instrument text-[9px] font-medium tracking-wider text-text-quaternary uppercase">
            USDT
          </p>
          <p className="font-bricolage text-[13px] font-700 tracking-tight text-text-primary mt-0.5">
            {usdtBalance ?? '0.00'}
          </p>
        </div>
        <div>
          <p className="font-instrument text-[9px] font-medium tracking-wider text-text-quaternary uppercase">
            SOL
          </p>
          <p className="font-bricolage text-[13px] font-700 tracking-tight text-text-primary mt-0.5">
            {solBalance ?? '0.0000'}
          </p>
        </div>
      </div>
    </button>
  )
}

function truncateAddress(addr: string): string {
  if (addr.length <= 10) return addr
  return `${addr.slice(0, 5)}…${addr.slice(-4)}`
}

export type { NavKey }
