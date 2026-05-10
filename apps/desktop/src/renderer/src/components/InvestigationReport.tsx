import { useEffect, useMemo, useState } from 'react'
import { X, ExternalLink, AlertOctagon, ShieldCheck, FileText, Coins, Users, Download, Loader2 } from 'lucide-react'
import { cn } from '@renderer/lib/cn'
import { usePipelineStore, type EntityRecord, type RunTotals } from '@renderer/store/pipeline'
import type { RunSnapshot } from '@renderer/store/history'
import { exportInvestigationPdf } from '@renderer/lib/exportPdf'

/**
 * Investigation Report — full-screen slide-over with the agent's deliverable.
 *
 * Reads from the pipeline store. Pure presentational; no events emitted.
 * Slides in from the right when `open === true`, dims the bento behind it.
 *
 * Per the design system, slide-overs are preferred over modals for this kind
 * of "expand for detail" interaction.
 */

interface InvestigationReportProps {
  open: boolean
  onClose: () => void
  /**
   * When provided, the report renders this past-run snapshot instead of the
   * live pipeline state. Used by the History tab to reopen completed runs.
   */
  snapshot?: RunSnapshot | null
}

const truncAddr = (a: string): string =>
  a.length > 14 ? `${a.slice(0, 6)}…${a.slice(-6)}` : a

const truncSig = (s: string | undefined): string => {
  if (!s) return ''
  return s.length > 12 ? `${s.slice(0, 6)}…${s.slice(-6)}` : s
}

