import type { SovereignApi } from '@sovereign/shared'

declare global {
  interface Window {
    sovereign: SovereignApi
  }
}

export {}
