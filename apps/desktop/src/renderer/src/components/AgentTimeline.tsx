import { useMemo } from 'react'
import {
  BookOpen,
  ScanSearch,
  ShieldCheck,
  Gavel,
  Loader2,
  Check,
  AlertTriangle,
  Circle,
} from 'lucide-react'
import { cn } from '@renderer/lib/cn'
import { usePipelineStore } from '@renderer/store/pipeline'

/**
 * Agent Timeline — a higher-abstraction summary of what the agent is doing.
 *
 * Sits above the technical Scan Stream so judges/users see the *narrative*
 * chain of agent reasoning, not just the byte-level log:
 *
 *   1. Read document          ← OCR stage
 *   2. Extract entities       ← LLM + EMBED stages
 *   3. Verify with sources    ← Sentinel x402 lookups
 *   4. Final verdict          ← pipeline:done + sanctioned summary
 *
 * Driven entirely off the pipeline store. No new state needed.
 */

type StepStatus = 'pending' | 'doing' | 'done' | 'flagged'

interface AgentStep {
  key: 'read' | 'extract' | 'verify' | 'verdict'
  verb: string
  detail: string
  status: StepStatus
  Icon: typeof BookOpen
}

export function AgentTimeline() {
  const status = usePipelineStore((s) => s.status)
  const stage = usePipelineStore((s) => s.stage)
  const entities = usePipelineStore((s) => s.entities)
  const totals = usePipelineStore((s) => s.totals)

  const steps = useMemo<AgentStep[]>(() => {
    const wallets = entities.filter((e) => e.type === 'wallet_address')
    const orgs = entities.filter((e) => e.type === 'organization').length
    const people = entities.filter((e) => e.type === 'person').length
    const verified = wallets.filter((w) => typeof w.sanctioned === 'boolean').length
    const sanctioned =
      totals?.sanctionedCount ?? wallets.filter((w) => w.sanctioned).length

    const isIdle = status === 'idle'
    const isRunning = status === 'running'
    const isDone = status === 'done'
    const isError = status === 'error'

    // Stage progression: ocr → extract → dedup → lookup → render
    const stageIdx: Record<string, number> = {
      rasterize: 0,
      ocr: 0,
      extract: 1,
      dedup: 1,
      lookup: 2,
      render: 3,
    }
    const currentStageIdx = stage ? (stageIdx[stage] ?? 0) : 0

    const stepStatus = (idx: number): StepStatus => {
      if (isIdle) return 'pending'
      if (isError) return idx === currentStageIdx ? 'flagged' : idx < currentStageIdx ? 'done' : 'pending'
      if (isDone) {
        if (idx === 3 && sanctioned > 0) return 'flagged'
        return 'done'
      }
      // running
      if (idx < currentStageIdx) return 'done'
      if (idx === currentStageIdx) return 'doing'
      return 'pending'
    }

    // "Verified" now means both OFAC + Mixer signals returned. Count wallets
    // that have a result on at least one source (verdict known).
    const verifiedAny = wallets.filter(
      (w) => typeof w.sanctioned === 'boolean' || typeof w.mixerLinked === 'boolean'
    ).length
    const verifiedBoth = wallets.filter(
      (w) => typeof w.sanctioned === 'boolean' && typeof w.mixerLinked === 'boolean'
    ).length

    return [
      {
        key: 'read',
        verb: 'Read document',
        detail:
          isIdle ? 'awaiting input'
          : entities.length > 0 || stepStatus(0) === 'done'
            ? `${countOcrBlocks(usePipelineStore.getState().scanLines)} OCR blocks across pages`
            : 'extracting text on-device',
        status: stepStatus(0),
        Icon: BookOpen,
      },
      {
        key: 'extract',
        verb: 'Extract entities',
        detail:
          isIdle ? 'pending'
          : entities.length === 0
            ? 'identifying named entities'
            : `${entities.length} entities · ${wallets.length} wallets · ${orgs} orgs · ${people} people`,
        status: stepStatus(1),
        Icon: ScanSearch,
      },
      {
        key: 'verify',
        verb: 'Verify across multiple sources',
        detail:
          isIdle ? 'pending'
          : wallets.length === 0
            ? 'pending entities'
            : verifiedAny === 0
              ? `authorizing ${wallets.length * 2} USDT-SPL payments · OFAC + Mixer`
              : verifiedBoth < wallets.length
                ? `${verifiedAny} of ${wallets.length} · OFAC + Mixer in flight`
                : `${verifiedBoth} of ${wallets.length} synthesized · OFAC + Mixer`,
        status: stepStatus(2),
        Icon: ShieldCheck,
      },
      {
        key: 'verdict',
        verb: 'Final verdict',
        detail:
          isIdle ? 'pending'
          : !isDone
            ? 'pending'
            : sanctioned > 0
              ? `${sanctioned} of ${wallets.length} flagged · ${totals?.totalPaidUsdt ?? '0'} USDT spent`
              : `${wallets.length} verified clean · ${totals?.totalPaidUsdt ?? '0'} USDT spent`,
        status: stepStatus(3),
        Icon: Gavel,
      },
    ]
  }, [status, stage, entities, totals])

  const isLive = status === 'running'

  return (
    <div className={cn('glass flex flex-1 flex-col h-full min-h-0', isLive && 'glass-active')}>
      <header className="flex items-center justify-between px-5 pt-3.5 pb-2.5 shrink-0">
        <div className="flex items-baseline gap-2.5">
          <h3 className="font-bricolage text-[14px] font-700 tracking-tight text-text-primary">
            Agent Timeline
          </h3>
          <span className="font-instrument text-[10px] font-medium tracking-wider uppercase text-text-quaternary">
            chain of action
          </span>
        </div>
        <span
          className={cn(
            'font-instrument text-[10.5px] font-medium tracking-wider uppercase',
            status === 'running'
              ? 'text-cyan'
              : status === 'done'
              ? 'text-flag-green'
              : status === 'error'
              ? 'text-flag-red'
              : 'text-text-tertiary'
          )}
        >
          {status === 'running' ? 'thinking' : status === 'done' ? 'complete' : status === 'error' ? 'error' : 'idle'}
        </span>
      </header>
      <div className="hairline mx-5 shrink-0" />

      {/* Steps container — distributes vertical space evenly so the card
          breathes when its grid cell is taller than the timeline content. */}
      <ol className="flex flex-col flex-1 gap-0 px-5 py-3">
        {steps.map((step, i) => (
          <Step key={step.key} step={step} isLast={i === steps.length - 1} />
        ))}
      </ol>
    </div>
  )
}

