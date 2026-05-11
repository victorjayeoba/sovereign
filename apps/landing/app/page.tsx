import Hero from '@/components/Hero'
import Stats from '@/components/Stats'
import HowItWorks from '@/components/HowItWorks'
import Pillars from '@/components/Pillars'
import UseCases from '@/components/UseCases'
import FinalCTA from '@/components/FinalCTA'

export default function Page() {
  return (
    <main className="relative min-h-screen">
      <Hero />
      <Stats />
      <HowItWorks />
      <Pillars />
      <UseCases />
      <FinalCTA />
      <footer className="relative z-10 border-t border-glass-border px-6 lg:px-12 py-10">
        <div className="mx-auto max-w-[1280px] flex flex-wrap items-center justify-between gap-4 font-instrument text-[11px] uppercase tracking-[0.18em] text-text-tertiary">
          <span>Sovereign · Forensic AI</span>
          <span>Colosseum Frontier · Tether QVAC · 2026</span>
        </div>
      </footer>
    </main>
  )
}
