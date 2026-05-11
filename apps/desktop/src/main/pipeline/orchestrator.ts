import { randomUUID } from 'node:crypto'
import {
  ADDRESS_PATTERNS,
  IPC_CHANNELS,
  LOOKUP_PRICE_USDT,
  type EntityFoundEvent,
  type LookupResultEvent,
  type MixerResultEvent,
  type MixerMatch,
  type PageText,
  type PipelineDoneEvent,
  type PipelineErrorEvent,
  type PipelineProgress,
  type PipelineStage,
  type Entity,
  type SdnMatch,
} from '@sovereign/shared'
import { ensureQvac } from '../qvac/singleton.js'
import type {
  LookupRecord,
  MixerRecord,
  OrchestratorStartArgs,
  RunState,
  SendToRenderer,
} from './types.js'

/**
 * Pipeline orchestrator.
 *
 * When `pages` is provided (renderer extracted real PDF text), the regex
 * sweep + inline OFAC lookup runs against actual content. When omitted —
 * the click-to-demo path — it falls back to a curated fixture so the demo
 * still has all four wallets and the Lazarus flag.
 *
 * Sentinel calls + USDT-SPL signing are still mocked at this stage. They
 * get swapped in by the x402-client + WDK chunks.
 */

interface PipelineSeed {
  address: string
  chain: 'ethereum' | 'solana' | 'bitcoin'
  ownerEntityValue: string
  sanctioned: boolean
  matches: SdnMatch[]
  mixerLinked: boolean
  mixerMatches: MixerMatch[]
}

// Demo data designed to exercise the agent's full reasoning across both
// signal sources. Specifically:
//   - Lazarus address: caught by BOTH OFAC + mixer (double-flagged)
//   - Meridian Treasury: clean on OFAC but tainted by mixer linkage — this
//     is the "Address #2" reveal that proves multi-source forensics adds
//     coverage beyond what any single tagged list provides.
const FIXTURE_SEEDS: ReadonlyArray<PipelineSeed> = [
  {
    address: '0x098B716B8Aaf21512996dC57EB0615e2383E2f96',
    chain: 'ethereum',
    ownerEntityValue: 'Argonaut Trading Ltd.',
    sanctioned: true,
    matches: [
      {
        uid: 'OFAC-44417',
        name: 'LAZARUS GROUP',
        program: ['DPRK3', 'CYBER2'],
        type: 'Entity',
        remarks: 'DPRK state-sponsored cyber threat actor.',
        source: 'OFAC SDN',
      },
    ],
    mixerLinked: true,
    mixerMatches: [
      {
        uid: 'MIX-TC-EXIT-2204',
        name: 'Tornado Cash',
        type: 'exit',
        remarks: 'Funds withdrawn from Tornado Cash mixer in April 2024.',
        source: 'Mixer Linkage',
      },
    ],
  },
  {
    address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    chain: 'solana',
    ownerEntityValue: 'Argonaut Trading Ltd.',
    sanctioned: false,
    matches: [],
    mixerLinked: false,
    mixerMatches: [],
  },
  {
    // The "reveal" — clean on OFAC, dirty by mixer linkage. Shows judges
    // that Sovereign catches risk that single-source tools miss.
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
    chain: 'ethereum',
    ownerEntityValue: 'Meridian Capital Treasury',
    sanctioned: false,
    matches: [],
    mixerLinked: true,
    mixerMatches: [
      {
        uid: 'MIX-TC-DEPOSIT-2310',
        name: 'Tornado Cash',
        type: 'deposit',
        remarks: 'Funds deposited into Tornado Cash mixer 8 days ago.',
        source: 'Mixer Linkage',
      },
    ],
  },
  {
    address: '0x1f9090aaE28b8a3dCeaDf281B0F12828e676c326',
    chain: 'ethereum',
    ownerEntityValue: 'Counterparty — undisclosed',
    sanctioned: false,
    matches: [],
    mixerLinked: false,
    mixerMatches: [],
  },
]

