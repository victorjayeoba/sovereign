import type { SdnEntry } from '../../types.js'

/**
 * Curated OFAC SDN entries with known wallet addresses.
 *
 * Source: US Treasury Office of Foreign Assets Control (OFAC) Specially
 * Designated Nationals (SDN) List — public dataset.
 * https://sanctionssearch.ofac.treas.gov
 *
 * In production, the cron-triggered SDN refresh (apps/sentinel/src/routes/sdn.ts)
 * downloads the full SDN XML from Treasury and replaces this fixture.
 *
 * For the hackathon demo we ship a curated subset of well-documented sanctioned
 * addresses, primarily from the Lazarus Group (DPRK) and Tornado Cash sanctions.
 */
export const SDN_FIXTURE: SdnEntry[] = [
  {
    uid: 'OFAC-LAZARUS-001',
    name: 'Lazarus Group',
    program: ['CYBER2', 'DPRK3'],
    type: 'Entity',
    remarks: 'DPRK-affiliated cyber threat actor; designated 2019-09-13.',
    source: 'OFAC SDN',
    addresses: [
      // ETH — sample Lazarus-attributed addresses (publicly documented)
      '0x098B716B8Aaf21512996dC57EB0615e2383E2f96',
      '0xa0e1c89Ef1a489c9C7dE96311eD5Ce5D32c20E4B',
      // BTC
      'bc1qm97vqzgj934vnaq9s53ynkyf9dgr05rargr04n',
    ],
  },
  {
    uid: 'OFAC-TORNADO-001',
    name: 'Tornado Cash',
    program: ['CYBER2'],
    type: 'Entity',
    remarks:
      'Virtual currency mixer designated 2022-08-08; redesignated under Executive Order 13694.',
    source: 'OFAC SDN',
    addresses: [
      '0x8589427373D6D84E98730D7795D8f6f8731FDA16',
      '0x910Cbd523D972eb0a6f4cAe4618aD62622b39DbF',
      '0xA160cdAB225685dA1d56aa342Ad8841c3b53f291',
    ],
  },
  {
    uid: 'OFAC-GARANTEX-001',
    name: 'Garantex Europe OU',
    program: ['RUSSIA-EO14024'],
    type: 'Entity',
    remarks:
      'Russia-linked virtual currency exchange designated 2022-04-05 for facilitating illicit activity.',
    source: 'OFAC SDN',
    addresses: [
      // Sample known Garantex-associated addresses (publicly documented in OFAC press releases)
      '0xA7e5d5A720f06526557c513402f2e6B5fA20b008',
    ],
  },
]

/**
 * Build a lookup map: lowercase address → SdnEntry[].
 * (Solana addresses are case-sensitive base58 and we store them as-is too.)
 */
export function buildSdnIndex(entries: SdnEntry[]): Map<string, SdnEntry[]> {
  const map = new Map<string, SdnEntry[]>()
  for (const entry of entries) {
    for (const addr of entry.addresses) {
      // Index both case-preserved and lowercased forms
      const keys = new Set<string>([addr, addr.toLowerCase()])
      for (const key of keys) {
        const existing = map.get(key) ?? []
        existing.push(entry)
        map.set(key, existing)
      }
    }
  }
  return map
}

export const SDN_FIXTURE_VERSION = '2026-05-09-fixture'