function buildInvestigationId(runId: string | null, startedAt: number | null): string {
  if (!runId) return 'INV-PENDING'
  const d = new Date(startedAt ?? Date.now())
  const date = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`
  const tail = runId.slice(0, 4).toUpperCase()
  return `INV-${date}-${tail}`
}

function buildExecutiveSummary(
  pdfName: string | null,
  walletCount: number,
  flaggedCount: number,
  entityCount: number,
  orgs: string[],
  ofacHits: number,
  mixerHits: number
): string {
  const subject = pdfName ?? 'the document'
  const orgClause =
    orgs.length > 0
      ? `disclosing the operating wallets of "${orgs[0]}"${orgs.length > 1 ? ` and ${orgs.length - 1} other organization${orgs.length > 2 ? 's' : ''}` : ''}`
      : 'with disclosed wallet inventory'

  if (flaggedCount === 0 && walletCount === 0) {
    return `Sovereign analyzed ${subject} on-device. No wallet addresses were found in the document and no external verifications were required.`
  }

  if (flaggedCount === 0) {
    return `Sovereign analyzed ${subject} ${orgClause}. ${walletCount} unique wallet address${walletCount !== 1 ? 'es' : ''} were extracted and verified across two authoritative sources — the OFAC Specially Designated Nationals list and a mixer-linkage registry. No flags were returned by either source. ${entityCount} entities were identified across the document.`
  }

  // Compose source breakdown for the headline
  const sourceParts: string[] = []
  if (ofacHits > 0) sourceParts.push(`${ofacHits} OFAC SDN match${ofacHits !== 1 ? 'es' : ''}`)
  if (mixerHits > 0) sourceParts.push(`${mixerHits} mixer-linked`)
  const sourceClause = sourceParts.join(' + ')

  return `Sovereign analyzed ${subject} ${orgClause}. Of ${walletCount} unique wallet address${walletCount !== 1 ? 'es' : ''}, ${flaggedCount} were flagged across two authoritative sources (${sourceClause}). The agent autonomously settled ${walletCount * 2} verification queries in USDT-SPL — one OFAC check and one mixer-linkage check per address — to synthesize this verdict. ${entityCount} entities were identified across the document. Recommendation: STOP — escalate to legal counsel.`
}

function buildVerdict(walletCount: number, sanctionedCount: number, status: string): {
  label: string
  tone: 'flag-red' | 'flag-amber' | 'flag-green' | 'cyan' | 'tertiary'
  description: string
} {
  if (status === 'running') {
    return { label: 'IN PROGRESS', tone: 'cyan', description: 'Investigation ongoing' }
  }
  if (status === 'error') {
    return { label: 'ERROR', tone: 'flag-red', description: 'Investigation failed mid-run' }
  }
  if (status === 'idle' || walletCount === 0) {
    return { label: 'PENDING', tone: 'tertiary', description: 'No findings yet' }
  }
  if (sanctionedCount > 0) {
    return {
      label: 'HIGH RISK',
      tone: 'flag-red',
      description: `${sanctionedCount} of ${walletCount} wallets matched active sanctions`,
    }
  }
  return {
    label: 'CLEAN',
    tone: 'flag-green',
    description: `All ${walletCount} verified wallet${walletCount !== 1 ? 's' : ''} clean`,
  }
}

export function InvestigationReport({ open, onClose, snapshot }: InvestigationReportProps) {
  // ESC to close
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // When a snapshot is provided (History tab), render that. Otherwise read
  // from the live pipeline store. Subscriptions are unconditional so React
  // re-renders correctly when either source changes.
  const liveRunId = usePipelineStore((s) => s.runId)
  const livePdfName = usePipelineStore((s) => s.pdfName)
  const liveStartedAt = usePipelineStore((s) => s.startedAt)
  const liveStatus = usePipelineStore((s) => s.status)
  const liveEntities = usePipelineStore((s) => s.entities)
  const liveTotals = usePipelineStore((s) => s.totals)

  const runId = snapshot?.runId ?? liveRunId
  const pdfName = snapshot?.pdfName ?? livePdfName
  const startedAt = snapshot?.startedAt ?? liveStartedAt
  const status: 'idle' | 'running' | 'done' | 'error' = snapshot ? 'done' : liveStatus
  const entities: EntityRecord[] = snapshot?.entities ?? liveEntities
  const totals: RunTotals | null = snapshot?.totals ?? liveTotals

  const [exporting, setExporting] = useState(false)

  const wallets = useMemo<EntityRecord[]>(
    () => entities.filter((e) => e.type === 'wallet_address'),
    [entities]
  )
  const orgs = useMemo<EntityRecord[]>(
    () => entities.filter((e) => e.type === 'organization'),
    [entities]
  )
  const people = useMemo<EntityRecord[]>(
    () => entities.filter((e) => e.type === 'person'),
    [entities]
  )

  // "Flagged" synthesizes across OFAC + mixer signals.
  const sanctionedCount =
    totals?.sanctionedCount ??
    wallets.filter((w) => w.sanctioned || w.mixerLinked).length
  const ofacHits = wallets.filter((w) => w.sanctioned).length
  const mixerHits = wallets.filter((w) => w.mixerLinked).length
  const investigationId = buildInvestigationId(runId, startedAt)
  const verdict = buildVerdict(wallets.length, sanctionedCount, status)
  const summary = buildExecutiveSummary(
    pdfName,
    wallets.length,
    sanctionedCount,
    entities.length,
    orgs.map((o) => o.value),
    ofacHits,
    mixerHits
  )

  const completedAt = useMemo(() => {
    if (!startedAt) return null
    const t = totals?.totalMs ? startedAt + totals.totalMs : startedAt
    return new Date(t)
  }, [startedAt, totals?.totalMs])

  const verdictColor = {
    'flag-red': 'text-flag-red border-flag-red/50',
    'flag-amber': 'text-flag-amber border-flag-amber/50',
    'flag-green': 'text-flag-green border-flag-green/50',
    cyan: 'text-cyan border-cyan/50',
    tertiary: 'text-text-tertiary border-glass-border',
  }[verdict.tone]

  return (
    <>
      {/* Backdrop — clicks close the slide-over */}
      <div
        onClick={onClose}
        aria-hidden
        className={cn(
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Investigation report"
        className={cn(
          'fixed top-0 right-0 z-50 h-screen w-[min(720px,92vw)]',
          'transition-transform duration-300 ease-soft',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="glass h-full overflow-hidden flex flex-col">
          {/* Header bar */}
          <header className="flex items-start justify-between gap-4 px-7 pt-7 pb-5">
            <div className="flex-1 min-w-0">
              <p className="font-instrument text-[10.5px] font-medium tracking-[0.18em] text-text-tertiary uppercase">
                Investigation Report
              </p>
              <h2 className="font-bricolage text-[22px] font-700 tracking-tight text-text-primary mt-1.5 leading-tight">
                {pdfName ?? 'Untitled investigation'}
              </h2>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span
                className={cn(
                  'font-instrument text-[10px] font-medium tracking-[0.18em] uppercase',
                  'glass px-2.5 py-1 border',
                  verdictColor
                )}
              >
                {verdict.label}
              </span>

              {/* Download PDF — primary action */}
              {wallets.length > 0 && (
                <button
                  onClick={async () => {
                    if (exporting) return
                    setExporting(true)
                    try {
                      await exportInvestigationPdf({
                        investigationId,
                        pdfName,
                        startedAt,
                        totals,
                        entities,
                        sanctionedCount,
                        status,
                        ofacHits,
                        mixerHits,
                      })
                    } finally {
                      setExporting(false)
                    }
                  }}
                  aria-label="Download report as PDF"
                  disabled={exporting}
                  className={cn(
                    'flex items-center gap-2 h-8 px-3 rounded-lg',
                    'glass glass-hover',
                    'border border-cyan/40 hover:border-cyan/70',
                    'text-cyan transition-colors duration-200',
                    'disabled:opacity-60 disabled:cursor-wait'
                  )}
                >
                  {exporting ? (
                    <Loader2 size={13} strokeWidth={2} className="animate-spin" />
                  ) : (
                    <Download size={13} strokeWidth={2} />
                  )}
                  <span className="font-instrument text-[10px] font-medium tracking-[0.16em] uppercase">
                    {exporting ? 'Exporting…' : 'Download PDF'}
                  </span>
                </button>
              )}

              <button
                onClick={onClose}
                aria-label="Close report"
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg',
                  'glass glass-hover text-text-secondary hover:text-text-primary',
                  'transition-colors duration-200'
                )}
              >
                <X size={16} strokeWidth={1.75} />
              </button>
            </div>
          </header>

          <div className="hairline mx-7" />

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-7 py-6 space-y-7">
            {/* Metadata grid */}
            <section className="grid grid-cols-2 gap-x-6 gap-y-3.5 text-[11.5px] font-inter">
              <MetaRow label="Investigation ID" value={<span className="font-mono">{investigationId}</span>} />
              <MetaRow label="Subject" value={pdfName ?? '—'} />
              <MetaRow label="Agent" value="Sovereign · 100% Local" />
              <MetaRow
                label="Completed"
                value={
                  completedAt
                    ? `${completedAt.toISOString().slice(0, 10)} ${completedAt.toISOString().slice(11, 16)} UTC`
                    : '—'
                }
              />
              <MetaRow
                label="Elapsed"
                value={totals?.totalMs ? `${(totals.totalMs / 1000).toFixed(2)}s` : '—'}
              />
              <MetaRow
                label="Cost"
                value={totals?.totalPaidUsdt ? `${totals.totalPaidUsdt} USDT-SPL` : '—'}
              />
            </section>

            {/* Verdict banner */}
            <section
              className={cn(
                'glass border-l-2 px-5 py-4',
                verdict.tone === 'flag-red' && 'border-l-flag-red',
                verdict.tone === 'flag-amber' && 'border-l-flag-amber',
                verdict.tone === 'flag-green' && 'border-l-flag-green',
                verdict.tone === 'cyan' && 'border-l-cyan',
                verdict.tone === 'tertiary' && 'border-l-glass-border'
              )}
            >
              <p className="font-instrument text-[10px] font-medium tracking-[0.18em] uppercase text-text-tertiary">
                Verdict
              </p>
              <p className={cn('font-bricolage text-[16px] font-700 mt-1', verdictColor.split(' ')[0])}>
                {verdict.label}
              </p>
              <p className="font-inter text-[12.5px] text-text-secondary mt-1">
                {verdict.description}
              </p>
            </section>

            {/* Executive Summary */}
            <Section icon={FileText} title="Executive Summary">
              <p className="font-inter text-[13px] text-text-primary leading-relaxed">
                {summary}
              </p>
            </Section>

            {/* Key Findings (wallets) */}
            <Section icon={ShieldCheck} title="Key Findings" count={wallets.length}>
              {wallets.length === 0 ? (
                <p className="font-inter text-[12.5px] text-text-tertiary italic">
                  No wallet addresses extracted.
                </p>
              ) : (
                <ol className="flex flex-col gap-4 mt-1">
                  {wallets.map((w, i) => (
                    <FindingRow key={w.value + i} index={i + 1} wallet={w} />
                  ))}
                </ol>
              )}
            </Section>

            {/* Entities */}
            {(orgs.length > 0 || people.length > 0) && (
              <Section icon={Users} title="Entities Identified" count={orgs.length + people.length}>
                <ul className="flex flex-col gap-2 mt-1">
                  {orgs.map((o, i) => (
                    <li key={o.value + i} className="flex items-baseline gap-2.5">
                      <span className="font-instrument text-[10px] font-medium tracking-[0.14em] text-text-quaternary uppercase shrink-0">
                        Org
                      </span>
                      <span className="font-inter text-[12.5px] text-text-primary">
                        {o.value}
                      </span>
                    </li>
                  ))}
                  {people.map((p, i) => (
                    <li key={p.value + i} className="flex items-baseline gap-2.5">
                      <span className="font-instrument text-[10px] font-medium tracking-[0.14em] text-text-quaternary uppercase shrink-0">
                        Person
                      </span>
                      <span className="font-inter text-[12.5px] text-text-primary">
                        {p.value}
                        {p.ownerEntityValue && (
                          <span className="text-text-tertiary"> · {p.ownerEntityValue}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* Payment Ledger — both OFAC + Mixer settlements per address */}
            {(() => {
              type PaymentRow = {
                address: string
                source: 'OFAC' | 'Mixer'
                txSig: string
              }
              const payments: PaymentRow[] = []
              for (const w of wallets) {
                if (w.paymentTxSig) {
                  payments.push({ address: w.value, source: 'OFAC', txSig: w.paymentTxSig })
                }
                if (w.mixerPaymentTxSig) {
                  payments.push({
                    address: w.value,
                    source: 'Mixer',
                    txSig: w.mixerPaymentTxSig,
                  })
                }
              }
              return (
                <Section icon={Coins} title="Payment Ledger" count={payments.length}>
                  {payments.length === 0 ? (
                    <p className="font-inter text-[12.5px] text-text-tertiary italic">
                      No external verifications settled yet.
                    </p>
                  ) : (
                    <>
                      <p className="font-inter text-[12.5px] text-text-secondary leading-relaxed mb-3">
                        Every wallet was independently verified against two
                        sources — OFAC SDN and Mixer Linkage. Each settled
                        autonomously in USDT-SPL on Solana Devnet.
                      </p>
                      <ul className="flex flex-col gap-2.5">
                        {payments.map((p, i) => (
                          <li
                            key={p.txSig + i}
                            className="flex items-center justify-between gap-3 font-mono text-[11px]"
                          >
                            <span className="text-text-tertiary truncate flex-1">
                              {truncAddr(p.address)}
                            </span>
                            <span className="font-instrument text-[10px] tracking-[0.14em] uppercase text-text-quaternary w-16 shrink-0">
                              {p.source}
                            </span>
                            <span className="text-text-secondary truncate w-24 shrink-0">
                              {truncSig(p.txSig)}
                            </span>
                            <a
                              href="#"
                              onClick={(e) => {
                                e.preventDefault()
                                const url = `https://explorer.solana.com/tx/${p.txSig}?cluster=devnet`
                                void window.sovereign.app.openExternal(url)
                              }}
                              className="flex items-center gap-1 text-cyan hover:text-cyan transition-opacity opacity-70 hover:opacity-100 shrink-0"
                            >
                              <span className="font-instrument text-[10px] tracking-wider uppercase">
                                Verify
                              </span>
                              <ExternalLink size={10} strokeWidth={2} />
                            </a>
                          </li>
                        ))}
                      </ul>
                      <div className="hairline my-3" />
                      <div className="flex items-center justify-between font-instrument text-[10.5px] tracking-[0.14em] uppercase">
                        <span className="text-text-tertiary">
                          {payments.length} settlements · {wallets.length}{' '}
                          {wallets.length === 1 ? 'wallet' : 'wallets'} ×{' '}
                          {payments.length / Math.max(1, wallets.length) >= 1.5
                            ? '2 sources'
                            : '1 source'}
                        </span>
                        <span className="text-text-secondary font-mono">
                          {totals?.totalPaidUsdt ?? '0'} USDT-SPL total
                        </span>
                      </div>
                    </>
                  )}
                </Section>
              )
            })()}

            {/* Recommendation */}
            {sanctionedCount > 0 && (
              <Section icon={AlertOctagon} title="Recommendation" tone="alert">
                <p className="font-inter text-[13px] text-text-primary leading-relaxed">
                  <strong className="text-flag-red">STOP — escalate to legal counsel</strong>{' '}
                  before further engagement. {sanctionedCount} sanctioned wallet
                  {sanctionedCount !== 1 ? 's' : ''} disclosed by the
                  counterparty represent{sanctionedCount === 1 ? 's' : ''} material federal
                  compliance exposure under OFAC regulations. The counterparty
                  may be unable to legally accept funds from US-jurisdiction
                  investors. Document and counterparty identifiers should be
                  preserved in their current form pending review.
                </p>
              </Section>
            )}
          </div>

          {/* Footer */}
          <footer className="border-t border-glass-border px-7 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="cyan-dot" aria-hidden />
              <span className="font-instrument text-[10.5px] font-medium tracking-[0.14em] uppercase text-text-tertiary">
                Sovereign · 100% Local Inference
              </span>
            </div>
            <span className="font-instrument text-[10px] tracking-wider uppercase text-text-quaternary">
              Document never left this device
            </span>
          </footer>
        </div>
      </aside>
    </>
  )
}

