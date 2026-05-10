/**
 * Shared constants used across desktop, sentinel, and scripts.
 *
 * NOTE: real USDT-SPL only exists on Solana mainnet. For the hackathon demo
 * we deploy our own mock USDT mint on devnet and hardcode it here. The
 * Sentinel API verifies USDT-SPL transfers against this same mint.
 */

export const SOLANA_DEVNET_RPC = 'https://api.devnet.solana.com'
export const SOLANA_MAINNET_RPC = 'https://api.mainnet-beta.solana.com'

/**
 * Real USDT-SPL mint on Solana mainnet (for reference / future).
 * NOT used during the hackathon demo.
 */
export const USDT_MINT_MAINNET = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'

/**
 * Mock USDT-SPL mint on Solana devnet — deployed by us for the demo.
 * Set via env after running scripts/deploy-mock-usdt.ts.
 */
export const USDT_MINT_DEVNET_PLACEHOLDER = 'TO_BE_DEPLOYED_ON_DEVNET'

/**
 * Per-lookup price in USDT base units. USDT has 6 decimals.
 * 10000 base units = 0.01 USDT.
 */
export const LOOKUP_PRICE_BASE_UNITS = 10_000n
export const LOOKUP_PRICE_USDT = '0.01'

/**
 * Nonce TTL in seconds — payment intents expire after this window.
 */
export const NONCE_TTL_SECONDS = 60

/**
 * Latency budget for the end-to-end demo pipeline (8 seconds).
 */
export const PIPELINE_BUDGET_MS = 8_000

/**
 * Default Sentinel API URL (override via SENTINEL_URL env).
 *
 * The Sentinel API runs locally via `pnpm --filter sentinel dev` — by design.
 * Sovereign is shipped as a desktop app, and Sentinel is the *third party*
 * the agent autonomously pays for intel. Both processes run on the user's
 * machine in this build (localhost:8787 for Sentinel, Electron for desktop).
 *
 * For a public deployment, override SENTINEL_URL to a hosted URL (Cloudflare
 * Workers, Fly.io, etc.). The protocol surface is identical.
 */
export const SENTINEL_DEFAULT_URL = 'http://localhost:8787'

/**
 * Wallet address regex patterns. Used by the address sweep stage.
 */
export const ADDRESS_PATTERNS = {
  solana: /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g,
  ethereum: /\b0x[a-fA-F0-9]{40}\b/g,
  bitcoinBech32: /\bbc1[a-z0-9]{39,59}\b/g,
  bitcoinLegacy: /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g,
} as const

export type SupportedChain = 'solana' | 'ethereum' | 'bitcoin'

/**
 * Cosine similarity threshold for entity coreference clustering.
 * Picked empirically; "Acme Holdings, LLC" / "Acme Hldgs." cluster at >0.92.
 */
export const ENTITY_DEDUP_THRESHOLD = 0.92
