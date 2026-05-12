# Sovereign — Pitch Deck

11 slides, ~2 minutes of narration. Built for the Colosseum Frontier hackathon submission. Each slide has:

- **What's on screen** — the actual slide content (minimal text, big idea)
- **What you say** — the line(s) to deliver under it
- **Visual** — what to design / drop in

Copy this into **Pitch.com**, **Canva**, **Google Slides**, or **Figma Slides**. For Pitch.com / Canva, search the template library for "dark startup pitch" — pick a black/dark-green theme to match the Sovereign "Classy Arctic" design language.

---

## Slide 1 — Title

**On screen:**

> # Sovereign
> ### Forensic AI that pays its own way.
> Built for **Colosseum Frontier** · **Tether QVAC track** · May 2026
> _Victor Jayeoba_

**What you say:**
> "Hi, I'm Victor. I built Sovereign for the Colosseum Frontier hackathon and the Tether QVAC track. In the next two minutes I'll show you why this combination of three Tether products solves a problem nobody else has touched."

**Visual:** Black background. The Sovereign wordmark, oversized. Bottom-corner: hackathon logos.

---

## Slide 2 — The problem

**On screen:**

> ## Sending a sensitive document to a cloud AI _is_ the leak.

> Journalists. Lawyers. Auditors. M&A analysts. The work that matters most can't go through ChatGPT.

**What you say:**
> "Every cloud AI logs your prompts. The moment a journalist uploads a leaked file to ChatGPT, the source is burned. Lawyers can't put sealed discovery through Claude. Auditors can't run unreleased financials through Gemini. The work that matters most is locked out of the AI revolution."

**Visual:** Single photo — a folder labeled "CONFIDENTIAL" with a chat bubble above it that has the OpenAI logo, with a thick red line through the chat bubble. Or just typography on black.

---

## Slide 3 — Why nothing solves this today

**On screen (3 columns):**

| Cloud AI | Local AI | Crypto agents |
|---|---|---|
| Capable | Private | Can pay |
| **Logged** | **Blind** | **Live in the cloud** |

> Nobody has shipped a local-first agent that can pay for paid data on its own.

**What you say:**
> "Cloud AI is capable but logged. Local AI is private but blind — it can't reach paid intelligence sources. Crypto-paying agents exist, but they run in the cloud, which means we're back to square one. Nobody has put the three pieces in the same binary. Until now."

**Visual:** Three columns, each in a card with a red strikethrough on the failure mode.

---

## Slide 4 — Sovereign

**On screen:**

> ## A local-first agent with its own crypto wallet.
>
> 1. **Read the document** — fully on-device, no network
> 2. **Pay for paid intel** — autonomously, in USDT
> 3. **Document never leaves the machine**

**What you say:**
> "Sovereign is a desktop agent that reads sensitive documents on-device using Tether's QVAC, holds its own non-custodial wallet via Tether's WDK, and autonomously pays remote intelligence APIs in USDT on Solana when it needs live data. The document stays local. The agent earns its keep."

**Visual:** Three-step horizontal flow with icons: document → brain → wallet → checkmark.

---

## Slide 5 — How it works (the architecture)

**On screen:** The Mermaid system architecture diagram from the README (rendered to PNG and embedded), or a simplified version:

```
┌──────────────────────────────────┐         ┌────────────────────┐
│  Sovereign Desktop  (LOCAL)       │ HTTP402 │  Sentinel API      │
│   • QVAC OCR                      │◄───────►│   • Verify payment │
│   • QVAC LLM + tool calling       │         │   • OFAC lookup    │
│   • QVAC Embeddings               │         └────────────────────┘
│   • WDK Solana wallet             │                  ▲
│   • Pipeline orchestrator         │  USDT-SPL        │ verify
└──────────────────────────────────┘  payment    ┌─────┴─────┐
                                                 │  Solana   │
                                                 │  Devnet   │
                                                 └───────────┘
```

**What you say:**
> "Three QVAC modules — OCR, LLM with tool calling, embeddings — all loaded into a single Bare runtime. The WDK wallet runs in a separate worklet so key material is isolated. When the agent needs intel, it speaks the x402 protocol — HTTP 402, pay in USDT, retry with proof, get the verdict. Every arrow on this slide is implemented in the repo."

