import { buildSdnIndex, SDN_FIXTURE, SDN_FIXTURE_VERSION } from './data/sdn-fixture.js'
import type { SdnEntry } from '../types.js'

/**
 * In-process OFAC SDN matcher.
 *
 * Hot path: a single Map<address, SdnEntry[]> built once per Worker
 * instance and cached in module scope (Workers reuse instances within
 * a region, so this stays warm across requests).
 *
 * Future: replace SDN_FIXTURE with KV-loaded entries refreshed daily by cron.
 */

let _index: Map<string, SdnEntry[]> | null = null
let _version = SDN_FIXTURE_VERSION

function getIndex(): Map<string, SdnEntry[]> {
  if (!_index) {
    _index = buildSdnIndex(SDN_FIXTURE)
  }
  return _index
}

export function lookupAddress(address: string): SdnEntry[] {
  const idx = getIndex()
  return idx.get(address) ?? idx.get(address.toLowerCase()) ?? []
}

export function getSdnVersion(): string {
  return _version
}

export function getSdnEntryCount(): number {
  return SDN_FIXTURE.length
}

/** Replace the in-memory index — used by the cron-driven refresh route. */
export function replaceSdnIndex(entries: SdnEntry[], version: string) {
  _index = buildSdnIndex(entries)
  _version = version
}
