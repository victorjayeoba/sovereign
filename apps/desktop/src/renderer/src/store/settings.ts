import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/**
 * Persisted user settings — Zustand + localStorage. Migrates to electron-store
 * (with main-process IPC reads at app boot) once we ship the WDK + x402 chunks.
 *
 * Hackathon scope: only the runtime decisions that actually affect Sovereign's
 * behavior are toggleable. Mainnet is intentionally locked — we ship a mock
 * USDT mint on devnet and never touch real funds.
 */

export type QvacBackend = 'mock' | 'real'
export type SolanaNetwork = 'devnet' | 'mainnet'

interface SettingsStore {
  qvacBackend: QvacBackend
  solanaNetwork: SolanaNetwork
  /** Set by the user via SettingsView → triggers a banner asking to restart. */
  qvacBackendRequiresRestart: boolean

  setQvacBackend: (backend: QvacBackend) => void
  setSolanaNetwork: (network: SolanaNetwork) => void
  acknowledgeRestart: () => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      qvacBackend: 'mock',
      solanaNetwork: 'devnet',
      qvacBackendRequiresRestart: false,

      setQvacBackend: (backend) =>
        set((s) => ({
          qvacBackend: backend,
          qvacBackendRequiresRestart: backend !== s.qvacBackend,
        })),
      // Only allow devnet — mainnet is intentionally locked at the store level
      // so a renderer hack can't bypass the UI lock.
      setSolanaNetwork: (network) =>
        set(() => ({ solanaNetwork: network === 'mainnet' ? 'devnet' : network })),
      acknowledgeRestart: () => set({ qvacBackendRequiresRestart: false }),
    }),
    {
      name: 'sovereign-settings',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
)
