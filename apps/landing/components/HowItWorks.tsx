import type * as React from 'react'

/**
 * "How it works" — three numbered steps that walk through the agent pipeline.
 * Drop → Analyze → Settle. Mirrors the in-app flow.
 */
export default function HowItWorks() {
  return (
    <section
      id="how"
      className="relative z-10 px-6 lg:px-12 py-14 lg:py-20 border-t border-glass-border"
    >
      <div className="mx-auto max-w-[1280px]">
        <header className="max-w-[680px]">
          <span className="eyebrow">
            <span className="cyan-dot" />
            How it works
          </span>
          <h2 className="mt-5 font-bricolage text-[26px] sm:text-[32px] lg:text-[40px] font-700 tracking-[-0.025em] leading-[1.08]">
            <span className="text-ice-gradient">Drop. Analyze. Settle.</span>
          </h2>
          <p className="mt-4 max-w-[520px] font-inter text-[14.5px] leading-[1.55] text-text-secondary">
            One desktop binary. Three steps. The entire pipeline runs on your
            machine — the agent only reaches the network when it needs to pay
            for a signal.
          </p>
        </header>

        <ol className="mt-9 lg:mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          <Step
            number="01"
            title="Drop a document."
            body="Drag a classified PDF into the desktop app. OCR runs locally — 420 text blocks across 7 pages parsed in under 2 seconds."
            tech="OCR · Local"
          />
          <Step
            number="02"
            title="Local AI extracts entities."
            body="QVAC inference identifies wallets, organisations, and counterparties. Each one is queued for sanctions screening."
            tech="QVAC · 8 entities"
          />
          <Step
            number="03"
            title="The agent pays its bills."
            body="When the model needs a sanctions lookup it settles in USDT-SPL via x402. No API keys, no human in the loop — just a signed receipt."
            tech="x402 · USDT-SPL"
          />
        </ol>
      </div>
    </section>
  )
}

function Step({
  number,
  title,
  body,
  tech,
}: {
  number: string
  title: string
  body: string
  tech: string
}) {
  return (
    <li className="glass glass-hover p-6 lg:p-7 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-bricolage text-[28px] font-700 text-ice-gradient leading-none">
          {number}
        </span>
        <span className="font-instrument text-[9.5px] uppercase tracking-[0.18em] text-text-tertiary">
          {tech}
        </span>
      </div>
      <div className="hairline" />
      <h3 className="font-bricolage text-[19px] font-700 leading-[1.15] tracking-tight text-text-primary mt-1">
        {title}
      </h3>
      <p className="font-inter text-[13.5px] leading-[1.55] text-text-secondary">
        {body}
      </p>
    </li>
  )
}
