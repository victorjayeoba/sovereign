import type { Config } from 'tailwindcss'

/**
 * Tailwind config for Sovereign — implements the "Classy Arctic" design system.
 * All design tokens live here as the single source of truth.
 *
 * See: .claude/skills/sovereign-ui-architect/SKILL.md
 */
export default {
  content: ['./src/renderer/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      fontFamily: {
        bricolage: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        inter: ['"Inter"', 'system-ui', 'sans-serif'],
        instrument: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
        mono: [
          '"JetBrains Mono"',
          '"Instrument Sans"',
          'ui-monospace',
          'monospace',
        ],
      },
      colors: {
        // Glass system
        glass: {
          tint: 'rgba(173, 230, 255, 0.05)',
          tintHover: 'rgba(173, 230, 255, 0.07)',
          border: 'rgba(255, 255, 255, 0.1)',
          borderStrong: 'rgba(255, 255, 255, 0.18)',
        },
        // Primary signal — Electric Cyan
        cyan: {
          DEFAULT: '#00D1FF',
          dim: 'rgba(0, 209, 255, 0.4)',
          glow: 'rgba(0, 209, 255, 0.5)',
          50: 'rgba(0, 209, 255, 0.05)',
          100: 'rgba(0, 209, 255, 0.10)',
        },
        // Text scale (white-on-black, opacity tiers)
        text: {
          primary: 'rgba(255, 255, 255, 0.95)',
          secondary: 'rgba(255, 255, 255, 0.65)',
          tertiary: 'rgba(255, 255, 255, 0.40)',
          quaternary: 'rgba(255, 255, 255, 0.25)',
        },
        // Forensic flag colors — use sparingly
        flag: {
          red: '#FF3B5C',
          amber: '#FFB547',
          green: '#00E5A0',
        },
      },
      borderRadius: {
        // Capped at 20px per the anti-patterns rule
        glass: '16px',
      },
      backdropBlur: {
        glass: '25px',
      },
      backdropSaturate: {
        glass: '160%',
      },
      transitionTimingFunction: {
        soft: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        fast: '150ms',
        DEFAULT: '200ms',
        slow: '300ms',
      },
      animation: {
        'pulse-cyan': 'pulseCyan 1.6s ease-in-out infinite',
        'slide-in-right': 'slideInRight 250ms ease-out',
        'fade-in': 'fadeIn 300ms ease-out',
      },
      keyframes: {
        pulseCyan: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.85' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
