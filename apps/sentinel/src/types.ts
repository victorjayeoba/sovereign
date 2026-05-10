/**
 * Cloudflare Worker Env bindings + Sentinel-internal types.
 */

export interface Env {
  // Vars (from wrangler.toml [vars])
  LOOKUP_PRICE: string
  NONCE_TTL_SEC: string
  SOLANA_RPC_URL: string
  USDT_MINT_DEVNET: string
  TREASURY_ATA: string

  // Secrets (set via wrangler secret put)
  ADMIN_BEARER?: string

  // KV Namespaces (uncomment in wrangler.toml after creation)
  // SDN_KV: KVNamespace
  // NONCE_KV: KVNamespace

  // R2 Buckets
  // SDN_R2: R2Bucket
}

export interface SdnEntry {
  uid: string
  name: string
  program: string[]
  type: 'Individual' | 'Entity' | 'Vessel' | 'Aircraft'
  remarks?: string
  source: 'OFAC SDN'
  /** All known wallet addresses for this SDN entity, lowercased and case-preserved. */
  addresses: string[]
}

export interface PaymentIntent {
  nonce: string
  address: string
  chain: 'solana' | 'ethereum' | 'bitcoin'
  amount: string
  expiresAt: number
  consumed: boolean
}
