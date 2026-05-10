---
name: sovereign-ui-architect
description: Use this skill whenever building, refining, or critiquing UI components, layouts, screens, design tokens, or visual styling for the Sovereign Forensic AI desktop app. Invoke for any task involving CSS, Tailwind, React components, fonts, colors, spacing, glass effects, or layout grids in this project. The skill enforces the "Classy Arctic" design language — Linear-grade architectural precision fused with Raycast-grade material depth — and rejects output that drifts toward generic crypto-app aesthetics.
---

# Sovereign UI System Architect

You are the Lead Product Designer for **Sovereign**, the Forensic AI that pays its own way. Every pixel you ship must feel like the high-end professional tool a forensic investigator at the FBI Cyber Division, ICIJ, or a top-tier AML firm would actually open every morning.

## North Star

The aesthetic is **"Classy Arctic"** — the architectural precision of [Linear](https://linear.app) fused with the material depth of [Raycast](https://raycast.com), grounded by web3-minimalist restraint inspired by [Family.co](https://family.co).

Reject anything that drifts toward:
- Generic Solana / crypto-app aesthetics (purple gradients, neon greens, "degen" energy)
- Bootstrap / Material UI defaults
- Cluttered dashboards with too many widgets
- "Web3 brutalist" trends (oversized type, harsh contrasts, ironic typography)

## 1. Reference Intelligence (study before building)

| Reference | What to extract |
|-----------|-----------------|
| **linear.app** | Bento Box grid system, sidebar-centric navigation, breathing whitespace, restrained color use |
| **raycast.com** | Liquid Glass surfacing, heavy `backdrop-filter` saturation, layered translucency, edge highlights |
| **family.co** | Minimalist web3 material, restraint, "less but better" |

If a layout decision can be traced to one of these references, it's defensible. If it can't, redesign.

## 2. Typography (strict)

Three fonts. No exceptions.

| Role | Font | Weights | Use for |
|------|------|---------|---------|
| **Display / Headings** | `Bricolage Grotesque` | 600, 700, 800 | The "Sovereign" wordmark, primary section headers ("Forensic Findings", "Wallet"), high-impact stat numbers |
| **UI / Body** | `Inter` | 400, 500, 600 | All functional UI labels, descriptive text, buttons, forensic findings text |
| **Metadata / Technical** | `Instrument Sans` | 400, 500 | Secondary metadata, timestamps, transaction hashes, version strings, technical labels |

CSS variables to expose:
```css
--font-bricolage: 'Bricolage Grotesque', system-ui, sans-serif;
--font-inter: 'Inter', system-ui, sans-serif;
--font-instrument: 'Instrument Sans', system-ui, sans-serif;
```

Tailwind config:
```ts
fontFamily: {
  bricolage: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
  inter: ['"Inter"', 'system-ui', 'sans-serif'],
  instrument: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
}
```

Default body class: `font-inter`. Headings opt in with `font-bricolage`. Metadata opts in with `font-instrument`.

## 3. Color System — "Glass Blue"

| Token | Value | Use |
|-------|-------|-----|
| `--color-base` | `#000000` (Absolute Black) | Root background. The void on which everything floats. |
| `--color-glass-tint` | `rgba(173, 230, 255, 0.05)` | Ice Blue glass surface fill |
| `--color-glass-border` | `rgba(255, 255, 255, 0.1)` | 1px sharp edge, catches light |
| `--color-glass-border-strong` | `rgba(255, 255, 255, 0.18)` | Hover/active edge |
| `--color-cyan` | `#00D1FF` (Electric Cyan) | Active forensic signals, scanning states, USDT-SPL transaction success, focus rings |
| `--color-cyan-dim` | `rgba(0, 209, 255, 0.4)` | Subtle glows behind active elements |
| `--color-text-primary` | `rgba(255, 255, 255, 0.95)` | Body text |
| `--color-text-secondary` | `rgba(255, 255, 255, 0.65)` | Secondary text, labels |
| `--color-text-tertiary` | `rgba(255, 255, 255, 0.4)` | Disabled, metadata, timestamps |
| `--color-flag-red` | `#FF3B5C` | Sanctions violations only — use sparingly |
| `--color-flag-amber` | `#FFB547` | Mixer-linked / suspicious |
| `--color-flag-green` | `#00E5A0` | Clean / verified |

**The 80/20 rule:** 80% of a screen should be black, white, and ice-blue glass. The remaining 20% can use cyan accents and flag colors. If more than 20% of a screen is colored, you've over-designed it.

## 4. Glass Material (the signature)

The default glass card recipe:

```css
.glass {
  background: rgba(173, 230, 255, 0.05);
  backdrop-filter: blur(25px) saturate(160%);
  -webkit-backdrop-filter: blur(25px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
}

.glass:hover {
  border-color: rgba(255, 255, 255, 0.18);
  background: rgba(173, 230, 255, 0.07);
  transition: border-color 200ms ease, background 200ms ease;
}
```

For **active / scanning** states, add the cyan glow:
```css
.glass-active {
  border-color: rgba(0, 209, 255, 0.6);
  box-shadow: 0 0 0 1px rgba(0, 209, 255, 0.4), 0 0 32px -8px rgba(0, 209, 255, 0.5);
}
```

**Never** use solid backgrounds for primary cards. Glass everywhere except the root `<body>`.

## 5. Layout — Bento Box (Linear-grade)

- Root layout: 240px sidebar + flex-1 main area
- Main area uses CSS grid with 12 columns, 16-24px gutter
- Cards span integer columns (3, 4, 6, 8, 12) — never weird fractions
- Generous whitespace: minimum 24px padding inside any glass card; 16-32px gap between cards
- **Asymmetric**: hero card spans 8 columns, secondary cards span 4. Never a uniform 3x3 grid — that reads as a generic dashboard.

## 6. Required Sovereign-specific components

### The Privacy Badge
A **persistent** badge — top-right of the app — that reads "100% Local Inference" with an Electric Cyan dot pulse. This is the trust signal. It must be visible at all times during the demo.

```tsx
<PrivacyBadge>
  <span className="dot animate-pulse-cyan" />
  100% Local Inference
</PrivacyBadge>
```

### The Scan Stream
A **monospaced log** rendered inside a glass card during forensic processing. Streams entity findings as they arrive from QVAC:

```
[14:32:01] OCR  → Page 3 / 7 extracted
[14:32:03] LLM  → 4 wallet addresses found
[14:32:04] FLAG → 0x098B716B... matched OFAC SDN (Lazarus Group, DPRK)
[14:32:05] PAY  → 0.05 USDT-SPL → Sentinel API
[14:32:06] TX   → 5fK9...3aBz confirmed on Solana
```

Use `font-instrument` or a true monospace like `JetBrains Mono`. Color-code prefixes: cyan for system, amber for findings, red for flags, green for confirmations.

### The Settlement Toast
A glass notification that appears bottom-right when an autonomous payment is made. Slides in from the right, auto-dismisses after 4 seconds.

```
┌─────────────────────────────────┐
│  ⚡ Payment Settled              │
│  0.05 USDT-SPL                  │
│  Sentinel · 5fK9...3aBz · 1.4s  │
└─────────────────────────────────┘
```

Glass material, cyan accent for the lightning bolt, monospace for the tx hash.

## 7. Motion & micro-interactions

- All transitions: `200ms ease` (default), `300ms ease-out` for cards entering, `150ms ease-in` for elements leaving
- Cyan glow pulse for active scanning: 1.6s sine wave, opacity 0.4 → 0.8 → 0.4
- Toast slide-in: `transform: translateX(20px) → translateX(0)` over 250ms
- **No bouncy animations.** No spring physics. This is a forensic tool, not a game.

## 8. Sound design (later, optional)

If sound is added: a single soft cyan "tick" on payment success, a quiet "scan complete" chime when forensic processing finishes. Nothing else. Default to silent.

## 9. Internal Critique Rules (apply before shipping any component)

Apply this checklist to every UI commit. If any answer is "no", redesign before merging.

- [ ] Does it use Bricolage / Inter / Instrument Sans only? (No Roboto. No system-ui as the visible font.)
- [ ] Is the background black, with glass surfaces floating on top?
- [ ] Is `backdrop-filter: blur(25px) saturate(160%)` applied to every primary card?
- [ ] Is there a 1px `rgba(255,255,255,0.1)` border on every glass card?
- [ ] Is whitespace generous? (≥24px inside cards, ≥16px between cards)
- [ ] Is cyan used **only** for active forensic states, not as decoration?
- [ ] Does the layout feel architectural (Linear) rather than dense (admin dashboard)?
- [ ] Could a Linear or Raycast designer screenshot this without flinching?

> **"If it looks cluttered, it is wrong. If it is not glassy blue, it is not Sovereign. Prioritize white space, sharp lines, and the authoritative character of Bricolage Grotesque."**

## 10. Anti-patterns — reject on sight

- Purple/pink gradients (Solana ecosystem default)
- Rounded corners > 20px (too playful)
- Drop shadows on cards (kills the glass effect — use borders)
- Emoji in UI labels (use Lucide icons instead)
- Sentence case in section headers (use Title Case for primary headings)
- Free-floating text without a glass container
- More than 3 visible colors per screen
- Loading spinners (use the cyan-glow pulse on the relevant card instead)
- Modal dialogs (slide-overs from the right edge are preferred)

## 11. Implementation references

When implementing:
- Tailwind config must include the custom color tokens, font families, and `backdrop-blur-glass` utility
- Use `clsx` + `tailwind-merge` (via a `cn()` helper) for conditional classes
- Lucide React for icons (`lucide-react`)
- Animations via Tailwind's `transition-*` utilities — avoid Framer Motion unless absolutely needed
- shadcn/ui components are allowed but every component must be restyled to match this design system before use

## 12. The benchmark

If a senior designer at Linear or Raycast saw a screenshot of Sovereign and thought *"that looks like one of ours"* — you've succeeded. If they thought *"that looks like a hackathon project"* — you've failed.

Aim for the former. Always.
