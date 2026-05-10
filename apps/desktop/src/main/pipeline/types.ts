import type {
  Entity,
  MixerMatch,
  PageText,
  PipelineProgress,
  PipelineStage,
  SdnMatch,
} from '@sovereign/shared'

export interface RunState {
  runId: string
  pdfPath: string
  startedAt: number
  cancelled: boolean
  stage: PipelineStage
  entities: Entity[]
  lookups: LookupRecord[]
  mixerChecks: MixerRecord[]
}

export interface LookupRecord {
  address: string
  sanctioned: boolean
  matches: SdnMatch[]
  paymentTxSig: string
  latencyMs: number
}

export interface MixerRecord {
  address: string
  mixerLinked: boolean
  matches: MixerMatch[]
  paymentTxSig: string
  latencyMs: number
}

export type SendToRenderer = (channel: string, payload: unknown) => void

export interface OrchestratorStartArgs {
  runId: string
  pdfPath: string
  pages?: PageText[]
  sendToRenderer: SendToRenderer
}

export type ProgressEmitter = (p: Omit<PipelineProgress, 'runId'>) => void
