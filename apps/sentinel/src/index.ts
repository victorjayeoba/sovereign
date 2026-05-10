import { Hono } from 'hono'
import type { Env } from './types.js'
import { healthRoutes } from './routes/health.js'
import { lookupRoutes } from './routes/lookup.js'
import { sdnRoutes } from './routes/sdn.js'

const app = new Hono<{ Bindings: Env }>()

// CORS — chain-auth means no session secrets to protect
app.use('*', async (c, next) => {
  c.header('Access-Control-Allow-Origin', '*')
  c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  c.header('Access-Control-Allow-Headers', 'Content-Type, X-Payment, Authorization')
  c.header('Access-Control-Expose-Headers', 'X-Payment-Required')
  if (c.req.method === 'OPTIONS') return c.body(null, 204)
  await next()
})

app.get('/', (c) =>
  c.text(
    [
      'Sovereign Sentinel API',
      '',
      'GET  /v1/health        — service status + SDN version',
      'POST /v1/lookup        — paywalled OFAC lookup (x402)',
      'GET  /v1/sdn/version   — current SDN version',
      'POST /v1/sdn/refresh   — admin-only, refreshes SDN cache',
    ].join('\n'),
    200,
    { 'content-type': 'text/plain; charset=utf-8' }
  )
)

app.route('/', healthRoutes)
app.route('/', lookupRoutes)
app.route('/', sdnRoutes)

app.onError((err, c) => {
  console.error('[sentinel error]', err)
  return c.json({ error: 'internal_error', message: err.message }, 500)
})

export default app