/**
 * Inline mixer-linkage table for the regex-discovery path. Maps known
 * addresses → their mixer footprint. Lookups for unknown addresses return
 * "clean" by default in the demo path.
 */
const KNOWN_MIXER: Record<string, MixerMatch> = {
  '0x098B716B8Aaf21512996dC57EB0615e2383E2f96': {
    uid: 'MIX-TC-EXIT-2204',
    name: 'Tornado Cash',
    type: 'exit',
    remarks: 'Funds withdrawn from Tornado Cash mixer in April 2024.',
    source: 'Mixer Linkage',
  },
  '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0': {
    uid: 'MIX-TC-DEPOSIT-2310',
    name: 'Tornado Cash',
    type: 'deposit',
    remarks: 'Funds deposited into Tornado Cash mixer 8 days ago.',
    source: 'Mixer Linkage',
  },
}

/**
 * Inline OFAC lookup table — small whitelist of addresses we know the demo
 * will encounter. The full check happens server-side via Sentinel; this lets
 * the local pipeline give an honest verdict without a Sentinel call.
 */
const KNOWN_OFAC: Record<string, SdnMatch> = {
  '0x098B716B8Aaf21512996dC57EB0615e2383E2f96': {
    uid: 'OFAC-44417',
    name: 'LAZARUS GROUP',
    program: ['DPRK3', 'CYBER2'],
    type: 'Entity',
    remarks: 'DPRK state-sponsored cyber threat actor.',
    source: 'OFAC SDN',
  },
}

const DEFAULT_PAGE_COUNT = 3

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function shortSig(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNPQRSTUVWXYZ123456789'
  let head = ''
  let tail = ''
  for (let i = 0; i < 4; i++) head += chars[Math.floor(Math.random() * chars.length)]
  for (let i = 0; i < 4; i++) tail += chars[Math.floor(Math.random() * chars.length)]
  return `${head}…${tail}`
}

const ORG_SUFFIX_PATTERN =
  /([A-Z][A-Za-z'’.&-]*(?:\s+[A-Z][A-Za-z'’.&-]*){0,4}\s+(?:Ltd\.?|LLP|LLC|Inc\.?|Corp\.?|Holdings|Capital|Treasury|Group|Trading|Partners|Bank|Foundation))/g

/** Look back ~200 chars before an address for the nearest org-suffix match. */
function inferOwner(text: string, addrIndex: number): string | null {
  const start = Math.max(0, addrIndex - 240)
  const window = text.slice(start, addrIndex)
  ORG_SUFFIX_PATTERN.lastIndex = 0
  const matches = [...window.matchAll(ORG_SUFFIX_PATTERN)]
  if (matches.length === 0) return null
  return matches[matches.length - 1]![1] ?? null
}

interface SweepResult {
  seeds: PipelineSeed[]
  totalChars: number
  ethPrefixCount: number
}

/**
 * Run the address regex sweep over concatenated page text.
 *
 * Addresses are routinely fragmented across pdfjs text items (a single 0x…
 * can land in two items joined by a space, or wrap across a line). To catch
 * those, we run the ETH regex against both the space-preserved text AND a
 * whitespace-stripped variant.
 */
