import { ipcMain, dialog, type BrowserWindow } from 'electron'
import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import {
  IPC_CHANNELS,
  type PipelineStartRequest,
  type PipelineStartResponse,
  type QvacLoadProgressEvent,
  type QvacReadyEvent,
  type QvacErrorEvent,
  type QvacStatus,
  type QvacTestRequest,
  type QvacTestResponse,
} from '@sovereign/shared'
import {
  ensureQvac,
  getQvacInitElapsedMs,
  getQvacStatus,
} from '../qvac/singleton.js'
import { getPipelineOrchestrator, newRunId } from '../pipeline/orchestrator.js'
import * as walletService from '../wallet/wallet-service.js'

/**
 * Registers all main-process IPC handlers and starts the QVAC warm-up.
 *
 * Call once after the BrowserWindow is created so progress events can be
 * forwarded back to the renderer.
 */
export function registerIpcHandlers(getWindow: () => BrowserWindow | null) {
  const sendToRenderer = (channel: string, payload: unknown) => {
    const win = getWindow()
    if (!win || win.isDestroyed()) return
    win.webContents.send(channel, payload)
  }

  // ── QVAC ──────────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.QVAC_STATUS, async (): Promise<QvacStatus> => {
    return getQvacStatus()
  })

  ipcMain.handle(IPC_CHANNELS.QVAC_WARMUP, async () => {
    const runId = crypto.randomUUID()

    // Fire-and-forget; progress events stream back over IPC
    void (async () => {
      try {
        await ensureQvac((e: QvacLoadProgressEvent) => {
          sendToRenderer(IPC_CHANNELS.QVAC_LOAD_PROGRESS, e)
        })
        const ready: QvacReadyEvent = {
          backend: getQvacStatus().backend,
          durationMs: getQvacInitElapsedMs(),
        }
        sendToRenderer(IPC_CHANNELS.QVAC_READY, ready)
      } catch (e) {
        const err: QvacErrorEvent = { message: e instanceof Error ? e.message : String(e) }
        sendToRenderer(IPC_CHANNELS.QVAC_ERROR, err)
      }
    })()

    return { runId }
  })

  ipcMain.handle(
    IPC_CHANNELS.QVAC_TEST,
    async (_e, req?: QvacTestRequest): Promise<QvacTestResponse> => {
      const engine = await ensureQvac()

      // OCR — fake page image is fine for the smoke test
      const ocrStart = Date.now()
      const blocks = []
      for await (const b of engine.ocr({
        pageImage: Buffer.from([0]),
        pageNum: 1,
        pageDims: { w: 1700, h: 2200 },
      })) {
        blocks.push(b)
      }
      const ocrDurationMs = Date.now() - ocrStart
      const avgConf =
        blocks.length === 0 ? 0 : blocks.reduce((s, b) => s + b.confidence, 0) / blocks.length

      // LLM — entity extraction
      const llmStart = Date.now()
      const entities = await engine.extractEntities({
        pageText: req?.prompt ?? blocks.map((b) => b.text).join('\n'),
        pageNum: 1,
        regexCandidateAddresses: ['0x098B716B8Aaf21512996dC57EB0615e2383E2f96'],
      })
      const llmDurationMs = Date.now() - llmStart

      // Embed — single-call timing
      const embedStart = Date.now()
      const vec = await engine.embed('Sovereign smoke test embedding')
      const embedDurationMs = Date.now() - embedStart

      const sample = `${entities.length} entities · ${blocks.length} OCR blocks · ${vec.length}-dim embedding`

      return {
        llmTokens: entities.length,
        llmDurationMs,
        embedDims: vec.length,
        embedDurationMs,
        ocrConfidence: avgConf,
        ocrDurationMs,
        sample,
      }
    }
  )

  // ── Pipeline ──────────────────────────────────────────────────────────

  ipcMain.handle(
    IPC_CHANNELS.PIPELINE_START,
    async (_e, req: PipelineStartRequest): Promise<PipelineStartResponse> => {
      const runId = newRunId()
      const orchestrator = getPipelineOrchestrator()
      // Fire-and-forget; events stream back via webContents.send
      void orchestrator.start({
        runId,
        pdfPath: req.pdfPath,
        pages: req.pages,
        sendToRenderer,
      })
      return { runId }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.PIPELINE_CANCEL,
    async (_e, req: { runId: string }) => {
      return getPipelineOrchestrator().cancel(req.runId)
    }
  )

  // ── App ───────────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.APP_PICK_PDF, async () => {
    const win = getWindow()
    const result = await dialog.showOpenDialog(win ?? undefined!, {
      title: 'Select a PDF for forensic analysis',
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
      properties: ['openFile'],
    })
    if (result.canceled || result.filePaths.length === 0) {
      return { cancelled: true } as const
    }
    const filePath = result.filePaths[0]!
    const buf = await readFile(filePath)
    return {
      cancelled: false,
      name: basename(filePath),
      bytes: new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength),
    } as const
  })

  // ── Wallet (non-custodial Solana, devnet only) ────────────────────────

  ipcMain.handle(IPC_CHANNELS.WALLET_STATUS, async () => {
    return walletService.getStatus()
  })

  ipcMain.handle(IPC_CHANNELS.WALLET_CREATE, async () => {
    return walletService.createWallet()
  })

  ipcMain.handle(IPC_CHANNELS.WALLET_FUND_DEVNET, async () => {
    return walletService.fundDevnet()
  })

  ipcMain.handle(IPC_CHANNELS.WALLET_EXPORT_MNEMONIC, async () => {
    return walletService.exportMnemonic()
  })

  // ── App ───────────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.APP_OPEN_EXTERNAL, async (_e, payload: { url: string }) => {
    const allow = ['solscan.io', 'explorer.solana.com', 'treasury.gov', 'github.com']
    try {
      const u = new URL(payload.url)
      if (!allow.some((host) => u.host === host || u.host.endsWith('.' + host))) {
        return { ok: false }
      }
      const { shell } = await import('electron')
      void shell.openExternal(payload.url)
      return { ok: true }
    } catch {
      return { ok: false }
    }
  })
}
