import type * as React from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Download04Icon } from '@hugeicons/core-free-icons'

const REPO_URL = 'https://github.com/victorjayeoba/sovereign'

/**
 * Floating glass-pill nav — logo, links, and a download CTA all live inside
 * one rounded-full container with backdrop blur. Centered at the top of the
 * hero. Sits at z-30 so it stays on top of the gradient backdrop.
 */
export default function Nav() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 flex justify-center pt-5 lg:pt-7 px-4">
      <div
        className="flex items-center gap-1 px-1.5 py-1.5 rounded-full border border-glass-border"
        style={{
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(20px) saturate(160%)',
          WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        }}
      >
        {/* Logo */}
        <a
          href="#"
          className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full hover:bg-white/[0.04] transition-colors"
        >
          <Logomark />
          <span className="font-bricolage text-[14px] font-700 tracking-tight text-text-primary">
            Sovereign
          </span>
        </a>

        {/* Hairline divider */}
        <span className="hidden md:block w-px h-4 bg-glass-border mx-1" />

        {/* Nav links — collapse on mobile */}
        <ul className="hidden md:flex items-center gap-0.5 font-inter text-[12.5px] font-500 text-text-secondary">
          <NavLink href="#product">Product</NavLink>
          <NavLink href="#how">How it works</NavLink>
          <NavLink href="#frontier">Frontier</NavLink>
          <NavLink href="#docs">Docs</NavLink>
        </ul>

        {/* Hairline divider */}
        <span className="w-px h-4 bg-glass-border mx-1" />

        {/* CTA — solid cyan pill */}
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-inter text-[12.5px] font-600 transition-all"
          style={{
            background: '#00D1FF',
            color: '#001019',
            boxShadow: '0 0 0 1px rgba(0, 209, 255, 0.4), 0 6px 20px -8px rgba(0, 209, 255, 0.5)',
          }}
        >
          <HugeiconsIcon icon={Download04Icon} size={13} strokeWidth={2.2} />
          Download
        </a>
      </div>
    </nav>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <a
        href={href}
        className="block px-3 py-1.5 rounded-full hover:bg-white/[0.06] hover:text-text-primary transition-colors"
      >
        {children}
      </a>
    </li>
  )
}

function Logomark() {
  return (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden>
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
