import Hero from '@/components/Hero'
import Pillars from '@/components/Pillars'

export default function Page() {
  return (
    <main className="relative min-h-screen">
      <Hero />
      <Pillars />
      <footer className="relative z-10 border-t border-glass-border px-6 lg:px-12 py-10">
        <div className="mx-auto max-w-[1280px] flex flex-wrap items-center justify-between gap-4 font-instrument text-[11px] uppercase tracking-[0.18em] text-text-tertiary">
          <span>Sovereign · Forensic AI</span>
          <span>Colosseum Frontier · Tether QVAC · 2026</span>
        </div>
      </footer>
    </main>
  )
}
