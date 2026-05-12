'use client'

import { useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { PlayIcon, ArrowRight01Icon } from '@hugeicons/core-free-icons'
import GradientField from './GradientField'
import Nav from './Nav'
import Pedestal from './Pedestal'
import VideoModal from './VideoModal'

const DEMO_VIDEO_ID = 'D1ibS8zL-Xw'

function PreviewWithPlay({ onPlay }: { onPlay: () => void }) {
  return (
    <button
      type="button"
      onClick={onPlay}
      aria-label="Watch the Sovereign demo"
      className="relative block w-full h-full group cursor-pointer"
    >
      <img
        src={`https://img.youtube.com/vi/${DEMO_VIDEO_ID}/maxresdefault.jpg`}
        alt="Sovereign demo video"
        className="w-full h-full object-cover transition-opacity duration-200 group-hover:opacity-80"
        draggable={false}
        onError={(e) => {
          // maxresdefault only exists for videos uploaded at 720p+.
          // Fall back to hqdefault which is always present.
          const img = e.currentTarget
          if (!img.src.includes('hqdefault')) {
            img.src = `https://img.youtube.com/vi/${DEMO_VIDEO_ID}/hqdefault.jpg`
          }
        }}
      />
      {/* Subtle dark veil so the play button reads cleanly */}
      <div className="absolute inset-0 bg-black/15 group-hover:bg-black/25 transition-colors duration-200" />
      {/* Cyan glass play button — centered */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="flex items-center justify-center rounded-full backdrop-blur-md transition-transform duration-200 group-hover:scale-105"
          style={{
            width: 'clamp(56px, 7vw, 88px)',
            height: 'clamp(56px, 7vw, 88px)',
            background: 'rgba(0, 209, 255, 0.92)',
            boxShadow:
              '0 0 0 1px rgba(255, 255, 255, 0.25), 0 12px 48px -8px rgba(0, 209, 255, 0.7)',
          }}
        >
          <HugeiconsIcon
            icon={PlayIcon}
            size={28}
            strokeWidth={2.5}
            color="#001019"
            style={{ marginLeft: '3px' }}
          />
        </span>
      </div>
    </button>
  )
}

export default function Hero() {
  const [videoOpen, setVideoOpen] = useState(false)
  const openVideo = () => setVideoOpen(true)
  const closeVideo = () => setVideoOpen(false)

  return (
    <section className="relative">
      <VideoModal videoId={DEMO_VIDEO_ID} isOpen={videoOpen} onClose={closeVideo} />

      {/* GradientField backdrop — confined to the hero section only */}
      <div className="absolute inset-0 z-0">
        <GradientField />
      </div>

      {/* Bottom vignette — fades into black above the next section */}
      <div
        className="absolute inset-x-0 bottom-0 h-[40%] pointer-events-none z-[1]"
        style={{ background: 'linear-gradient(180deg, transparent, #000 90%)' }}
      />

      {/* Nav lives inside Hero so the gradient bg shows behind it */}
      <Nav />

      {/* Page container — text in normal flow, pedestal absolute-bottom-right
          of THIS container so it stays anchored to the content edge instead
          of drifting to the viewport edge on huge screens. */}
      <div
        className="relative z-10 mx-auto max-w-[1440px] px-6 lg:px-12 pt-24 lg:pt-32"
        style={{ minHeight: 'clamp(640px, 92vh, 900px)' }}
      >
        {/* Text block — left-aligned, capped width */}
        <div className="max-w-[640px]">
          <div className="flex items-center gap-3 animate-fade-in">
            <span className="font-instrument text-[10.5px] font-500 uppercase tracking-[0.22em] text-text-tertiary">
              Built for
            </span>
            <span className="h-px w-8 bg-glass-border" />
            <span className="font-instrument text-[10.5px] font-500 uppercase tracking-[0.22em] text-text-secondary">
              AML · Sanctions · Legal Discovery
            </span>
          </div>

          <h1 className="mt-7 font-bricolage font-700 tracking-[-0.03em] text-[32px] leading-[1.02] sm:text-[40px] md:text-[46px] lg:text-[52px] xl:text-[60px] animate-fade-in-up">
            <span className="text-ice-gradient">
              Forensic AI for documents you can&apos;t send to the cloud.
            </span>
          </h1>

          <p
            className="mt-7 max-w-[520px] font-inter text-[16.5px] sm:text-[18px] leading-[1.5] text-text-secondary animate-fade-in-up"
            style={{ animationDelay: '120ms', animationFillMode: 'backwards' }}
          >
            Sanctions screening, entity extraction, and chain-of-custody reports —
            run entirely on your desk. The agent settles its own intelligence
            calls in <span className="text-text-primary">USDT-SPL</span>.
          </p>

          <div
            className="mt-9 flex flex-wrap items-center gap-3 animate-fade-in-up"
            style={{ animationDelay: '220ms', animationFillMode: 'backwards' }}
          >
            <button type="button" onClick={openVideo} className="btn-primary">
              <HugeiconsIcon icon={PlayIcon} size={16} strokeWidth={2.2} />
              Watch the 90s Demo
            </button>
            <a href="#how" className="btn-ghost">
              See how it works
              <HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={2} />
            </a>
          </div>

          <div
            className="mt-10 flex items-center gap-3 max-w-[460px] animate-fade-in-up"
            style={{ animationDelay: '380ms', animationFillMode: 'backwards' }}
          >
            <span className="h-px flex-1 bg-glass-border" />
            <span className="font-instrument text-[10px] font-500 uppercase tracking-[0.18em] text-text-tertiary whitespace-nowrap">
              100% Local · USDT-SPL · 1.4s settle
            </span>
            <span className="h-px flex-1 bg-glass-border" />
          </div>
        </div>

        {/* Pedestal — absolute bottom-right of THIS container (not viewport) */}
        <div
          className="absolute hidden lg:flex items-end justify-end animate-fade-in-up"
          style={{
            right: 0,
            bottom: '-5rem',
            top: '12rem',
            width: 'clamp(500px, 46vw, 860px)',
            animationDelay: '420ms',
            animationFillMode: 'backwards',
          }}
        >
          <Pedestal>
            <PreviewWithPlay onPlay={openVideo} />
          </Pedestal>
        </div>

        {/* Mobile fallback — stacked below text */}
        <div className="relative lg:hidden mt-10 pb-12">
          <Pedestal>
            <PreviewWithPlay onPlay={openVideo} />
          </Pedestal>
        </div>
      </div>
    </section>
  )
}
