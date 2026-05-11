import type { Config } from 'tailwindcss'

/**
 * Tailwind config for the Sovereign landing site.
 * Mirrors apps/desktop/tailwind.config.ts — "Classy Arctic" tokens.
 * See: .claude/skills/sovereign-ui-architect/SKILL.md
 */
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        bricolage: ['var(--font-bricolage)', 'system-ui', 'sans-serif'],
        inter: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        instrument: ['var(--font-instrument)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', '"Instrument Sans"', 'ui-monospace', 'monospace'],
      },
      colors: {
        glass: {
          tint: 'rgba(173, 230, 255, 0.05)',
          tintHover: 'rgba(173, 230, 255, 0.07)',
          border: 'rgba(255, 255, 255, 0.1)',
          borderStrong: 'rgba(255, 255, 255, 0.18)',
        },
        cyan: {
          DEFAULT: '#00D1FF',
          dim: 'rgba(0, 209, 255, 0.4)',
          glow: 'rgba(0, 209, 255, 0.5)',
          50: 'rgba(0, 209, 255, 0.05)',
          100: 'rgba(0, 209, 255, 0.10)',
        },
        text: {
          primary: 'rgba(255, 255, 255, 0.95)',
          secondary: 'rgba(255, 255, 255, 0.65)',
          tertiary: 'rgba(255, 255, 255, 0.40)',
          quaternary: 'rgba(255, 255, 255, 0.25)',
        },
        flag: {
          red: '#FF3B5C',
          amber: '#FFB547',
          green: '#00E5A0',
        },
      },
      borderRadius: {
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
        'fade-in': 'fadeIn 600ms ease-out',
        'fade-in-up': 'fadeInUp 700ms cubic-bezier(0.16, 1, 0.3, 1)',
        'shimmer': 'shimmer 8s linear infinite',
      },
      keyframes: {
        pulseCyan: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.85' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
