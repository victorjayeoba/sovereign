import type { SdnEntry } from '../types.js'

/**
 * OFAC SDN XML parser — reads the official Treasury SDN dump and emits
 * SdnEntry[] keyed on every digital-currency address found in <feature>
 * blocks.
 *
 * SDN XML schema reference: https://www.treasury.gov/ofac/downloads/sdn.xsd
 *
 * NOTE: Cloudflare Workers don't ship a DOMParser. We use a lightweight
 * regex-based extraction for the specific fields we care about. For a
 * production-grade parser, swap in `fast-xml-parser` once the demo is shipped.
 */

const ADDRESS_FEATURE_TYPES = [
  'Digital Currency Address - XBT', // Bitcoin
  'Digital Currency Address - ETH', // Ethereum
  'Digital Currency Address - SOL', // Solana
  'Digital Currency Address - USDT',
  'Digital Currency Address - USDC',
  'Digital Currency Address - LTC',
  'Digital Currency Address - XRP',
] as const

/**
 * Stub implementation. Returns an empty array on Workers — the cron handler
 * is wired but the actual XML download lands later (the demo runs on the
 * curated fixture in `data/sdn-fixture.ts`).
 */
export async function parseSdnXml(_xml: string): Promise<SdnEntry[]> {
  // TODO: implement once we wire the cron-based refresh.
  // For now we ship the curated fixture (sufficient for demo coverage).
  return []
}

export const SUPPORTED_ADDRESS_FEATURES = ADDRESS_FEATURE_TYPES
