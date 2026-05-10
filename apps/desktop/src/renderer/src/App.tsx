import { useEffect, useState } from 'react'
import { Sidebar, type NavKey } from './components/Sidebar'
import { PrivacyBadge } from './components/PrivacyBadge'
import { DropZone } from './components/DropZone'
import { ScanStream } from './components/ScanStream'
import { SettlementToast } from './components/SettlementToast'
import { QvacStatusPill } from './components/QvacStatus'
import { ForensicReport } from './components/ForensicReport'
import { AgentTimeline } from './components/AgentTimeline'
import { InvestigationReport } from './components/InvestigationReport'
import { HistoryView } from './components/views/HistoryView'
import { FundsView } from './components/views/FundsView'
import { SettingsView } from './components/views/SettingsView'
import { usePipelineEvents } from './hooks/usePipelineEvents'
import { usePipelineStore } from './store/pipeline'
import type { RunSnapshot } from './store/history'

export default function App() {
  const [activeNav, setActiveNav] = useState<NavKey>('investigate')
  const [reportOpen, setReportOpen] = useState(false)
  // When a past run is selected from History, this snapshot drives the
  // InvestigationReport instead of the live pipeline. Cleared on close.
  const [reportSnapshot, setReportSnapshot] = useState<RunSnapshot | null>(null)

  // Subscribe to main-process pipeline events once
  usePipelineEvents()

  // Prevent Electron from navigating to dropped files outside the DropZone.
  useEffect(() => {
    const block = (e: DragEvent) => e.preventDefault()
    window.addEventListener('dragover', block)
    window.addEventListener('drop', block)
    return () => {
      window.removeEventListener('dragover', block)
      window.removeEventListener('drop', block)
    }
  }, [])

  const scanLines = usePipelineStore((s) => s.scanLines)
  const status = usePipelineStore((s) => s.status)
  const toasts = usePipelineStore((s) => s.toasts)
  const startRun = usePipelineStore((s) => s.startRun)

  const isLive = status === 'running'

  return (
    <div className="relative z-10 flex h-screen w-screen overflow-hidden p-4 gap-4">
      {/* Sidebar */}
      <Sidebar active={activeNav} onSelect={setActiveNav} />

      {/* Switch view based on active sidebar nav. Investigate is the primary
          surface; History / Funds / Settings each have their own layout. */}
      {activeNav === 'investigate' && (
        <InvestigateView
          isLive={isLive}
          scanLines={scanLines}
          toasts={toasts}
          startRun={startRun}
          onOpenReport={() => {
            setReportSnapshot(null) // live run
            setReportOpen(true)
          }}
        />
      )}
      {activeNav === 'history' && (
        <HistoryView
          onOpenRun={(entry) => {
            setReportSnapshot(entry.snapshot)
            setReportOpen(true)
          }}
        />
      )}
      {activeNav === 'wallet' && <FundsView />}
      {activeNav === 'settings' && <SettingsView />}

      {/* Full Investigation Report — slide-over (works from any view) */}
      <InvestigationReport
        open={reportOpen}
        onClose={() => {
          setReportOpen(false)
          // Clear snapshot after the close animation so the panel doesn't
          // flash back to live state mid-transition.
          setTimeout(() => setReportSnapshot(null), 320)
        }}
        snapshot={reportSnapshot}
      />
    </div>
  )
}

// ── Investigate view (the primary forensic surface) ───────────────────

interface InvestigateViewProps {
  isLive: boolean
  scanLines: ReturnType<typeof usePipelineStore.getState>['scanLines']
  toasts: ReturnType<typeof usePipelineStore.getState>['toasts']
  startRun: ReturnType<typeof usePipelineStore.getState>['startRun']
  onOpenReport: () => void
}

function InvestigateView({
  isLive,
  scanLines,
  toasts,
  startRun,
  onOpenReport,
}: InvestigateViewProps) {
  return (
    <main className="flex-1 flex flex-col gap-4 overflow-hidden">
      {/* Top bar — Privacy Badge always visible */}
      <header className="flex items-center justify-between shrink-0">
        <div>
          <p className="font-instrument text-[10.5px] font-medium tracking-[0.12em] text-text-tertiary uppercase">
            New Investigation
          </p>
          <h2 className="font-bricolage text-[26px] font-700 tracking-tight text-text-primary mt-1">
            Forensic AI
            <span className="text-text-tertiary"> for documents you can't send to the cloud.</span>
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <QvacStatusPill />
          <PrivacyBadge online />
        </div>
      </header>

      {/* Bento grid: DropZone(8) + AgentTimeline(4) ; ScanStream(8) + ForensicReport(4)
          The agent's wallet/funds panel lives in the sidebar footer — keeps
          it visible at all times without consuming the prime grid real-estate. */}
      <div className="flex-1 grid grid-cols-12 grid-rows-[1fr_1fr] gap-4 min-h-0">
        {/* Hero — DropZone */}
        <div className="col-span-8 row-span-1 flex">
          <div className="flex-1">
            <DropZone onTrigger={(name, pages) => void startRun(name, pages)} />
          </div>
        </div>

        {/* Agent Timeline — chain-of-action summary, prominent top-right */}
        <div className="col-span-4 row-span-1 flex min-h-0">
          <div className="flex-1 min-h-0 flex">
            <AgentTimeline />
          </div>
        </div>

        {/* Scan Stream — technical log, anchors the settlement toast stack */}
        <div className="relative col-span-8 row-span-1 min-h-0">
          <ScanStream lines={scanLines} active={isLive} />

          <div className="pointer-events-none absolute bottom-3 right-3 z-30 flex flex-col gap-2 items-end">
            {toasts.map((t) => (
              <SettlementToast
                key={t.id}
                amount={t.amount}
                recipient={t.recipient}
                txSig={t.txSig}
                latencyMs={t.latencyMs}
              />
            ))}
          </div>
        </div>

        {/* Forensic Report */}
        <div className="col-span-4 row-span-1 min-h-0">
          <ForensicReport onOpenFullReport={onOpenReport} />
        </div>
      </div>
    </main>
  )
}
