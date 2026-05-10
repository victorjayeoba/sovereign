import { useCallback, useState, type DragEvent, type MouseEvent } from 'react'
import { FileText, Upload, Activity } from 'lucide-react'
import type { PageText } from '@sovereign/shared'
import { cn } from '@renderer/lib/cn'
import { extractPdfText, extractPdfTextFromBytes } from '@renderer/lib/pdfRead'
import { usePipelineStore } from '@renderer/store/pipeline'

interface DropZoneProps {
  onTrigger?: (pdfName: string, pages?: PageText[]) => void
}

const DEMO_FILENAME = 'meridian_atlas_memo.pdf'

export function DropZone({ onTrigger }: DropZoneProps) {
  const [hovering, setHovering] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)
  const status = usePipelineStore((s) => s.status)
  const stage = usePipelineStore((s) => s.stage)
  const pdfName = usePipelineStore((s) => s.pdfName)

  const running = status === 'running'
  const busy = running || extracting

  const fire = useCallback(
    (name: string, pages?: PageText[]) => {
      if (busy) return
      onTrigger?.(name, pages)
    },
    [onTrigger, busy]
  )

  const fireFile = useCallback(
    async (file: File) => {
      if (busy) return
      setExtractError(null)
      setExtracting(true)
      try {
        const pages = await extractPdfText(file)
        onTrigger?.(file.name, pages)
      } catch (e) {
        setExtractError(e instanceof Error ? e.message : 'Failed to read PDF')
      } finally {
        setExtracting(false)
      }
    },
    [onTrigger, busy]
  )

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setHovering(true)
  }, [])

  const onDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setHovering(false)
  }, [])

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setHovering(false)
      const file = e.dataTransfer.files?.[0]
      if (file) void fireFile(file)
    },
    [fireFile]
  )

  const onClick = useCallback(
    async (_e: MouseEvent<HTMLDivElement>) => {
      if (busy) return
      setExtractError(null)
      try {
        const pick = await window.sovereign.app.pickPdf()
        if (pick.cancelled) return
        setExtracting(true)
        const pages = await extractPdfTextFromBytes(pick.bytes)
        onTrigger?.(pick.name, pages)
      } catch (e) {
        setExtractError(e instanceof Error ? e.message : 'Failed to read PDF')
      } finally {
        setExtracting(false)
      }
    },
    [onTrigger, busy]
  )

  const onDemoClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      e.stopPropagation()
      e.preventDefault()
      fire(DEMO_FILENAME)
    },
    [fire]
  )

  const showActive = hovering || busy

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
      className={cn(
        'glass relative flex flex-1 flex-col items-center justify-center h-full min-h-0',
        'px-8 py-12 text-center cursor-pointer select-none',
        running && 'cursor-default',
        showActive && 'glass-active'
      )}
      role="button"
      aria-label="Drop a PDF to start a forensic investigation"
    >
      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full mb-5',
          'transition-colors duration-200',
          busy
            ? 'bg-cyan-100 text-cyan'
            : showActive
            ? 'bg-cyan-100 text-cyan'
            : 'bg-glass-tint text-text-secondary'
        )}
      >
        {busy ? (
          <Activity size={20} strokeWidth={1.75} className="animate-pulse-cyan" />
        ) : hovering ? (
          <Upload size={20} strokeWidth={1.75} />
        ) : (
          <FileText size={20} strokeWidth={1.75} />
        )}
      </div>

      <h2 className="font-bricolage text-[22px] font-700 tracking-tight text-text-primary">
        {extracting
          ? 'Reading PDF on-device…'
          : running
          ? `Scanning ${pdfName ?? 'document'}…`
          : 'Drop a Document'}
      </h2>
      <p className="font-inter text-[13px] font-normal text-text-secondary mt-2 max-w-[420px]">
        {extracting ? (
          <>Extracting text via pdfjs in the renderer — bytes never leave the device.</>
        ) : running ? (
          <>
            Stage <span className="text-cyan">{stage ?? 'starting'}</span>. The
            agent is working on-device — and paying for what it needs.
          </>
        ) : extractError ? (
          <span className="text-flag-red">{extractError}</span>
        ) : (
          <>PDF only. Inference runs on this device — your file never leaves the machine.</>
        )}
      </p>

      <div className="hairline w-32 mt-7" />

      <p className="font-instrument text-[10.5px] font-medium tracking-wider text-text-tertiary uppercase mt-4">
        {busy ? (
          'Live · do not disturb'
        ) : (
          <>
            Drop a PDF · or click to browse ·{' '}
            <a
              href="#"
              onClick={onDemoClick}
              className="text-cyan hover:underline"
            >
              run demo
            </a>
          </>
        )}
      </p>
    </div>
  )
}