function deriveSeedsFromPages(pages: PageText[]): SweepResult {
  const concat = pages.map((p) => p.text).join('\n')
  const noWs = concat.replace(/\s+/g, '')
  const found = new Map<string, PipelineSeed>()

  const addSeed = (
    addr: string,
    chain: 'ethereum' | 'solana',
    indexInConcat: number
  ): void => {
    if (found.has(addr)) return
    const ofac = KNOWN_OFAC[addr]
    const mixer = KNOWN_MIXER[addr]
    const owner = inferOwner(concat, indexInConcat) ?? 'Unattributed'
    found.set(addr, {
      address: addr,
      chain,
      ownerEntityValue: owner,
      sanctioned: !!ofac,
      matches: ofac ? [ofac] : [],
      mixerLinked: !!mixer,
      mixerMatches: mixer ? [mixer] : [],
    })
  }

  // Ethereum: precise hex pattern with non-hex boundaries (more robust than \b
  // since \b is inconsistent across Unicode runs from PDFs).
  const ethRe = /(?<![a-fA-F0-9])0x[a-fA-F0-9]{40}(?![a-fA-F0-9])/g
  for (const m of concat.matchAll(ethRe)) {
    addSeed(m[0], 'ethereum', m.index ?? 0)
  }
  for (const m of noWs.matchAll(ethRe)) {
    // Locate this address back in the original concat for owner inference.
    // It may not be present (split across whitespace), in which case we
    // pass 0 and inferOwner returns null → Unattributed.
    addSeed(m[0], 'ethereum', concat.indexOf(m[0]) >= 0 ? concat.indexOf(m[0]) : 0)
  }

  // Solana base58 — only the space-preserved variant; whitespace-stripped
  // base58 windows produce too many false positives in prose.
  const solRe = new RegExp(ADDRESS_PATTERNS.solana.source, 'g')
  for (const m of concat.matchAll(solRe)) {
    addSeed(m[0], 'solana', m.index ?? 0)
  }

  return {
    seeds: Array.from(found.values()),
    totalChars: concat.length,
    ethPrefixCount: (concat.match(/0x/g) ?? []).length,
  }
}

export class PipelineOrchestrator {
  private runs = new Map<string, RunState>()

  async start(args: OrchestratorStartArgs): Promise<void> {
    const { runId, pdfPath, pages, sendToRenderer } = args
    const startedAt = Date.now()
    const run: RunState = {
      runId,
      pdfPath,
      startedAt,
      cancelled: false,
      stage: 'rasterize',
      entities: [],
      lookups: [],
      mixerChecks: [],
    }
    this.runs.set(runId, run)

    try {
      await this.execute(run, sendToRenderer, pages)
    } catch (e) {
      const err: PipelineErrorEvent = {
        runId,
        stage: run.stage,
        code: 'UNKNOWN',
        message: e instanceof Error ? e.message : String(e),
        retriable: true,
      }
      sendToRenderer(IPC_CHANNELS.PIPELINE_ERROR, err)
    } finally {
      this.runs.delete(runId)
    }
  }

  cancel(runId: string): { ok: boolean } {
    const run = this.runs.get(runId)
    if (!run) return { ok: false }
    run.cancelled = true
    return { ok: true }
  }

  private bail(run: RunState): boolean {
    return run.cancelled
  }

  private emitProgress(
    run: RunState,
    send: SendToRenderer,
    stage: PipelineStage,
    pct: number,
    note?: string
  ): void {
    run.stage = stage
    const payload: PipelineProgress = { runId: run.runId, stage, pct }
    if (note) payload.note = note
    send(IPC_CHANNELS.PIPELINE_PROGRESS, payload)
  }