**Visual:** Export the Mermaid diagram from the README to PNG (via [mermaid.live](https://mermaid.live)) and use that — it looks professional.

---

## Slide 6 — The moat (the trifecta)

**On screen:**

> ## QVAC + WDK + USDT
>
> | | What it gives the agent |
> |---|---|
> | **QVAC** | A private brain |
> | **WDK** | A non-custodial wallet |
> | **USDT** | A unit of account |
>
> ### Pull any one out, the product collapses.

**What you say:**
> "This is the moat. Sovereign is the only entry in this hackathon where all three Tether products are load-bearing on the same demo path. Take out QVAC and the document leaks. Take out WDK and the agent can't transact. Take out USDT and there's no settlement. The three only work together — and Tether is the only company shipping all three."

**Visual:** Big bold table, dark green accent. The "Pull any one out" line in italic serif font, large.

---

## Slide 7 — The demo

**On screen:** A single screenshot of the Sovereign report screen, with key findings circled:

> ## 11 seconds. $0.20 USDT. 1 sanctioned wallet found.
>
> _Drop a 5-page leaked due-diligence PDF. Sovereign extracts wallets, attributes owners, pays Sentinel, and flags Lazarus Group — all without the document touching the network._

**What you say:**
> "Here's the demo in one sentence. Drop a 5-page leaked memo. Sovereign reads it on-device, finds four wallet addresses, attributes them to owners, pays Sentinel five cents per lookup, and flags one as Lazarus Group, DPRK-sanctioned. Eleven seconds. Twenty cents. Watch the full demo video for the airplane-mode moment."

**Visual:** A clean screenshot of the report card from the app. If you don't have one ready, use a cropped Figma mockup. **Make this slide look polished — it's the only one judges will scrub back to.**

---

## Slide 8 — Why now

**On screen:**

> ## All three pieces shipped in 2026.
>
> - **QVAC SDK** — production-ready local inference (Q1 2026)
> - **WDK Solana** — v1.0.0-beta.8 with stable derivation (May 2026)
> - **x402 protocol** — agent payment spec maturing (2026)
>
> ### Sovereign is the first product to put all three on the same demo path.

**What you say:**
> "This product was impossible 12 months ago. QVAC's SDK matured this year. WDK Solana hit a stable beta in May. The x402 payment protocol is just now becoming usable. Sovereign isn't a research demo or a Series A pitch — it's a working product that the stack only made possible this quarter."

**Visual:** Timeline graphic, three milestones converging into "May 2026 — Sovereign ships."

---

## Slide 9 — Why I'm the right person to build it

**On screen:**

> ### Victor Jayeoba
> _[Your role · your city]_
>
> - **[Specific past project]** — _the thing that proves you can ship_
> - **[Specific technical depth]** — _e.g. "Pinned WDK v1.0.0-beta.8 because the derivation path changed at beta.4"_
> - **[The personal motivation]** — _why this problem, not another_
>
> Built solo in 4 days. Code in the repo. Demo works end-to-end.

**What you say:**
> "I've spent the last [X years] building [specific thing]. I know the QVAC SDK at the level of `loadModel` and tool-call schemas. I know the WDK well enough to pin v1.0.0-beta.8 because the derivation path changed at beta.4. I picked this problem because [specific anecdote — a client, a moment, a project that taught you what was missing]. I built this in four days, solo. Repo's public, code is clean, demo runs end-to-end."

**Visual:** A clean headshot in the top-right (smile, professional, daylight photo). Three bullets. Your name oversized in serif.

> **⚠️ This is the slide that decides whether judges trust you. Personalize all three bullets. Don't leave brackets in.**

---

## Slide 10 — Beyond journalism

**On screen:**

> ## Same engine, different sensitive document.

> - **Legal discovery** — redact-then-analyze under privilege
> - **Healthcare** — patient records, HIPAA-bound diligence
> - **M&A** — pre-announcement target diligence
> - **Internal audit** — sealed regulatory inquiry workflows

**What you say:**
> "Journalism is the wedge, not the market. The same engine works for legal discovery, healthcare diligence, M&A, internal audit — anywhere a document is too sensitive for the cloud, but the work still needs paid live data. Every one of those is a real B2B contract. This is a wedge product into a real market."

**Visual:** 2×2 grid of icons — gavel, stethoscope, handshake, magnifying glass.

---

## Slide 11 — The close

**On screen:**

> # Sovereign
> ### Forensic AI that pays its own way.
>
> 🔗 **Repo:** github.com/victorjayeoba/sovereign
> ▶️ **Demo video:** youtu.be/D1ibS8zL-Xw
> 🎤 **Pitch video:** [PITCH_LINK]
>
> _Thank you._

**What you say:**
> "Sovereign is forensic AI that pays its own way. The repo is public. The demo runs. Thanks for the time."

**Visual:** Back to the title slide aesthetic. Big wordmark. Three clean links. End on black.

---

## Export checklist

- [ ] Personalize **slide 9** — fill the three brackets with real text
- [ ] Replace **slide 7** screenshot with a real one from the app (or a polished Figma mockup)
- [ ] Render the **Mermaid diagram** at [mermaid.live](https://mermaid.live), download as SVG/PNG, drop into slide 5
- [ ] Fill in **slide 11** with the actual demo + pitch video URLs after recording
- [ ] Export the deck to **PDF** for the submission form (some submission portals only accept PDF, not Pitch/Canva URLs — check the form)
- [ ] Also export as a **shareable link** (Pitch.com URL or "Anyone with link" Google Slides) — submit both if the form allows

---

## Design rules (match the actual product brand)

The Sovereign landing page and desktop app use a **black + electric cyan** aesthetic, not Tether green. The deck must match — otherwise it looks like a different product when judges click through to the repo and the landing page.

| Token | Hex | Where it's used |
|---|---|---|
| Canvas (background) | `#000000` pure black, or `#07090B` near-black | Every slide background |
| Primary text | `#F4F6F8` warm off-white | Headlines and body |
| Secondary text | `#8B95A0` muted gray | Subheads, supporting copy |
| **Accent (the only accent)** | **`#1FD3FF`** electric cyan | CTA backgrounds, key terms, emphasis, links |
| Accent on hover / pressed | `#00B8E6` deeper cyan | Hover states only |
| Danger / red (sanctions, OFAC flag) | `#FF4D4F` | The "flagged" badge on slide 7 — reserve for this |
| Ambient glow (optional, for hero slides) | Deep red `#2A0A12` top-left → teal `#0F2E3A` center-right | Title slide and close slide backgrounds, very subtle |

### Typography

- **Headlines:** Modern sans-serif, tight letter-spacing — the landing page uses something close to **Geist** or **General Sans**. In Canva search "Geist" or "Inter Display." `tracking-tight`, `leading-none`.
- **Body:** **Inter** or **Satoshi**, `leading-relaxed`
- **Code / mono / wallet addresses:** **Geist Mono** or **JetBrains Mono**, lowercase, `text-xs`

Note: the deck does **not** use the serif headline pattern from the README's design system. The landing page uses geometric sans-serif at scale. Match that.

### Visual signature

- **One key element from the landing page that the deck should echo:** the **wooden/organic plinth** under the laptop in the hero image. If you can pull a similar grounding element onto the title slide (a single textured plane at the bottom of the slide), it creates instant brand continuity. Otherwise: pure black, no decoration.
- Ambient colored glow (red top-left, cyan/teal center-right) is the other signature — use it sparingly, only on slides 1 and 11.

### Hard rules

- **No green anywhere.** Not Tether green, not forest, not emerald. Cyan is the accent. Period.
- **No stock photos of generic businesspeople.** No clip art. No emoji except sparingly in the close slide.
- **One idea per slide.** If it takes two thoughts to explain, it's two slides.
- **One accent color, used sparingly.** If three slides in a row have cyan everywhere, it stops being an accent.
- **The wooden/organic texture is optional but powerful** — only use it if you can do it cleanly. A bad attempt is worse than no attempt.
