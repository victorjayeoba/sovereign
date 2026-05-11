/**
 * Stats strip — sits between Hero and the deeper feature sections.
 * Four big numbers, monospace labels. Establishes credibility before the user
 * reads any more copy.
 */
export default function Stats() {
  return (
    <section className="relative z-10 px-6 lg:px-12 py-14 lg:py-18 border-t border-glass-border">
      <div className="mx-auto max-w-[1280px] grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10 lg:gap-x-12">
        <Stat number="0" unit="bytes leaked" />
        <Stat number="1.4s" unit="avg settlement" />
        <Stat number="100%" unit="on-device inference" />
        <Stat number="$0" unit="API keys to rotate" />
      </div>
    </section>
  )
}

function Stat({ number, unit }: { number: string; unit: string }) {
  return (
    <div>
      <div className="font-bricolage text-[44px] sm:text-[52px] lg:text-[60px] xl:text-[68px] leading-[0.95] font-700 text-ice-gradient">
        {number}
      </div>
      <div className="mt-2 font-instrument text-[10.5px] uppercase tracking-[0.18em] text-text-tertiary">
        {unit}
      </div>
    </div>
  )
}
