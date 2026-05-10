/**
 * Preload bridge — the only renderer surface to the main process.
 *
 * Self-contained: no workspace-package runtime imports, only `electron`.
 * This avoids any bundler issues with monorepo cross-package resolution.
 * Channel name strings are duplicated from packages/shared/src/ipc-contract.ts —
 * keep them in sync.
 */

// eslint-disable-next-line no-console
console.log('[preload] script entry')

import { contextBridge, ipcRenderer } from 'electron'

// eslint-disable-next-line no-console
console.log('[preload] electron imported, contextBridge =', typeof contextBridge)

// ── Channel constants (must match @sovereign/shared/ipc-contract.ts) ────
const CH = {
  QVAC_STATUS: 'qvac:status',
  QVAC_WARMUP: 'qvac:warmup',
  QVAC_TEST: 'qvac:test',
  QVAC_LOAD_PROGRESS: 'qvac:load-progress',
  QVAC_READY: 'qvac:ready',
  QVAC_ERROR: 'qvac:error',
  WALLET_STATUS: 'wallet:status',
  WALLET_CREATE: 'wallet:create',
  WALLET_FUND_DEVNET: 'wallet:fund-devnet',
  WALLET_EXPORT_MNEMONIC: 'wallet:export-mnemonic',
  PIPELINE_START: 'pipeline:start',
  PIPELINE_CANCEL: 'pipeline:cancel',
  HISTORY_LIST: 'history:list',
  HISTORY_GET: 'history:get',
  APP_OPEN_EXTERNAL: 'app:openExternal',
  APP_PICK_PDF: 'app:pickPdf',
  PIPELINE_PROGRESS: 'pipeline:progress',
  PIPELINE_ENTITY_FOUND: 'pipeline:entity-found',
  PIPELINE_LOOKUP_RESULT: 'pipeline:lookup-result',
  PIPELINE_MIXER_RESULT: 'pipeline:mixer-result',
  PIPELINE_DONE: 'pipeline:done',
  PIPELINE_ERROR: 'pipeline:error',
  WALLET_BALANCE_CHANGED: 'wallet:balance-changed',
} as const

function makeEventSubscription<T>(channel: string) {
  return (cb: (e: T) => void): (() => void) => {
    const handler = (_: unknown, payload: T) => cb(payload)
    ipcRenderer.on(channel, handler)
    return () => {
      ipcRenderer.off(channel, handler)
    }
  }
}

const sovereign = {
  qvac: {
    status: () => ipcRenderer.invoke(CH.QVAC_STATUS),
    warmup: () => ipcRenderer.invoke(CH.QVAC_WARMUP),
    test: (req?: unknown) => ipcRenderer.invoke(CH.QVAC_TEST, req),
    onLoadProgress: makeEventSubscription(CH.QVAC_LOAD_PROGRESS),
    onReady: makeEventSubscription(CH.QVAC_READY),
    onError: makeEventSubscription(CH.QVAC_ERROR),
  },
  wallet: {
    status: () => ipcRenderer.invoke(CH.WALLET_STATUS),
    create: () => ipcRenderer.invoke(CH.WALLET_CREATE),
    fundDevnet: () => ipcRenderer.invoke(CH.WALLET_FUND_DEVNET),
    exportMnemonic: () => ipcRenderer.invoke(CH.WALLET_EXPORT_MNEMONIC),
  },
  pipeline: {
    start: (req: unknown) => ipcRenderer.invoke(CH.PIPELINE_START, req),
    cancel: (runId: string) => ipcRenderer.invoke(CH.PIPELINE_CANCEL, { runId }),
    onProgress: makeEventSubscription(CH.PIPELINE_PROGRESS),
    onEntity: makeEventSubscription(CH.PIPELINE_ENTITY_FOUND),
    onLookup: makeEventSubscription(CH.PIPELINE_LOOKUP_RESULT),
    onMixer: makeEventSubscription(CH.PIPELINE_MIXER_RESULT),
    onDone: makeEventSubscription(CH.PIPELINE_DONE),
    onError: makeEventSubscription(CH.PIPELINE_ERROR),
  },
  history: {
    list: (req?: unknown) => ipcRenderer.invoke(CH.HISTORY_LIST, req ?? {}),
    get: (runId: string) => ipcRenderer.invoke(CH.HISTORY_GET, { runId }),
  },
  app: {
    openExternal: (url: string) =>
      ipcRenderer.invoke(CH.APP_OPEN_EXTERNAL, { url }),
    pickPdf: () => ipcRenderer.invoke(CH.APP_PICK_PDF),
  },
  events: {
    onWalletBalanceChanged: makeEventSubscription(CH.WALLET_BALANCE_CHANGED),
  },
}

try {
  contextBridge.exposeInMainWorld('sovereign', sovereign)
  // eslint-disable-next-line no-console
  console.log('[preload] window.sovereign exposed — keys:', Object.keys(sovereign))
} catch (e) {
  console.error('[preload] failed to expose sovereign API:', e)
}
