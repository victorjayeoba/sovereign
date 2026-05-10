import { z } from 'zod'

/**
 * Zod schemas — single source of truth used by both desktop and sentinel.
 */

// ── Entity extraction ───────────────────────────────────────────────────

export const EntitySchema = z.object({
  type: z.enum([
    'person',
    'organization',
    'wallet_address',
    'date',
    'amount',
    'location',
  ]),
  value: z.string().min(1).max(200),
  matchedRegexHit: z.string().optional(),
  ownerEntityValue: z.string().optional(),
  sourceText: z.string().min(1).max(300),
  confidence: z.number().min(0).max(1),
})
export type Entity = z.infer<typeof EntitySchema>

export const ExtractEntitiesArgsSchema = z.object({
  entities: z.array(EntitySchema).max(40),
})
export type ExtractEntitiesArgs = z.infer<typeof ExtractEntitiesArgsSchema>

// ── PDF extraction (renderer → main) ────────────────────────────────────

export const PageTextSchema = z.object({
  pageNum: z.number().int().min(1),
  text: z.string(),
})
export type PageText = z.infer<typeof PageTextSchema>

// ── x402 payment protocol ───────────────────────────────────────────────

export const X402ChallengeSchema = z.object({
  paymentRequired: z.literal(true),
  network: z.literal('solana-devnet'),
  asset: z.literal('USDT-SPL'),
  mint: z.string(),
  recipient: z.string(),
  amount: z.string(),
  nonce: z.string().uuid(),
  expiresAt: z.number(),
})
export type X402Challenge = z.infer<typeof X402ChallengeSchema>

export const X402PaymentHeaderSchema = z.object({
  txSig: z.string(),
  payer: z.string(),
  amount: z.string(),
  nonce: z.string().uuid(),
})
export type X402PaymentHeader = z.infer<typeof X402PaymentHeaderSchema>

// ── Sentinel API ────────────────────────────────────────────────────────

export const LookupRequestSchema = z.object({
  address: z.string().min(26).max(64),
  chain: z.enum(['solana', 'ethereum', 'bitcoin']),
})
export type LookupRequest = z.infer<typeof LookupRequestSchema>

export const SdnMatchSchema = z.object({
  uid: z.string(),
  name: z.string(),
  program: z.array(z.string()),
  type: z.enum(['Individual', 'Entity', 'Vessel', 'Aircraft']),
  remarks: z.string().optional(),
  source: z.literal('OFAC SDN'),
})
export type SdnMatch = z.infer<typeof SdnMatchSchema>

export const LookupResponseSchema = z.object({
  address: z.string(),
  sanctioned: z.boolean(),
  matches: z.array(SdnMatchSchema),
  sdnVersion: z.string(),
  paymentTxSig: z.string(),
  verifiedAt: z.number(),
})
export type LookupResponse = z.infer<typeof LookupResponseSchema>

// ── Mixer linkage (second risk source, paid via separate Sentinel call) ─

export const MixerMatchSchema = z.object({
  uid: z.string(),
  name: z.string(), // "Tornado Cash", "ChipMixer", "Hydra"
  type: z.enum(['deposit', 'exit', 'direct']),
  remarks: z.string().optional(),
  source: z.literal('Mixer Linkage'),
})
export type MixerMatch = z.infer<typeof MixerMatchSchema>

export const MixerCheckResponseSchema = z.object({
  address: z.string(),
  mixerLinked: z.boolean(),
  matches: z.array(MixerMatchSchema),
  paymentTxSig: z.string(),
  verifiedAt: z.number(),
})
export type MixerCheckResponse = z.infer<typeof MixerCheckResponseSchema>

// ── Pipeline state ──────────────────────────────────────────────────────

export const PipelineStageSchema = z.enum([
  'rasterize',
  'ocr',
  'extract',
  'dedup',
  'lookup',
  'render',
])
export type PipelineStage = z.infer<typeof PipelineStageSchema>

export const PipelineProgressSchema = z.object({
  runId: z.string(),
  stage: PipelineStageSchema,
  pct: z.number().min(0).max(100),
  etaMs: z.number().optional(),
  /** Optional system note to render as a scan line at this transition. */
  note: z.string().optional(),
})
export type PipelineProgress = z.infer<typeof PipelineProgressSchema>

export const PipelineErrorCodeSchema = z.enum([
  'QVAC_LOAD',
  'RPC_DOWN',
  'SENTINEL_5XX',
  'INSUFFICIENT_FUNDS',
  'TIMEOUT',
  'INVALID_PDF',
  'UNKNOWN',
])
export type PipelineErrorCode = z.infer<typeof PipelineErrorCodeSchema>

export const ForensicReportSchema = z.object({
  runId: z.string(),
  pdfName: z.string(),
  totalMs: z.number(),
  entityCount: z.number(),
  sanctionedCount: z.number(),
  totalPaidUsdt: z.string(),
  entities: z.array(
    EntitySchema.extend({
      sanctioned: z.boolean().optional(),
      matches: z.array(SdnMatchSchema).optional(),
      paymentTxSig: z.string().optional(),
      evidence: z
        .object({
          pageNum: z.number(),
          bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
          snippet: z.string(),
        })
        .optional(),
    })
  ),
})
export type ForensicReport = z.infer<typeof ForensicReportSchema>

// ── Wallet ──────────────────────────────────────────────────────────────

export const WalletStatusSchema = z.object({
  initialized: z.boolean(),
  address: z.string().optional(),
  usdtBalance: z.string().optional(),
  solBalance: z.string().optional(),
})
export type WalletStatus = z.infer<typeof WalletStatusSchema>
