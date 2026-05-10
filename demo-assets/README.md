# Sovereign — Demo Assets

This directory contains the canonical demo PDF and supporting documents.

## `meridian_atlas_memo.html` ← **the demo PDF source**

A 3-page **fictional** internal compliance memo from "Meridian Capital Partners" to its Investment Committee, recommending caution on a proposed $50M investment in a Cayman-incorporated crypto trading firm called "Argonaut Trading Ltd."

**Fictional:** all corporate entities, principals, dates, file numbers
**Real:** the OFAC-sanctioned wallet addresses (Lazarus Group, Tornado Cash, Lazarus-attributed BTC)

That deliberate mix is what makes the demo land — the corporate wrapper avoids defaming real companies, while the real sanctioned addresses produce real, true verdicts when Sovereign queries OFAC.

---

## How to convert to PDF

### Option 1 — Browser print (recommended, no tools)

```powershell
# Open in default browser
start demo-assets\meridian_atlas_memo.html
```

Then in the browser:

1. **Ctrl+P** (Print)
2. **Destination → "Save as PDF"**
3. **Layout** → Portrait
4. **Paper size** → Letter
5. **Margins** → Default
6. **More settings → Background graphics** → ☑ ON (this preserves the letterhead colour and table shading)
7. **Save** as `meridian_atlas_memo.pdf` in this folder

The result is a 3-page corporate memo that looks like a real internal document. Letterhead, classification banner, signed by both parties, footer with page numbers, monospace tables for wallet addresses, the works.

### Option 2 — Headless Chrome (scripted)

If you need to regenerate it programmatically:

```powershell
# Requires Chrome / Edge installed
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --headless `
  --disable-gpu `
  --no-pdf-header-footer `
  --print-to-pdf=demo-assets/meridian_atlas_memo.pdf `
  file:///C:/Users/HI/hack/tether/sovereign/demo-assets/meridian_atlas_memo.html
```

### Option 3 — Pandoc from Markdown

If you prefer the Markdown source:

```powershell
pandoc demo-assets/meridian_atlas_memo.md `
  -o demo-assets/meridian_atlas_memo.pdf `
  --pdf-engine=wkhtmltopdf `
  -V geometry:margin=1in
```

(Markdown version is a fallback — the HTML version produces a more polished document.)

---

## What's in the document (for the demo storyboard)

| Page | Content | Sovereign should detect |
|------|---------|------------------------|
| 1 | Letterhead, memo metadata, executive summary, counterparty profile | Entities: Meridian Capital Partners, Argonaut Trading Ltd., Mikhail Volkov, Lena Petrova, Daniel Reyes; Locations: Cayman Islands, London; Amounts: USD 50M, USD 180M; Dates: 14 March 2026, April 2021 |
| 2 | **Wallet inventory table** + verification status + preliminary findings | **6 wallet addresses** across Ethereum, Bitcoin, Solana; ownership claim ("Argonaut owns these") |
| 3 | Linked counterparties + recommendation + signatures + privilege footer | Entities: Halcyon Markets, Aetherflow, Bridgepoint, Vertex; Locations: BVI, Delaware, Hong Kong, Singapore; Persons: Elena Hartwell |

## What Sovereign's pipeline will produce

After processing this PDF, the forensic report should show:

```
ENTITIES (deduped)
  ├── Argonaut Trading Ltd.       (org · 8 mentions across pp. 1–3)
  ├── Meridian Capital Partners   (org · 5 mentions)
  ├── Mikhail Volkov              (person · CEO of Argonaut)
  ├── Lena Petrova                (person · CFO of Argonaut)
  ├── Daniel Reyes                (person · CTO of Argonaut)
  ├── Elena Hartwell              (person · Head of Compliance, Meridian)
  ├── Halcyon Markets             (org · counterparty, FinCEN-advisory'd)
  └── ... 4 more counterparty orgs

WALLETS (6 unique, with verdicts after Sentinel lookup)
  ├── 0x098B716B...   →  Argonaut · 🚨 OFAC SDN — Lazarus Group, DPRK
  ├── 0x8589427373... →  Argonaut · 🚨 OFAC SDN — Tornado Cash mixer
  ├── 0xa0e1c89E...   →  Argonaut · 🚨 OFAC SDN — Lazarus Group
  ├── bc1qm97v...     →  Argonaut · ⚠️ Lazarus-attributed (FBI advisory)
  ├── 7xKXtg2C...     →  Argonaut · ✅ clean
  └── 9WzDXwBb...     →  Argonaut · ✅ clean

SUMMARY
  4 of 6 disclosed wallets are OFAC-sanctioned or DPRK-attributed.
  Total spent: $0.30 USDT  ·  Time: ~12s  ·  Document: never left this device.

VERDICT
  STOP — escalate to legal before further engagement.
```

That's the moment the demo lands.

---

## ⚠️ Verify OFAC addresses before recording the demo

Sanctions get updated. Before the final demo recording, confirm at least 3 of these addresses are still on the active OFAC SDN list:

1. https://sanctionssearch.ofac.treas.gov/
2. Paste each address from the wallet inventory
3. Confirm at least `0x098B71…`, `0x858942…`, and one BTC address return matches

If any have been delisted, swap them for currently-active SDN-listed addresses (the OFAC SDN search is the source of truth).

Also keep an eye on the publicly-tagged Etherscan list: <https://etherscan.io/accounts/label/ofac>

---

## Customisation tips

- **To change the firm name** (Meridian → something else): search-replace in `meridian_atlas_memo.html` and re-export
- **To add or remove a wallet**: edit the `<table>` in §3 of the HTML
- **To add a "scanned signature page"** for a multimodal demo moment: add a fourth page with a `<img src="signature.jpg">` element — when we add SmolVLM2, this page demonstrates image-OCR
- **To localise** (Russian, Spanish, Chinese demo moment): translate the text and swap in matching script in OCR config
