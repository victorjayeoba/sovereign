import { jsPDF } from 'jspdf'
import type { EntityRecord, RunTotals } from '@renderer/store/pipeline'

/**
 * Programmatic PDF generation for the Investigation Report.
 *
 * Builds a polished, paper-ready forensic dossier using jsPDF — completely
 * client-side, no print dialogs, no IPC. Triggers a native save dialog via
 * `doc.save()`.
 *
 * Layout: US Letter, 1in margins, Helvetica typography. Sections stacked
 * with horizontal rules between. Auto-paginates with running header + page
 * numbers.
 */

interface ExportArgs {
  investigationId: string
  pdfName: string | null
  startedAt: number | null
  totals: RunTotals | null
  entities: EntityRecord[]
  sanctionedCount: number
  status: 'idle' | 'running' | 'done' | 'error'
  /** Number of wallets caught by OFAC SDN. Optional; derives from entities. */
  ofacHits?: number
  /** Number of wallets caught by mixer-linkage. Optional; derives from entities. */
  mixerHits?: number
}

// ── Layout constants (in points; 72pt = 1in) ─────────────────────────────
const PAGE_W = 612
const MARGIN_X = 60
const MARGIN_TOP = 60
const MARGIN_BOTTOM = 56
const CONTENT_W = PAGE_W - MARGIN_X * 2

// Tones
const COLOR_INK: [number, number, number] = [26, 26, 26]
const COLOR_MUTED: [number, number, number] = [100, 100, 100]
const COLOR_RULE: [number, number, number] = [180, 180, 180]
const COLOR_RED: [number, number, number] = [185, 32, 64]
const COLOR_GREEN: [number, number, number] = [16, 124, 80]
const COLOR_AMBER: [number, number, number] = [180, 110, 30]
const COLOR_INDIGO: [number, number, number] = [40, 60, 120]

const truncSig = (s: string | undefined, n = 10): string => {
  if (!s) return ''
  return s.length > n + 2 ? `${s.slice(0, n / 2)}…${s.slice(-(n / 2))}` : s
}

