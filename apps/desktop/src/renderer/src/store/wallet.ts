import { create } from 'zustand'
import type { WalletStatus } from '@sovereign/shared'

/**
 * Renderer-side wallet state. All work happens in the main process — this
 * store is just a cache + IPC orchestrator.
 *
 * The mnemonic is NEVER stored here. It crosses IPC only on `create()` (one
 * time, immediately shown to the user) and `exportMnemonic()` (gated reveal).
 */

interface WalletStore {
  initialized: boolean
  address: string | null
  usdtBalance: string | null
  solBalance: string | null

  loading: boolean
  /** Set briefly when create() runs so the UI can show the mnemonic. */
  freshMnemonic: string | null
  error: string | null

  refresh: () => Promise<void>
  create: () => Promise<{ address: string; mnemonic: string }>
  fundDevnet: () => Promise<void>
  exportMnemonic: () => Promise<string>
  clearFreshMnemonic: () => void
}

function applyStatus(s: WalletStatus) {
  return {
    initialized: s.initialized,
    address: s.address ?? null,
    usdtBalance: s.usdtBalance ?? null,
    solBalance: s.solBalance ?? null,
  }
}

export const useWalletStore = create<WalletStore>((set, get) => ({
  initialized: false,
  address: null,
  usdtBalance: null,
  solBalance: null,
  loading: false,
  freshMnemonic: null,
  error: null,

  refresh: async () => {
    if (!window.sovereign?.wallet) return
    set({ loading: true, error: null })
    try {
      const status = await window.sovereign.wallet.status()
      set({ ...applyStatus(status), loading: false })
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : String(e) })
    }
  },

  create: async () => {
    if (!window.sovereign?.wallet) throw new Error('Wallet API unavailable')
    set({ loading: true, error: null })
    try {
      const result = await window.sovereign.wallet.create()
      set({
        initialized: true,
        address: result.address,
        usdtBalance: '0.00',
        solBalance: '0.0000',
        freshMnemonic: result.mnemonic,
        loading: false,
      })
      // Refresh in background to pick up real balances
      setTimeout(() => void get().refresh(), 200)
      return result
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e)
      set({ loading: false, error: err })
      throw e
    }
  },

  fundDevnet: async () => {
    if (!window.sovereign?.wallet) return
    set({ loading: true, error: null })
    try {
      const res = await window.sovereign.wallet.fundDevnet()
      set({
        usdtBalance: res.usdtBalance,
        solBalance: res.solBalance,
        loading: false,
      })
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : String(e) })
    }
  },

  exportMnemonic: async () => {
    if (!window.sovereign?.wallet) throw new Error('Wallet API unavailable')
    const result = await window.sovereign.wallet.exportMnemonic()
    return result.mnemonic
  },

  clearFreshMnemonic: () => set({ freshMnemonic: null }),
}))
