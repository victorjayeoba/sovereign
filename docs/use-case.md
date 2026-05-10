# Sovereign — The Canonical Use Case

**Forensic AI that pays its own way.**

This is the story we tell judges, the README opens with, and the demo video acts out.

---

## The Persona

**Sarah Chen.** Senior investigative reporter at a mid-tier outlet covering financial crime. Cybersecurity background. Eight years on the crypto beat. Has broken three major exchange-hack stories.

**Today's situation:** A source — an ex-employee at a Cayman-incorporated crypto trading firm called **Argonaut Trading Ltd.** — sent her a 6-page internal compliance memo at 7:14 AM. The memo discloses Argonaut's wallet inventory to a prospective $50M investor, **Meridian Capital Partners**.

The source is risking their career and possibly criminal exposure. Sarah has **one rule from her editor**: do not let this document touch any third party. Not Google Drive, not OpenAI, not Notion AI, not the firm's own analyst — until the story is fact-checked by legal.

**She has 30 minutes before her stand-up.**

---

## What She Used to Do

Before Sovereign, the workflow was:

1. Open the PDF in Preview
2. Manually type each wallet address into [sanctionssearch.ofac.treas.gov](https://sanctionssearch.ofac.treas.gov)
3. Squint at JSON-style results, copy-paste into a spreadsheet
4. Cross-reference each address against ZachXBT's published mixer lists
5. Write up the findings
6. Rinse, repeat for 6 pages of dense legal text

**Realistic time:** 90 minutes for one document. Half her addresses get fat-fingered. Sources get burned when journalists run out of patience and just paste into ChatGPT "for one quick check."

---

## What Sarah Does Today, with Sovereign

**07:42:00** — Sarah opens Sovereign on her laptop. The header pill reads **"100% Local Inference"** with a pulsing cyan dot. Below it: **"QVAC Ready · M-series."**

**07:42:08** — She **toggles Wi-Fi off**. Airplane mode icon appears in the menu bar. The Privacy Badge in Sovereign doesn't change — the dot keeps pulsing cyan, because the AI lives on her machine.

**07:42:11** — She drags `argonaut_compliance_disclosure.pdf` into the drop zone. The card outline lights cyan. The Scan Stream card on the bottom-left wakes up.

**07:42:12 — ScanStream starts streaming:**
```
[00:00.04]  INIT  → QVAC singleton ready · 3 modules loaded
[00:00.62]  OCR   → Page 1 / 6 extracted · 142 blocks
[00:01.18]  OCR   → Page 4 / 6 extracted · 178 blocks
[00:02.41]  LLM   → 4 wallet addresses · 11 entities found
[00:02.98]  EMBED → 32 strings · 3 clusters at cosine ≥ 0.92
```

The Forensic Findings card on the right starts populating. Real-time:

> **0x098B716B…2f96** · operating treasury · *Argonaut Trading Ltd.* · ⚪ pending lookup
> **0x8589427373…DA16** · OTC settlement pool · *Argonaut Trading Ltd.* · ⚪ pending lookup
> **bc1qm97vqz…05rargr04n** · cold storage reserve · *Argonaut Trading Ltd.* · ⚪ pending lookup
> **7xKXtg2C…sgAsU** · DeFi yield positions · *Argonaut Trading Ltd.* · ⚪ pending lookup

**07:42:16** — Local extraction complete. The Scan Stream is idle. **No network call made.** Sarah opens her browser's network tab — empty. She **opens DevTools' Console** and confirms `[preload] window.sovereign exposed` — and zero outbound requests during extraction. She knows because the document still hasn't left her laptop.

The fact-check on the document body itself (whether "Argonaut Trading Ltd." is real, whether the principals named are real people) is something she'd do later — for now, she just needs to know: **are any of these wallets dirty?**

**07:42:17** — She **toggles Wi-Fi back on**. Now Sovereign needs to ask the world a question: *is this address sanctioned?* But she's not asking the world to read the document. She's asking the world about the **address** — and only the address.

**07:42:18 — The Scan Stream resumes:**
```
[00:06.42]  PAY   → 0.05 USDT-SPL → Sentinel · awaiting confirm
[00:07.78]  TX    → 5fK9…3aBz confirmed · 1.36s · 0.000005 SOL fee
[00:07.91]  FLAG  → 0x098B716B… matched OFAC SDN — Lazarus Group, DPRK
```

A glass settlement toast slides in bottom-right of the ScanStream column:

> ⚡ **Payment Settled**
> 0.05 USDT-SPL
> Sentinel · 5fK9…3aBz · 1.36s

Three more toasts follow over the next four seconds. One after another. The agent paid for each lookup itself, in stablecoins, on Solana devnet — no credit card, no API key, no human in the loop.

**07:42:23** — Pipeline done. Final report renders in the Forensic Findings card:

> 🚨 **0x098B716B…2f96** — OFAC SDN, Lazarus Group (DPRK)
> 🚨 **0x8589427373…DA16** — OFAC SDN, Tornado Cash
> ⚠️ **bc1qm97vqz…05rargr04n** — Lazarus-attributed (FBI advisory)
> ✅ **7xKXtg2C…sgAsU** — clean
>
> **Total spent: $0.20 USDT · Time: 11.3 seconds · Document: never left this device**

**07:42:30** — Sarah has her story. *Two of Argonaut's "operating treasury" wallets are sanctioned. Meridian, the prospective $50M investor, would have walked into a federal compliance landmine.* She has the on-chain proof — clickable transaction signatures linking to Solana Explorer for each of the four payments, so any editor or attorney can independently verify each lookup happened on-chain.

**07:43:00** — She drafts the lede. The source is intact. The document is still in her downloads folder, untouched, ready for legal review.

**She has 27 minutes till stand-up.**

---

## What This Proves (the pitch translation)

The scenario above demonstrates **four claims simultaneously** — and these are the four things judges will weigh:

| Claim | What the demo shows |
|-------|---------------------|
| **1. Local sovereignty is real** | Airplane-mode toggle. Document never serialized to network. QVAC inference visible in real-time. |
| **2. Autonomous economic agency** | The agent decided to pay, signed USDT-SPL, broadcast to Solana, retried with proof. No human OK'd each transaction. |
| **3. Compliance-grade evidence** | Every payment is verifiable on Solana Explorer. Every OFAC match cites the SDN list version. The chain is the audit log. |
| **4. The Tether stack composes** | QVAC for the brain, WDK for the keys, USDT-SPL on Solana for settlement. Three Tether products in one workflow, working together for the first time. |

---

## The Wedge — Why Sarah's Workflow Generalizes

Sarah is the wedge. The same architecture serves:

- **AML consultants** screening counterparties for mid-tier crypto firms (can't afford Chainalysis enterprise)
- **State Attorney General** offices investigating local crypto fraud (need pay-per-investigation, not annual contracts)
- **Legal discovery teams** processing crypto-relevant documents under privilege (cloud AI is a privilege waiver)
- **M&A diligence** analyzing target companies' on-chain exposure under NDA (target docs cannot leave bidder's environment)
- **Healthcare / HIPAA** record analysis (same architecture, different fixture data — swap OFAC for ICD-10 codes)

The first vertical (forensic crypto investigations) is sharp. The horizontal architecture is the platform.

---

## The One-Line Pitch

> *"Sovereign is forensic AI that pays its own way. Local QVAC inference, autonomous USDT-SPL payments via WDK, real OFAC verdicts in eight seconds. Built for the work cloud AI legally can't do."*

---

## What to Avoid in the Pitch

- **Don't** call it a "general AI agent" — it isn't. It's a deterministic forensic pipeline. Generic agent claims invite "OpenAI agents do this too" rebuttal.
- **Don't** lead with the technology. Lead with the journalist and the source.
- **Don't** demo without the airplane-mode toggle. That's the visceral moment.
- **Don't** apologize for the mock USDT mint on devnet. Frame it as: *"USDT-SPL only exists on mainnet today. We deployed our own mock mint for demo. Same protocol works on mainnet the moment Tether mints USDT-SPL there — which they will."*
