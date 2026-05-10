import { useMemo } from 'react'
import { AlertOctagon, CheckCircle2, FileText } from 'lucide-react'
import { cn } from '@renderer/lib/cn'
import {
  usePipelineStore,
  type EntityRecord,
  type RunStatus,
} from '@renderer/store/pipeline'

interface ForensicReportProps {
  /** Called when user clicks "View Full Report" — opens the slide-over. */
  onOpenFullReport?: () => void
}

const truncAddr = (a: string): string =>
  a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a

const truncSig = (s: string | undefined): string => {
  if (!s) return ''
  return s.length > 10 ? `${s.slice(0, 4)}…${s.slice(-4)}` : s
}

function statusLabel(status: RunStatus, hasResults: boolean): string {
  if (status === 'running') return hasResults ? 'live' : 'scanning'
  if (status === 'done') return 'ready'
  if (status === 'error') return 'error'
  return hasResults ? 'idle' : 'pending'
}

function statusTone(status: RunStatus): string {
  if (status === 'running') return 'text-cyan'
  if (status === 'done') return 'text-flag-green'
  if (status === 'error') return 'text-flag-red'
  return 'text-text-tertiary'
}

export function ForensicReport({ onOpenFullReport }: ForensicReportProps = {}) {
  const entities = usePipelineStore((s) => s.entities)
  const status = usePipelineStore((s) => s.status)
  const totals = usePipelineStore((s) => s.totals)

  const wallets = useMemo<EntityRecord[]>(
    () => entities.filter((e) => e.type === 'wallet_address'),
    [entities]
  )

  const empty = wallets.length === 0
  // "Flagged" = caught by ANY source — synthesizes across OFAC + mixer signals.
  const flaggedCount =
    totals?.sanctionedCount ??
    wallets.filter((w) => w.sanctioned || w.mixerLinked).length
  const totalPaid = totals?.totalPaidUsdt
  const totalMs = totals?.totalMs

  return (
    <div className="glass flex h-full flex-col">
      <header className="flex items-center justify-between px-5 pt-4 pb-3">
        <h3 className="font-bricolage text-[14px] font-700 tracking-tight text-text-primary">
          Forensic Findings
        </h3>
        <span
          className={cn(
            'font-instrument text-[10.5px] font-medium tracking-wider uppercase',
            statusTone(status)
          )}
        >
          {statusLabel(status, !empty)}
        </span>
      </header>
      <div className="hairline mx-5" />

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {empty ? (
          <div className="flex flex-col gap-3">
            <p className="font-inter text-[12.5px] text-text-secondary leading-relaxed">
              Drop a document. Sovereign extracts every entity, verifies the
              wallet addresses against authoritative sources, and returns an
              auditable forensic report.
            </p>
            <ul className="flex flex-col gap-1.5 mt-1">
              {[
                'Entities — people, organizations, jurisdictions',
                'Wallet addresses across Ethereum, Bitcoin, Solana',
                'Owner attribution + cross-page deduplication',
                'OFAC sanctions verdicts paid per-query in USDT-SPL',
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 font-instrument text-[11px] tracking-wide text-text-tertiary"
                >
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-text-quaternary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ul className="flex flex-col gap-3.5">
            {wallets.map((w, i) => (
              <WalletRow key={w.value + i} wallet={w} />
            ))}
          </ul>
        )}
      </div>

      {!empty && (
        <>
          <div className="hairline mx-5" />
          <footer className="flex flex-col gap-2 px-5 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-instrument text-[10.5px] font-medium tracking-wider uppercase text-text-tertiary whitespace-nowrap">
                {wallets.length} {wallets.length === 1 ? 'wallet' : 'wallets'}
              </span>
              {flaggedCount > 0 && (
                <span className="font-instrument text-[10.5px] font-medium tracking-wider uppercase text-flag-red whitespace-nowrap">
                  {flaggedCount} flagged
                </span>
              )}
            </div>
            {(totalPaid || typeof totalMs === 'number') && (
              <div className="flex items-center justify-between gap-3">
                {totalPaid ? (
                  <span className="font-mono text-[11px] tracking-tight text-text-secondary whitespace-nowrap">
                    {totalPaid} USDT-SPL paid
                  </span>
                ) : (
                  <span />
                )}
                {typeof totalMs === 'number' && (
                  <span className="font-mono text-[11px] tracking-tight text-text-tertiary whitespace-nowrap">
                    {(totalMs / 1000).toFixed(2)}s
                  </span>
                )}
              </div>
            )}
            {onOpenFullReport && (
              <button
                type="button"
                onClick={onOpenFullReport}
                className={cn(
                  'mt-1 flex items-center justify-between gap-2 rounded-lg px-3 py-2 -mx-1',
                  'glass glass-hover transition-colors duration-200',
                  'group'
                )}
              >
                <span className="flex items-center gap-2">
                  <FileText
                    size={12}
                    strokeWidth={1.75}
                    className="text-cyan"
                  />
                  <span className="font-instrument text-[10.5px] font-medium tracking-[0.14em] uppercase text-text-secondary group-hover:text-text-primary transition-colors">
                    View Full Report
                  </span>
                </span>
                <span className="font-instrument text-[14px] text-cyan opacity-70 group-hover:opacity-100 transition-opacity">
                  →
                </span>
              </button>
            )}
          </footer>
        </>
      )}
    </div>
  )
}

function WalletRow({ wallet }: { wallet: EntityRecord }) {
  const sanctioned = wallet.sanctioned === true
  const ofacKnown = typeof wallet.sanctioned === 'boolean'
  const flagName = wallet.matches?.[0]?.name

  const mixerLinked = wallet.mixerLinked === true
  const mixerKnown = typeof wallet.mixerLinked === 'boolean'
  const mixerName = wallet.mixerMatches?.[0]?.name
  const mixerType = wallet.mixerMatches?.[0]?.type

  const flagged = sanctioned || mixerLinked
  const allClean = ofacKnown && mixerKnown && !sanctioned && !mixerLinked

  const Icon = flagged ? AlertOctagon : CheckCircle2
  const iconTone = flagged
    ? 'text-flag-red'
    : allClean
    ? 'text-flag-green'
    : 'text-text-tertiary'

  return (
    <li className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0">
        <Icon size={14} strokeWidth={1.75} className={iconTone} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-inter text-[12.5px] font-medium text-text-primary truncate">
          {wallet.ownerEntityValue ?? 'Unattributed'}
        </p>
        <p className="font-mono text-[11px] tracking-tight text-text-tertiary mt-0.5 truncate">
          {truncAddr(wallet.value)}
        </p>

        {/* Per-source signals stacked on their own lines so each verdict is
            readable. Empty until the corresponding paid lookup settles. */}
        <div className="flex flex-col gap-0.5 mt-1.5">
          {ofacKnown && (
            <div className="flex items-center gap-1.5">
              <span className="font-instrument text-[9px] font-medium tracking-[0.14em] uppercase text-text-quaternary w-12 shrink-0">
                OFAC
              </span>
              <span
                className={cn(
                  'font-inter text-[10.5px] truncate',
                  sanctioned ? 'text-flag-red' : 'text-flag-green'
                )}
              >
                {sanctioned ? flagName ?? 'flagged' : 'clean'}
              </span>
            </div>
          )}
          {mixerKnown && (
            <div className="flex items-center gap-1.5">
              <span className="font-instrument text-[9px] font-medium tracking-[0.14em] uppercase text-text-quaternary w-12 shrink-0">
                Mixer
              </span>
              <span
                className={cn(
                  'font-inter text-[10.5px] truncate',
                  mixerLinked ? 'text-flag-red' : 'text-flag-green'
                )}
              >
                {mixerLinked
                  ? `${mixerName ?? 'mixer-linked'}${mixerType ? ` ${mixerType}` : ''}`
                  : 'clean'}
              </span>
            </div>
          )}
        </div>
      </div>
    </li>
  )
}