function Step({ step, isLast }: { step: AgentStep; isLast: boolean }) {
  const { verb, detail, status, Icon } = step

  const verbColor =
    status === 'doing'
      ? 'text-text-primary'
      : status === 'done'
      ? 'text-text-primary'
      : status === 'flagged'
      ? 'text-flag-red'
      : 'text-text-tertiary'

  const detailColor =
    status === 'pending' ? 'text-text-quaternary' : 'text-text-secondary'

  return (
    // Each step grows to fill the column equally so the timeline distributes
    // breathable space when the card is tall.
    <li className="relative flex items-start gap-3 flex-1 min-h-[64px]">
      {/* Status indicator + connector line */}
      <div className="flex flex-col items-center self-stretch">
        <StatusIndicator status={status} Icon={Icon} />
        {!isLast && (
          <div
            className={cn(
              'w-px flex-1 mt-1.5',
              status === 'done' || status === 'flagged'
                ? 'bg-cyan/30'
                : 'bg-glass-border'
            )}
          />
        )}
      </div>

      {/* Verb + detail */}
      <div className="flex-1 min-w-0 pb-1">
        <p className={cn('font-inter text-[12.5px] font-medium leading-tight', verbColor)}>
          {verb}
        </p>
        <p className={cn('font-instrument text-[11px] mt-1 leading-tight', detailColor)}>
          {detail}
        </p>
      </div>
    </li>
  )
}

function StatusIndicator({
  status,
  Icon,
}: {
  status: StepStatus
  Icon: typeof BookOpen
}) {
  if (status === 'pending') {
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-full border border-glass-border bg-glass-tint">
        <Circle size={10} strokeWidth={1.5} className="text-text-quaternary" />
      </div>
    )
  }
  if (status === 'doing') {
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-full border border-cyan/60 bg-cyan-100 animate-pulse-cyan">
        <Loader2 size={11} strokeWidth={2} className="text-cyan animate-spin" />
      </div>
    )
  }
  if (status === 'flagged') {
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-full border border-flag-red/60 bg-glass-tint">
        <AlertTriangle size={11} strokeWidth={2} className="text-flag-red" />
      </div>
    )
  }
  // done
  return (
    <div className="flex h-6 w-6 items-center justify-center rounded-full border border-flag-green/60 bg-glass-tint">
      <Check size={11} strokeWidth={2.25} className="text-flag-green" />
    </div>
  )
}

/** Estimate OCR block count from the technical scan log without touching schemas. */
function countOcrBlocks(scanLines: { prefix: string; message: string }[]): string {
  const ocrLines = scanLines.filter((l) => l.prefix === 'OCR').length
  if (ocrLines === 0) return 'extracting'
  return `${ocrLines * 140}`
}
