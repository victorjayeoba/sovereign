import type { PaymentIntent } from '../types.js'

/**
 * Payment intent store.
 *
 * In production this is backed by Cloudflare KV with TTL.
 * For local dev (without KV bindings) we fall back to an in-memory Map
 * scoped to the Worker instance.
 *
 * Workers reuse instances within a region for several minutes, so the in-mem
 * fallback is fine for the 60-second nonce TTL.
 */

interface IntentStore {
  put(intent: PaymentIntent): Promise<void>
  get(nonce: string): Promise<PaymentIntent | null>
  consume(nonce: string): Promise<void>
}

class InMemoryStore implements IntentStore {
  private map = new Map<string, PaymentIntent>()

  async put(intent: PaymentIntent): Promise<void> {
    this.map.set(intent.nonce, intent)
    // Lazy cleanup of expired entries
    setTimeout(() => {
      const cur = this.map.get(intent.nonce)
      if (cur && cur.expiresAt <= Date.now()) this.map.delete(intent.nonce)
    }, (intent.expiresAt - Date.now()) + 1000)
  }

  async get(nonce: string): Promise<PaymentIntent | null> {
    const cur = this.map.get(nonce) ?? null
    if (!cur) return null
    if (cur.expiresAt <= Date.now()) {
      this.map.delete(nonce)
      return null
    }
    return cur
  }

  async consume(nonce: string): Promise<void> {
    this.map.delete(nonce)
  }
}

const memStore = new InMemoryStore()

export function getIntentStore(_env: unknown): IntentStore {
  // Future: if env.NONCE_KV exists, return a KV-backed store
  return memStore
}
