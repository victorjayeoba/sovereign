import { HugeiconsIcon } from '@hugeicons/react'
import { Download04Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons'

const REPO_URL = 'https://github.com/victorjayeoba/sovereign'

/**
 * Closing CTA — large statement + download button. Last thing the user reads
 * before the footer.
 */
export default function FinalCTA() {
  return (
    <section
      id="download"
      className="relative z-10 px-6 lg:px-12 py-16 lg:py-24 border-t border-glass-border"
    >
      <div className="mx-auto max-w-[1100px] text-center">
        <span className="eyebrow">
          <span className="cyan-dot" />
          Available · Devnet
        </span>
        <h2 className="mt-6 font-bricolage text-[32px] sm:text-[44px] lg:text-[56px] xl:text-[64px] font-700 tracking-[-0.03em] leading-[1.02]">
          <span className="text-ice-gradient">
            Stop pasting evidence into the cloud.
          </span>
        </h2>
        <p className="mt-5 mx-auto max-w-[560px] font-inter text-[15.5px] sm:text-[16.5px] leading-[1.55] text-text-secondary">
          Sovereign is a single-binary desktop install. No account, no API key,
          no telemetry. The agent funds itself.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            <HugeiconsIcon icon={Download04Icon} size={15} strokeWidth={2.2} />
            Download for macOS
          </a>
          <a
            href={`${REPO_URL}#readme`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost"
          >
            Read the whitepaper
            <HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={2} />
          </a>
        </div>

        <p className="mt-7 font-instrument text-[10.5px] uppercase tracking-[0.18em] text-text-tertiary">
          Universal binary · Apple Silicon &amp; Intel · 142 MB
        </p>
      </div>
    </section>
  )
}
