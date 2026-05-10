import { Hono } from 'hono'
import { getSdnVersion, getSdnEntryCount } from '../ofac/matcher.js'
import type { Env } from '../types.js'

export const healthRoutes = new Hono<{ Bindings: Env }>()

healthRoutes.get('/v1/health', (c) =>
  c.json({
    ok: true,
    service: 'sovereign-sentinel',
    version: '0.1.0',
    sdnEntries: getSdnEntryCount(),
    sdnVersion: getSdnVersion(),
    network: 'solana-devnet',
  })
)