  private async execute(
    run: RunState,
    send: SendToRenderer,
    pages: PageText[] | undefined
  ): Promise<void> {
    const qvac = await ensureQvac()
    if (this.bail(run)) return

    // Resolve seeds — real regex sweep when pages are present, fixture otherwise.
    let seeds: ReadonlyArray<PipelineSeed>
    let usingRealText = false
    let introNote: string

    if (pages) {
      const sweep = deriveSeedsFromPages(pages)
      if (sweep.seeds.length > 0) {
        seeds = sweep.seeds
        usingRealText = true
        introNote = `${pages.length} ${pages.length === 1 ? 'page' : 'pages'} read · ${sweep.totalChars.toLocaleString()} chars · ${sweep.seeds.length} on-chain ${sweep.seeds.length === 1 ? 'address' : 'addresses'} detected`
      } else {
        seeds = FIXTURE_SEEDS
        // Honest diagnostics: total text extracted + how many "0x" prefixes
        // were seen but didn't form a valid 40-hex address. Helps debug PDFs.
        const debug = `${sweep.totalChars.toLocaleString()} chars · ${sweep.ethPrefixCount} '0x' prefixes seen`
        introNote = `${pages.length} ${pages.length === 1 ? 'page' : 'pages'} read · ${debug} · 0 addresses matched · running demo fixture`
      }
    } else {
      seeds = FIXTURE_SEEDS
      introNote = 'Running demo fixture · 4 seeded addresses'
    }

    const pageCount = pages?.length ?? DEFAULT_PAGE_COUNT

    // ── 1. Rasterize ────────────────────────────────────────────────────
    // Paced so judges have time to read the intro note before OCR fires.
    this.emitProgress(run, send, 'rasterize', 0, introNote)
    await sleep(700 + Math.random() * 200)
    if (this.bail(run)) return
    this.emitProgress(run, send, 'rasterize', 50)
    await sleep(800 + Math.random() * 200)
    if (this.bail(run)) return
    this.emitProgress(run, send, 'rasterize', 100)

    // ── 2. OCR (per-page streaming) ─────────────────────────────────────
    // For long PDFs we throttle OCR-progress emissions so the scan log
    // doesn't drown in identical lines. ~6 evenly-spaced markers + last.
    this.emitProgress(run, send, 'ocr', 0)
    const markerStride = Math.max(1, Math.ceil(pageCount / 6))
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      if (this.bail(run)) return
      for await (const _b of qvac.ocr({
        pageImage: Buffer.from([0]),
        pageNum,
        pageDims: { w: 1700, h: 2200 },
      })) {
        void _b
      }
      const isMarker = pageNum % markerStride === 0 || pageNum === pageCount
      const note = isMarker ? `Page ${pageNum} / ${pageCount} extracted` : undefined
      this.emitProgress(
        run,
        send,
        'ocr',
        Math.round((pageNum / pageCount) * 100),
        note
      )
    }

    // ── 3. Entity extraction ────────────────────────────────────────────
    this.emitProgress(run, send, 'extract', 0)

    const ownerNames = new Set<string>()
    for (const seed of seeds) ownerNames.add(seed.ownerEntityValue)

    // Step count = orgs + (1 person if fixture) + wallets
    const personSteps = usingRealText ? 0 : 1
    let extractStep = 0
    const totalSteps = ownerNames.size + personSteps + seeds.length

    for (const name of ownerNames) {
      if (this.bail(run)) return
      const entity: Entity = {
        type: 'organization',
        value: name,
        sourceText: name,
        confidence: 0.92,
      }
      run.entities.push(entity)
      send(IPC_CHANNELS.PIPELINE_ENTITY_FOUND, {
        runId: run.runId,
        entity,
      } satisfies EntityFoundEvent)
      extractStep++
      this.emitProgress(run, send, 'extract', Math.round((extractStep / totalSteps) * 100))
      await sleep(450 + Math.random() * 150)
    }

    if (!usingRealText) {
      // Fixture path emits a person to give the report shape variety.
      const person: Entity = {
        type: 'person',
        value: 'Mikhail Volkov',
        ownerEntityValue: 'Argonaut Trading Ltd.',
        sourceText: 'Mikhail Volkov (CEO)',
        confidence: 0.9,
      }
      run.entities.push(person)
      send(IPC_CHANNELS.PIPELINE_ENTITY_FOUND, {
        runId: run.runId,
        entity: person,
      } satisfies EntityFoundEvent)
      extractStep++
      this.emitProgress(run, send, 'extract', Math.round((extractStep / totalSteps) * 100))
      await sleep(480 + Math.random() * 160)
    }

    for (const seed of seeds) {
      if (this.bail(run)) return
      const entity: Entity = {
        type: 'wallet_address',
        value: seed.address,
        matchedRegexHit: seed.address,
        ownerEntityValue: seed.ownerEntityValue,
        sourceText: seed.address,
        confidence: 0.88,
      }
      run.entities.push(entity)
      send(IPC_CHANNELS.PIPELINE_ENTITY_FOUND, {
        runId: run.runId,
        entity,
      } satisfies EntityFoundEvent)
      extractStep++
      this.emitProgress(run, send, 'extract', Math.round((extractStep / totalSteps) * 100))
      await sleep(420 + Math.random() * 140)
    }

