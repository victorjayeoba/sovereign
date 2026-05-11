import type * as React from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  SquareLock01Icon,
  Coins01Icon,
  FileSearchIcon,
  ArrowUpRight01Icon,
} from '@hugeicons/core-free-icons'

export default function Pillars() {
  return (
    <section id="how" className="relative z-10 px-6 lg:px-12 py-14 lg:py-20">
      <div className="mx-auto max-w-[1280px]">
        {/* Section eyebrow + heading */}
        <div className="max-w-[680px]">
          <span className="eyebrow">
            <span className="cyan-dot" />
            Three Pillars
          </span>
          <h2 className="mt-5 font-bricolage text-[26px] sm:text-[32px] lg:text-[40px] leading-[1.08] font-700 tracking-[-0.025em]">
            <span className="text-ice-gradient">The forensic stack,</span>
            <br />
            <span className="text-text-tertiary">re-architected for sovereignty.</span>
          </h2>
          <p className="mt-4 max-w-[520px] font-inter text-[14.5px] leading-[1.55] text-text-secondary">
            One desktop binary. No backend. The model runs where the evidence lives,
            and the agent settles its own bills in stablecoin.
          </p>
        </div>

        {/* Bento — 8/4 / 4/4/4 */}
        <div className="mt-9 lg:mt-10 grid grid-cols-12 gap-4 lg:gap-6">
          {/* Hero card — Local inference */}
          <Card span="col-span-12 lg:col-span-8" tone="cyan">
            <div className="flex items-start justify-between gap-6">
              <div>
                <Tag icon={<HugeiconsIcon icon={SquareLock01Icon} size={12} strokeWidth={2} />} label="QVAC" />
                <h3 className="mt-5 font-bricolage text-[28px] lg:text-[34px] font-700 leading-[1.1] tracking-tight text-ice-gradient">
                  Documents never leave the device.
                </h3>
                <p className="mt-4 max-w-[440px] font-inter text-[14.5px] leading-[1.55] text-text-secondary">
                  Local QVAC inference runs the OCR, entity extraction, and
                  sanctions match. Evidence stays under your roof — admissible,
                  air-gapped, on the record.
                </p>
              </div>
              <BigStat value="0" unit="bytes leaked" />
            </div>

            <Hairline />

            <div className="grid grid-cols-3 gap-6">
              <Spec label="Inference" value="On-device" />
              <Spec label="Network" value="Air-gap ok" />
              <Spec label="Audit log" value="Signed locally" />
            </div>
          </Card>

          {/* Pays its own way */}
          <Card span="col-span-12 lg:col-span-4">
            <Tag icon={<HugeiconsIcon icon={Coins01Icon} size={12} strokeWidth={2} />} label="x402 · USDT-SPL" />
            <h3 className="mt-5 font-bricolage text-[24px] font-700 leading-[1.15] tracking-tight text-ice-gradient">
              The agent pays its own bills.
            </h3>
            <p className="mt-3 font-inter text-[14px] leading-[1.55] text-text-secondary">
              When the model needs an external signal, the agent settles the call
              in USDT-SPL via x402 — no API key, no human in the loop.
            </p>
            <div className="mt-6 font-mono text-[11.5px] leading-snug text-text-tertiary">
              <span className="text-cyan">PAY</span> → 0.05 USDT-SPL → Sentinel
              <br />
              <span className="text-flag-green">TX</span> → 5fK9…3aBz · 1.4s
            </div>
          </Card>

          {/* Findings */}
          <Card span="col-span-12 md:col-span-6 lg:col-span-4">
            <Tag icon={<HugeiconsIcon icon={FileSearchIcon} size={12} strokeWidth={2} />} label="Forensic Report" />
            <h3 className="mt-5 font-bricolage text-[22px] font-700 leading-[1.15] tracking-tight text-ice-gradient">
              Chain-of-custody, by default.
            </h3>
            <p className="mt-3 font-inter text-[13.5px] leading-[1.55] text-text-secondary">
              Every finding ships with the page, the line, the wallet, and the
              sanctions list it matched. Signed and exportable as PDF.
            </p>
          </Card>

          {/* Sentinel API */}
          <Card span="col-span-12 md:col-span-6 lg:col-span-4">
            <Tag icon={<HugeiconsIcon icon={Coins01Icon} size={12} strokeWidth={2} />} label="Sentinel API" />
            <h3 className="mt-5 font-bricolage text-[22px] font-700 leading-[1.15] tracking-tight text-ice-gradient">
              Pay-per-query intel.
            </h3>
            <p className="mt-3 font-inter text-[13.5px] leading-[1.55] text-text-secondary">
              Sanctions lists, mixer heuristics, and on-chain attribution
              priced per call. Composable with any x402-aware agent.
            </p>
          </Card>

          {/* Frontier callout */}
          <Card span="col-span-12 lg:col-span-4" tone="cyan">
            <Tag label="Frontier · 2026" />
            <h3 className="mt-5 font-bricolage text-[22px] font-700 leading-[1.15] tracking-tight text-ice-gradient">
              Built for Colosseum Frontier.
            </h3>
            <p className="mt-3 font-inter text-[13.5px] leading-[1.55] text-text-secondary">
              Submitted to the Frontier hackathon — Tether QVAC side track. Live
              demo, signed binary, open code.
            </p>
            <a
              href="#"
              className="mt-6 inline-flex items-center gap-1.5 font-instrument text-[11px] uppercase tracking-[0.16em] text-cyan hover:text-white transition-colors"
            >
              Read the whitepaper
              <HugeiconsIcon icon={ArrowUpRight01Icon} size={13} strokeWidth={2} />
            </a>
          </Card>
        </div>
      </div>
    </section>
  )
}

function Card({
  children, span, tone,
}: { children: React.ReactNode; span: string; tone?: 'cyan' }) {
  return (
    <div
      className={`${span} glass glass-hover p-7 lg:p-9 flex flex-col gap-3 min-h-[260px] relative overflow-hidden`}
    >
      {tone === 'cyan' && (
        <div
          aria-hidden
          className="pointer-events-none absolute -top-12 -right-12 w-64 h-64 rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(0, 209, 255, 0.18), transparent 70%)',
            filter: 'blur(20px)',
          }}
        />
      )}
      <div className="relative z-10 flex-1 flex flex-col gap-3">{children}</div>
    </div>
  )
}

function Tag({ icon, label }: { icon?: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full border border-glass-border bg-white/[0.02] font-instrument text-[10px] font-500 uppercase tracking-[0.16em] text-text-secondary">
      {icon && <span className="text-cyan">{icon}</span>}
      {label}
    </span>
  )
}

function BigStat({ value, unit }: { value: string; unit: string }) {
  return (
    <div className="text-right shrink-0">
      <div className="font-bricolage text-[56px] font-800 leading-none text-ice-gradient">
        {value}
      </div>
      <div className="mt-1 font-instrument text-[9.5px] uppercase tracking-[0.18em] text-text-tertiary">
        {unit}
      </div>
    </div>
  )
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-instrument text-[9.5px] uppercase tracking-[0.18em] text-text-tertiary">
        {label}
      </div>
      <div className="mt-1 font-inter text-[13px] font-500 text-text-primary">{value}</div>
    </div>
  )
}

function Hairline() {
  return <div className="hairline my-2" />
}
