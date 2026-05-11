import { HugeiconsIcon } from '@hugeicons/react'
import {
  SquareLock01Icon,
  FileSearchIcon,
  Coins01Icon,
} from '@hugeicons/core-free-icons'
import type * as React from 'react'

/**
 * Three target personas — AML, legal discovery, investigative journalism.
 * Each card answers "why Sovereign for *me*?" in one tight paragraph.
 */
export default function UseCases() {
  return (
    <section
      id="use-cases"
      className="relative z-10 px-6 lg:px-12 py-14 lg:py-20 border-t border-glass-border"
    >
      <div className="mx-auto max-w-[1280px]">
        <header className="max-w-[680px]">
          <span className="eyebrow">
            <span className="cyan-dot" />
            Built for
          </span>
          <h2 className="mt-5 font-bricolage text-[26px] sm:text-[32px] lg:text-[40px] font-700 tracking-[-0.025em] leading-[1.08]">
            <span className="text-ice-gradient">
              The people who can&apos;t paste their evidence into ChatGPT.
            </span>
          </h2>
        </header>

        <div className="mt-9 lg:mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          <Persona
            icon={<HugeiconsIcon icon={SquareLock01Icon} size={18} strokeWidth={1.8} />}
            tag="AML Analyst"
            title="Sanctions screening, on your desk."
            body="Drop a wire-transfer memo. Get an OFAC, mixer, and counterparty report without a single byte touching a third-party API."
          />
          <Persona
            icon={<HugeiconsIcon icon={FileSearchIcon} size={18} strokeWidth={1.8} />}
            tag="Legal Discovery"
            title="Privilege intact. Air-gapped."
            body="Run document review on materials under protective order. Every finding is signed locally and exportable as a chain-of-custody PDF."
          />
          <Persona
            icon={<HugeiconsIcon icon={Coins01Icon} size={18} strokeWidth={1.8} />}
            tag="Investigative Journalism"
            title="Source protection by default."
            body="No cloud means no subpoena trail to the SaaS vendor. The agent pays for sanctions and on-chain data in USDT-SPL — never tied to your identity."
          />
        </div>
      </div>
    </section>
  )
}

function Persona({
  icon,
  tag,
  title,
  body,
}: {
  icon: React.ReactNode
  tag: string
  title: string
  body: string
}) {
  return (
    <article className="glass glass-hover p-6 lg:p-7 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center w-8 h-8 rounded-[10px] border border-glass-border bg-white/[0.02] text-cyan">
          {icon}
        </span>
        <span className="font-instrument text-[10px] font-500 uppercase tracking-[0.16em] text-text-secondary">
          {tag}
        </span>
      </div>
      <h3 className="font-bricolage text-[20px] font-700 leading-[1.15] tracking-tight text-ice-gradient mt-1">
        {title}
      </h3>
      <p className="font-inter text-[13.5px] leading-[1.55] text-text-secondary">
        {body}
      </p>
    </article>
  )
}