    // ── 4. Dedup ────────────────────────────────────────────────────────
    this.emitProgress(run, send, 'dedup', 0)
    await sleep(900 + Math.random() * 300)
    if (this.bail(run)) return
    this.emitProgress(run, send, 'dedup', 100)

    // ── 5. Lookup (paid Sentinel calls — both OFAC + Mixer per address) ─
    //
    // For each address the agent makes TWO autonomous paid lookups in
    // parallel: one against the OFAC SDN list, one against the mixer-linkage
    // database. Each is independently settled in USDT-SPL — total per-address
    // cost is 2× LOOKUP_PRICE_USDT. This is the "multi-source synthesis" the
    // demo highlights: an address can be clean on OFAC but flagged via mixer.
    this.emitProgress(run, send, 'lookup', 0)
    let done = 0
    for (const seed of seeds) {
      if (this.bail(run)) return

      // Each Sentinel roundtrip is paced for the demo to feel like real
      // on-chain settlement: USDT-SPL build + sign + send + confirm at
      // 'confirmed' commitment + Sentinel verify + OFAC lookup. Adds up
      // to ~1.5-2.5s per source, parallel within an address.
      const ofacPromise = (async (): Promise<LookupRecord> => {
        const t0 = Date.now()
        await sleep(1500 + Math.random() * 500)
        return {
          address: seed.address,
          sanctioned: seed.sanctioned,
          matches: seed.matches,
          paymentTxSig: shortSig(),
          latencyMs: Date.now() - t0,
        }
      })()

      const mixerPromise = (async (): Promise<MixerRecord> => {
        const t0 = Date.now()
        await sleep(1700 + Math.random() * 600)
        return {
          address: seed.address,
          mixerLinked: seed.mixerLinked,
          matches: seed.mixerMatches,
          paymentTxSig: shortSig(),
          latencyMs: Date.now() - t0,
        }
      })()

      const [ofacRecord, mixerRecord] = await Promise.all([ofacPromise, mixerPromise])

      run.lookups.push(ofacRecord)
      send(IPC_CHANNELS.PIPELINE_LOOKUP_RESULT, {
        runId: run.runId,
        ...ofacRecord,
      } satisfies LookupResultEvent)

      run.mixerChecks.push(mixerRecord)
      send(IPC_CHANNELS.PIPELINE_MIXER_RESULT, {
        runId: run.runId,
        ...mixerRecord,
      } satisfies MixerResultEvent)

      done++
      this.emitProgress(run, send, 'lookup', Math.round((done / seeds.length) * 100))
    }

    // ── 6. Done ─────────────────────────────────────────────────────────
    if (this.bail(run)) return
    this.emitProgress(run, send, 'render', 100)
    const totalMs = Date.now() - run.startedAt
    // sanctionedCount now means "flagged by ANY source" — judges read it as
    // "wallets that need attention." Synthesis across OFAC + mixer.
    const flaggedAddresses = new Set<string>([
      ...run.lookups.filter((l) => l.sanctioned).map((l) => l.address),
      ...run.mixerChecks.filter((m) => m.mixerLinked).map((m) => m.address),
    ])
    const sanctionedCount = flaggedAddresses.size
    const totalLookups = run.lookups.length + run.mixerChecks.length
    const totalPaid = (Number(LOOKUP_PRICE_USDT) * totalLookups).toFixed(2)
    send(IPC_CHANNELS.PIPELINE_DONE, {
      runId: run.runId,
      totalMs,
      entityCount: run.entities.length,
      sanctionedCount,
      totalPaidUsdt: totalPaid,
    } satisfies PipelineDoneEvent)
  }
}

let _instance: PipelineOrchestrator | null = null
export function getPipelineOrchestrator(): PipelineOrchestrator {
  if (!_instance) _instance = new PipelineOrchestrator()
  return _instance
}

export function newRunId(): string {
  return randomUUID()
}
