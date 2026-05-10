import { Hono } from 'hono'
import type { Env } from '../types.js'
import { getSdnVersion, getSdnEntryCount } from '../ofac/matcher.js'

export const sdnRoutes = new Hono<{ Bindings: Env }>()

sdnRoutes.get('/v1/sdn/version', (c) =>
  c.json({
    sdnVersion: getSdnVersion(),
    sdnEntries: getSdnEntryCount(),
    source: 'fixture',
  })
)

/**
 * Admin-only: force re-pull of OFAC SDN list from US Treasury.
 * Intended to be invoked by cron + manually via Bearer auth.
 *
 * STUB: real XML parse lands when we ship cron-driven refresh.
 */
sdnRoutes.post('/v1/sdn/refresh', async (c) => {
  const expected = c.env.ADMIN_BEARER
  const auth = c.req.header('Authorization')
  if (!expected || auth !== `Bearer ${expected}`) {
    return c.json({ error: 'unauthorized' }, 401)
  }

  return c.json({
    ok: true,
    message: 'Refresh stub — real XML pull lands later.',
    currentVersion: getSdnVersion(),
  })
})
