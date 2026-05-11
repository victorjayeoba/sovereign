import { HugeiconsIcon } from '@hugeicons/react'
import { Download04Icon } from '@hugeicons/core-free-icons'

export default function Nav() {
  return (
    <nav className="relative z-30 flex items-center justify-between px-8 py-6 lg:px-12">
      <a href="#" className="flex items-center gap-2.5">
        <Logomark />
        <span className="font-bricolage text-[18px] font-700 tracking-tight text-text-primary">
          Sovereign
        </span>
      </a>

      <ul className="hidden md:flex items-center gap-8 font-inter text-[13.5px] font-500 text-text-secondary">
        <li><a href="#product" className="hover:text-text-primary transition-colors">Product</a></li>
        <li><a href="#how" className="hover:text-text-primary transition-colors">How it works</a></li>
        <li><a href="#frontier" className="hover:text-text-primary transition-colors">Frontier</a></li>
        <li><a href="#docs" className="hover:text-text-primary transition-colors">Docs</a></li>
      </ul>

      <a href="#download" className="btn-ghost text-[13px]">
        <HugeiconsIcon icon={Download04Icon} size={14} strokeWidth={2} />
        Download
      </a>
    </nav>
  )
}

function Logomark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <defs>
        <linearGradient id="lm" x1="0" x2="22" y1="0" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="1" stopColor="#00D1FF" />
        </linearGradient>
      </defs>
      <path
        d="M11 1.5 L19.5 6 V16 L11 20.5 L2.5 16 V6 Z"
        stroke="url(#lm)"
        strokeWidth="1.4"
        fill="rgba(0, 209, 255, 0.05)"
      />
      <circle cx="11" cy="11" r="2.5" fill="#00D1FF" />
    </svg>
  )
}