export async function exportInvestigationPdf(args: ExportArgs): Promise<void> {
  const doc = new jsPDF({ unit: 'pt', format: 'letter', compress: true })
  const wallets = args.entities.filter((e) => e.type === 'wallet_address')
  const orgs = args.entities.filter((e) => e.type === 'organization')
  const people = args.entities.filter((e) => e.type === 'person')

  let y = MARGIN_TOP
  let page = 1

  // ── helpers (closed over doc + y) ─────────────────────────────────────
  const ink = (rgb: [number, number, number]) => doc.setTextColor(rgb[0], rgb[1], rgb[2])
  const draw = (rgb: [number, number, number]) => doc.setDrawColor(rgb[0], rgb[1], rgb[2])

  const newPage = () => {
    drawFooter(page)
    doc.addPage()
    page += 1
    y = MARGIN_TOP
    drawRunningHeader()
  }

  const ensure = (need: number) => {
    if (y + need > 792 - MARGIN_BOTTOM) newPage()
  }

  const text = (
    str: string,
    opts: {
      size?: number
      bold?: boolean
      color?: [number, number, number]
      align?: 'left' | 'center' | 'right'
      x?: number
      letterSpacing?: number
    } = {}
  ) => {
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
    doc.setFontSize(opts.size ?? 10)
    ink(opts.color ?? COLOR_INK)
    if (opts.letterSpacing) doc.setCharSpace(opts.letterSpacing)
    const xPos = opts.x ?? MARGIN_X
    if (opts.align === 'center') {
      doc.text(str, PAGE_W / 2, y, { align: 'center' })
    } else if (opts.align === 'right') {
      doc.text(str, PAGE_W - MARGIN_X, y, { align: 'right' })
    } else {
      doc.text(str, xPos, y)
    }
    if (opts.letterSpacing) doc.setCharSpace(0)
  }

  const para = (str: string, size = 10.5, lineGap = 4): void => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(size)
    ink(COLOR_INK)
    const lines = doc.splitTextToSize(str, CONTENT_W)
    for (const line of lines as string[]) {
      ensure(size + lineGap)
      doc.text(line, MARGIN_X, y)
      y += size + lineGap
    }
  }

  const rule = (color: [number, number, number] = COLOR_RULE, gap = 12) => {
    ensure(gap + 2)
    draw(color)
    doc.setLineWidth(0.5)
    doc.line(MARGIN_X, y, PAGE_W - MARGIN_X, y)
    y += gap
  }

  const sectionHeader = (title: string, count?: number, tone?: 'alert') => {
    ensure(40)
    y += 8
    text(title, {
      size: 10,
      bold: true,
      color: tone === 'alert' ? COLOR_RED : COLOR_INK,
      letterSpacing: 1.5,
    })
    if (typeof count === 'number') {
      text(`${count}`, {
        size: 9,
        bold: false,
        color: COLOR_MUTED,
        align: 'right',
      })
    }
    y += 6
    rule(COLOR_RULE, 10)
  }

  const drawRunningHeader = () => {
    if (page === 1) return
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    ink(COLOR_MUTED)
    doc.text('Sovereign · Investigation Report', MARGIN_X, 36)
    doc.text(args.investigationId, PAGE_W - MARGIN_X, 36, { align: 'right' })
    draw(COLOR_RULE)
    doc.setLineWidth(0.4)
    doc.line(MARGIN_X, 44, PAGE_W - MARGIN_X, 44)
  }

  const drawFooter = (pageNum: number) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    ink(COLOR_MUTED)
    doc.text(
      'Sovereign · 100% Local Inference · Document never left this device',
      MARGIN_X,
      792 - 36
    )
    doc.text(`Page ${pageNum}`, PAGE_W - MARGIN_X, 792 - 36, { align: 'right' })
  }

  // ── Verdict computation ───────────────────────────────────────────────
  const verdict = (() => {
    if (args.status === 'running') return { label: 'IN PROGRESS', color: COLOR_INDIGO }
    if (args.status === 'error') return { label: 'ERROR', color: COLOR_RED }
    if (args.status === 'idle' || wallets.length === 0)
      return { label: 'PENDING', color: COLOR_MUTED }
    if (args.sanctionedCount > 0) return { label: 'HIGH RISK', color: COLOR_RED }
    return { label: 'CLEAN', color: COLOR_GREEN }
  })()

  // ── Cover header ──────────────────────────────────────────────────────
  text('INVESTIGATION REPORT', { size: 9, bold: true, color: COLOR_MUTED, letterSpacing: 2 })
  y += 24
  text(args.pdfName ?? 'Untitled Investigation', { size: 22, bold: true, color: COLOR_INK })
  y += 8
  // Verdict pill aligned right of subject line
  const verdictY = y - 26
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  const vw = doc.getTextWidth(verdict.label) + 18
  draw(verdict.color)
  doc.setFillColor(255, 255, 255)
  doc.setLineWidth(0.75)
  doc.roundedRect(PAGE_W - MARGIN_X - vw, verdictY - 14, vw, 20, 3, 3, 'D')
  ink(verdict.color)
  doc.text(verdict.label, PAGE_W - MARGIN_X - vw / 2, verdictY, { align: 'center' })

  y += 4
  rule(COLOR_INK, 16)
  doc.setLineWidth(0.5)

  // ── Metadata grid (2 columns) ─────────────────────────────────────────
  const metaRow = (label: string, value: string, col: 0 | 1) => {
    const xLabel = MARGIN_X + col * (CONTENT_W / 2)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    ink(COLOR_MUTED)
    doc.text(label.toUpperCase(), xLabel, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10.5)
    ink(COLOR_INK)
    doc.text(value, xLabel, y + 13)
  }
  const completedDate = (() => {
    if (!args.startedAt) return '—'
    const t = args.totals?.totalMs ? args.startedAt + args.totals.totalMs : args.startedAt
    const d = new Date(t)
    return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)} UTC`
  })()
  const meta = [
    { label: 'Investigation ID', value: args.investigationId },
    { label: 'Subject', value: args.pdfName ?? '—' },
    { label: 'Agent', value: 'Sovereign · 100% Local' },
    { label: 'Completed', value: completedDate },
    { label: 'Elapsed', value: args.totals?.totalMs ? `${(args.totals.totalMs / 1000).toFixed(2)}s` : '—' },
    { label: 'Cost', value: args.totals?.totalPaidUsdt ? `${args.totals.totalPaidUsdt} USDT-SPL` : '—' },
  ]
  for (let i = 0; i < meta.length; i += 2) {
    ensure(34)
    metaRow(meta[i]!.label, meta[i]!.value, 0)
    if (meta[i + 1]) metaRow(meta[i + 1]!.label, meta[i + 1]!.value, 1)
    y += 30
  }

  rule(COLOR_RULE, 8)

  // ── Executive Summary ────────────────────────────────────────────────
  sectionHeader('EXECUTIVE SUMMARY')
  para(buildExecutiveSummary(args, wallets, orgs))

  // ── Key Findings ─────────────────────────────────────────────────────
  if (wallets.length > 0) {
    sectionHeader('KEY FINDINGS', wallets.length)
    wallets.forEach((w, i) => {
      const sanctioned = w.sanctioned === true
      const ofacKnown = typeof w.sanctioned === 'boolean'
      const flagName = w.matches?.[0]?.name
      const flagProgram = w.matches?.[0]?.program?.[0]

      const mixerLinked = w.mixerLinked === true
      const mixerKnown = typeof w.mixerLinked === 'boolean'
      const mixerName = w.mixerMatches?.[0]?.name
      const mixerType = w.mixerMatches?.[0]?.type

      const flagged = sanctioned || mixerLinked
      const allKnown = ofacKnown && mixerKnown
      const allClean = allKnown && !sanctioned && !mixerLinked
      const accent = flagged ? COLOR_RED : allClean ? COLOR_GREEN : COLOR_MUTED

      ensure(80)

      // Index
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      ink(accent)
      doc.text(String(i + 1).padStart(2, '0'), MARGIN_X, y)

      // Address
      doc.setFont('courier', 'normal')
      doc.setFontSize(10)
      ink(COLOR_INK)
      doc.text(w.value, MARGIN_X + 28, y)

      // Document context
      y += 13
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      ink(COLOR_MUTED)
      const ctx = w.ownerEntityValue
        ? `Document context: "${w.ownerEntityValue}"`
        : 'Document context: unattributed'
      doc.text(ctx, MARGIN_X + 28, y)

      // OFAC signal
      if (ofacKnown) {
        y += 13
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        ink(COLOR_MUTED)
        doc.text('OFAC SDN', MARGIN_X + 28, y)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9.5)
        if (sanctioned && flagName) {
          ink(COLOR_RED)
          doc.text(
            `${flagName}${flagProgram ? ` (${flagProgram})` : ''}`,
            MARGIN_X + 28 + 60,
            y
          )
        } else {
          ink(COLOR_GREEN)
          doc.text('clean — no SDN match', MARGIN_X + 28 + 60, y)
        }
        if (w.paymentTxSig) {
          y += 11
          doc.setFontSize(8.5)
          ink(COLOR_MUTED)
          doc.text(
            `paid · solana-devnet/tx/${truncSig(w.paymentTxSig, 14)}`,
            MARGIN_X + 28 + 60,
            y
          )
        }
      }

      // Mixer signal
      if (mixerKnown) {
        y += 13
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        ink(COLOR_MUTED)
        doc.text('MIXER', MARGIN_X + 28, y)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9.5)
        if (mixerLinked && mixerName) {
          ink(COLOR_RED)
          doc.text(
            `${mixerName}${mixerType ? ` ${mixerType}` : ''}`,
            MARGIN_X + 28 + 60,
            y
          )
        } else {
          ink(COLOR_GREEN)
          doc.text('clean — no mixer exposure', MARGIN_X + 28 + 60, y)
        }
        if (w.mixerPaymentTxSig) {
          y += 11
          doc.setFontSize(8.5)
          ink(COLOR_MUTED)
          doc.text(
            `paid · solana-devnet/tx/${truncSig(w.mixerPaymentTxSig, 14)}`,
            MARGIN_X + 28 + 60,
            y
          )
        }
      }

      y += 22
    })
  }

  // ── Entities Identified ──────────────────────────────────────────────
  if (orgs.length + people.length > 0) {
    sectionHeader('ENTITIES IDENTIFIED', orgs.length + people.length)
    const lines: Array<[string, string]> = [
      ...orgs.map((o): [string, string] => ['ORG', o.value]),
      ...people.map((p): [string, string] => [
        'PERSON',
        `${p.value}${p.ownerEntityValue ? ` · ${p.ownerEntityValue}` : ''}`,
      ]),
    ]
    for (const [tag, value] of lines) {
      ensure(14)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      ink(COLOR_MUTED)
      doc.text(tag, MARGIN_X, y)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      ink(COLOR_INK)
      doc.text(value, MARGIN_X + 50, y)
      y += 14
    }
  }

  // ── Payment Ledger (OFAC + Mixer settlements per address) ───────────
  type Payment = { address: string; source: 'OFAC' | 'Mixer'; txSig: string }
  const payments: Payment[] = []
  for (const w of wallets) {
    if (w.paymentTxSig) {
      payments.push({ address: w.value, source: 'OFAC', txSig: w.paymentTxSig })
    }
    if (w.mixerPaymentTxSig) {
      payments.push({ address: w.value, source: 'Mixer', txSig: w.mixerPaymentTxSig })
    }
  }

  if (payments.length > 0) {
    sectionHeader('PAYMENT LEDGER', payments.length)
    para(
      'Every wallet was independently verified against two authoritative sources — OFAC SDN and Mixer Linkage. Each settled autonomously in USDT-SPL on Solana Devnet.',
      9.5,
      4
    )
    y += 4

    for (const p of payments) {
      ensure(12)
      doc.setFont('courier', 'normal')
      doc.setFontSize(9)
      ink(COLOR_MUTED)
      doc.text(truncSig(p.address, 18), MARGIN_X, y)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      ink(COLOR_MUTED)
      doc.text(p.source.toUpperCase(), MARGIN_X + 200, y)
      doc.setFont('courier', 'normal')
      doc.setFontSize(9)
      ink(COLOR_INK)
      doc.text(truncSig(p.txSig, 18), MARGIN_X + 260, y)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      ink(COLOR_MUTED)
      doc.text('USDT-SPL', PAGE_W - MARGIN_X, y, { align: 'right' })
      y += 13
    }
    y += 4
    rule(COLOR_RULE, 8)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    ink(COLOR_MUTED)
    doc.text(
      `${payments.length} SETTLEMENTS · ${wallets.length} WALLETS × 2 SOURCES`,
      MARGIN_X,
      y
    )
    doc.text(
      `${args.totals?.totalPaidUsdt ?? '0'} USDT-SPL TOTAL`,
      PAGE_W - MARGIN_X,
      y,
      { align: 'right' }
    )
    y += 12
  }

  // ── Recommendation (only if sanctioned) ──────────────────────────────
  if (args.sanctionedCount > 0) {
    sectionHeader('RECOMMENDATION', undefined, 'alert')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    ink(COLOR_RED)
    const rec = `STOP — escalate to legal counsel before further engagement.`
    const recLines = doc.splitTextToSize(rec, CONTENT_W) as string[]
    for (const line of recLines) {
      ensure(14)
      doc.text(line, MARGIN_X, y)
      y += 14
    }
    y += 4
    para(
      `${args.sanctionedCount} sanctioned wallet${args.sanctionedCount !== 1 ? 's' : ''} disclosed by the counterparty represent${
        args.sanctionedCount === 1 ? 's' : ''
      } material federal compliance exposure under OFAC regulations. The counterparty may be unable to legally accept funds from US-jurisdiction investors. Document and counterparty identifiers should be preserved in their current form pending review.`,
      10,
      4
    )
  }

  // Final footer on the last page
  drawFooter(page)

  // ── Save ─────────────────────────────────────────────────────────────
  const baseName = (args.pdfName ?? 'investigation')
    .replace(/\.[^.]+$/, '')
    .replace(/[^A-Za-z0-9_-]+/g, '_')
  doc.save(`${args.investigationId}_${baseName}.pdf`)
}

function buildExecutiveSummary(
  args: ExportArgs,
  wallets: EntityRecord[],
  orgs: EntityRecord[]
): string {
  const subject = args.pdfName ?? 'the document'
  const orgClause =
    orgs.length > 0
      ? `disclosing the operating wallets of "${orgs[0]!.value}"${
          orgs.length > 1
            ? ` and ${orgs.length - 1} other organization${orgs.length > 2 ? 's' : ''}`
            : ''
        }`
      : 'with disclosed wallet inventory'

  const ofacHits = args.ofacHits ?? wallets.filter((w) => w.sanctioned).length
  const mixerHits = args.mixerHits ?? wallets.filter((w) => w.mixerLinked).length

  if (args.sanctionedCount === 0 && wallets.length === 0) {
    return `Sovereign analyzed ${subject} on-device. No wallet addresses were found in the document and no external verifications were required.`
  }

  if (args.sanctionedCount === 0) {
    return `Sovereign analyzed ${subject} ${orgClause}. ${wallets.length} unique wallet address${
      wallets.length !== 1 ? 'es' : ''
    } were extracted and verified across two authoritative sources — the OFAC Specially Designated Nationals list and a mixer-linkage registry. No flags were returned by either source. ${args.entities.length} entities were identified across the document.`
  }

  const sourceParts: string[] = []
  if (ofacHits > 0) sourceParts.push(`${ofacHits} OFAC SDN match${ofacHits !== 1 ? 'es' : ''}`)
  if (mixerHits > 0) sourceParts.push(`${mixerHits} mixer-linked`)
  const sourceClause = sourceParts.join(' + ')

  return `Sovereign analyzed ${subject} ${orgClause}. Of ${wallets.length} unique wallet address${
    wallets.length !== 1 ? 'es' : ''
  }, ${args.sanctionedCount} were flagged across two authoritative sources (${sourceClause}). The agent autonomously settled ${wallets.length * 2} verification queries in USDT-SPL — one OFAC check and one mixer-linkage check per address — to synthesize this verdict. ${args.entities.length} entities were identified across the document. Recommendation: STOP — escalate to legal counsel.`
}