// ── Internal building blocks ───────────────────────────────────────────

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="font-instrument text-[9.5px] font-medium tracking-[0.16em] uppercase text-text-tertiary">
        {label}
      </p>
      <p className="font-inter text-[12px] text-text-primary mt-0.5">{value}</p>
    </div>
  )
}

function Section({
  icon: Icon,
  title,
  count,
  tone,
  children,
}: {
  icon: typeof FileText
  title: string
  count?: number
  tone?: 'alert'
  children: React.ReactNode
}) {
  return (
    <section>
      <header className="flex items-center gap-2.5 mb-3">
        <Icon
          size={13}
          strokeWidth={1.75}
          className={tone === 'alert' ? 'text-flag-red' : 'text-text-secondary'}
        />
        <h3
          className={cn(
            'font-bricolage text-[13.5px] font-700 tracking-[0.06em] uppercase',
            tone === 'alert' ? 'text-flag-red' : 'text-text-primary'
          )}
        >
          {title}
        </h3>
        {typeof count === 'number' && (
          <span className="font-instrument text-[10px] font-medium tracking-wider uppercase text-text-quaternary">
            {count}
          </span>
        )}
        <div className="hairline flex-1 ml-1" />
      </header>
      {children}
    </section>
  )
}

function FindingRow({ index, wallet }: { index: number; wallet: EntityRecord }) {
  const sanctioned = wallet.sanctioned === true
  const ofacKnown = typeof wallet.sanctioned === 'boolean'
  const flagName = wallet.matches?.[0]?.name
  const flagProgram = wallet.matches?.[0]?.program?.[0]

  const mixerLinked = wallet.mixerLinked === true
  const mixerKnown = typeof wallet.mixerLinked === 'boolean'
  const mixerName = wallet.mixerMatches?.[0]?.name
  const mixerType = wallet.mixerMatches?.[0]?.type
  const mixerRemarks = wallet.mixerMatches?.[0]?.remarks

  const flagged = sanctioned || mixerLinked
  const allKnown = ofacKnown && mixerKnown
  const allClean = allKnown && !sanctioned && !mixerLinked

  return (
    <li className="flex gap-3.5">
      <span
        className={cn(
          'font-bricolage text-[14px] font-700 leading-none w-5 shrink-0 mt-0.5',
          flagged ? 'text-flag-red' : allClean ? 'text-flag-green' : 'text-text-tertiary'
        )}
      >
        {String(index).padStart(2, '0')}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-mono text-[12px] text-text-primary tracking-tight">
            {truncAddr(wallet.value)}
          </span>
          {flagged ? (
            <span className="font-inter text-[12px] font-medium text-flag-red">
              · flagged by {[sanctioned && 'OFAC', mixerLinked && 'mixer linkage']
                .filter(Boolean)
                .join(' + ')}
            </span>
          ) : allClean ? (
            <span className="font-inter text-[12px] font-medium text-flag-green">
              · clean across all sources
            </span>
          ) : null}
        </div>

        <p className="font-inter text-[12px] text-text-secondary mt-1 leading-snug">
          Document context:{' '}
          {wallet.ownerEntityValue ? (
            <span className="text-text-primary">"{wallet.ownerEntityValue}"</span>
          ) : (
            <span className="text-text-tertiary italic">unattributed</span>
          )}
        </p>

        {/* Per-source signal lines */}
        <div className="flex flex-col gap-1.5 mt-2">
          {ofacKnown && (
            <SignalLine
              source="OFAC SDN"
              flagged={sanctioned}
              detail={
                sanctioned
                  ? `${flagName ?? 'flagged'}${flagProgram ? ` (${flagProgram})` : ''}`
                  : 'no match — clean'
              }
              txSig={wallet.paymentTxSig}
            />
          )}
          {mixerKnown && (
            <SignalLine
              source="Mixer Linkage"
              flagged={mixerLinked}
              detail={
                mixerLinked
                  ? `${mixerName ?? 'mixer-linked'}${mixerType ? ` ${mixerType}` : ''}${
                      mixerRemarks ? ` — ${mixerRemarks}` : ''
                    }`
                  : 'no exposure — clean'
              }
              txSig={wallet.mixerPaymentTxSig}
            />
          )}
        </div>
      </div>
    </li>
  )
}

function SignalLine({
  source,
  flagged,
  detail,
  txSig,
}: {
  source: string
  flagged: boolean
  detail: string
  txSig?: string
}) {
  return (
    <div className="flex items-start gap-2">
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full mt-1.5 shrink-0',
          flagged ? 'bg-flag-red' : 'bg-flag-green'
        )}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-instrument text-[10px] font-medium tracking-[0.14em] uppercase text-text-quaternary">
            {source}
          </span>
          <span
            className={cn(
              'font-inter text-[11.5px] leading-snug',
              flagged ? 'text-flag-red' : 'text-flag-green'
            )}
          >
            {detail}
          </span>
        </div>
        {txSig && (
          <p className="font-instrument text-[9.5px] font-medium tracking-[0.14em] uppercase text-text-tertiary mt-0.5">
            paid · solana-devnet/tx/{truncSig(txSig)}
          </p>
        )}
      </div>
    </div>
  )
}
