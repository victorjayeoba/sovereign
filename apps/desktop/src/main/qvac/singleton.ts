import type { QvacEngine } from './types.js'
import type { QvacBackend, QvacLoadProgressEvent, QvacStatus } from '@sovereign/shared'
import { MockQvacEngine } from './mock.js'

/**
 * QVAC singleton. One Bare worker per app lifetime.
 *
 * Backend is selected by env:
 *   SOVEREIGN_QVAC_BACKEND=real → uses @qvac/sdk (Mac M-series recommended)
 *   SOVEREIGN_QVAC_BACKEND=mock → uses MockQvacEngine (default, dev-friendly)
 *
 * The real backend is loaded via dynamic import so the package can be missing
 * without breaking the build (e.g. on Windows where @qvac/sdk install can fail).
 */

let _engine: QvacEngine | null = null
let _initPromise: Promise<void> | null = null
let _initStartedAt = 0
let _initElapsedMs = 0

function pickBackend(): QvacBackend {
  const env = process.env['SOVEREIGN_QVAC_BACKEND']?.toLowerCase()
  // Default to mock for fast Windows iteration. The Bare-runtime + native
  // bindings work reliably on Mac M-series, so we flip the default to 'real'
  // for the demo recording by setting SOVEREIGN_QVAC_BACKEND=real there.
  if (env === 'real') return 'real'
  return 'mock'
}

async function buildEngine(backend: QvacBackend): Promise<QvacEngine> {
  if (backend === 'real') {
    try {
      const { RealQvacEngine } = await import('./real.js')
      console.log('[qvac] using REAL backend (@qvac/sdk)')
      return new RealQvacEngine()
    } catch (e) {
      console.warn('[qvac] real backend unavailable, falling back to mock:', e)
    }
  }
  console.log('[qvac] using MOCK backend')
  return new MockQvacEngine()
}

export async function ensureQvac(
  onProgress?: (e: QvacLoadProgressEvent) => void
): Promise<QvacEngine> {
  if (_engine && _initPromise) {
    await _initPromise
    return _engine
  }

  if (!_engine) {
    _engine = await buildEngine(pickBackend())
  }

  if (!_initPromise) {
    _initStartedAt = Date.now()
    _initPromise = _engine
      .initialize((e) => {
        onProgress?.(e)
      })
      .then(() => {
        _initElapsedMs = Date.now() - _initStartedAt
      })
  }

  await _initPromise
  return _engine
}

export function getQvacOrNull(): QvacEngine | null {
  return _engine
}

export function getQvacStatus(): QvacStatus {
  if (!_engine) {
    return {
      backend: pickBackend(),
      ready: false,
      modules: [
        { key: 'ocr', loaded: false },
        { key: 'embed', loaded: false },
        { key: 'llm', loaded: false },
      ],
      overallPct: 0,
      message: 'Not initialized',
    }
  }
  return _engine.getStatus()
}

export function getQvacInitElapsedMs(): number {
  return _initElapsedMs
}

export async function shutdownQvac(): Promise<void> {
  if (_engine) await _engine.shutdown()
  _engine = null
  _initPromise = null
}
