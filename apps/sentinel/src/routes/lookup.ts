import { Hono } from 'hono'
import { z } from 'zod'
import type { Env } from '../types.js'
import { createChallenge } from '../x402/challenge.js'
import { getIntentStore } from '../intent/store.js'
import { lookupAddress, getSdnVersion } from '../ofac/matcher.js'
import { verifyUsdtSplPayment } from '../solana/verify-tx.js'

const LookupBody = z.object({
  address: z.string().min(20).max(80),
  chain: z.enum(['solana', 'ethereum', 'bitcoin']),
})

const PaymentHeaderShape = z.object({
  txSig: z.string(),
  payer: z.string().optional(),
  amount: z.string(),
  nonce: z.string().uuid(),
})

export const lookupRoutes = new Hono<{ Bindings: Env }>()

lookupRoutes.post('/v1/lookup', async (c) => {
  const env = c.env

  // 1. Validate request body
  let body: z.infer<typeof LookupBody>
  try {
    body = LookupBody.parse(await c.req.json())
  } catch (e) {
    return c.json({ error: 'invalid_request', details: String(e) }, 400)
  }

  // 2. No payment header → mint a challenge
  const paymentHeader = c.req.header('X-Payment')
  if (!paymentHeader) {
    try {
      const challenge = await createChallenge(env, body)
      return c.json(challenge, 402)
    } catch (e) {
      return c.json({ error: 'challenge_failed', message: String(e) }, 500)
    }
  }

  // 3. Parse payment header
  let payment: z.infer<typeof PaymentHeaderShape>
  try {
    const decoded = atob(paymentHeader)
    payment = PaymentHeaderShape.parse(JSON.parse(decoded))
  } catch (e) {
    return c.json({ error: 'invalid_payment_header', details: String(e) }, 400)
  }

  // 4. Match nonce
  const store = getIntentStore(env)
  const intent = await store.get(payment.nonce)
  if (!intent) return c.json({ error: 'nonce_unknown_or_expired' }, 402)
  if (intent.consumed) return c.json({ error: 'nonce_already_consumed' }, 402)
  if (intent.address !== body.address) return c.json({ error: 'address_mismatch' }, 400)

  // 5. Verify on-chain USDT-SPL transfer
  const lookupPrice = BigInt(env.LOOKUP_PRICE)
  const verify = await verifyUsdtSplPayment({
    rpcUrl: env.SOLANA_RPC_URL,
    txSig: payment.txSig,
    expectedMint: env.USDT_MINT_DEVNET,
    expectedDestination: env.TREASURY_ATA,
    expectedMinAmount: lookupPrice,
  })

  if (!verify.ok) {
    return c.json({ error: 'payment_verification_failed', reason: verify.reason }, 402)
  }

  // 6. Consume nonce (single-use, replay-protected)
  await store.consume(payment.nonce)

  // 7. Run OFAC lookup
  const matches = lookupAddress(body.address)

  return c.json({
    address: body.address,
    sanctioned: matches.length > 0,
    matches: matches.map((m) => ({
      uid: m.uid,
      name: m.name,
      program: m.program,
      type: m.type,
      remarks: m.remarks,
      source: 'OFAC SDN' as const,
    })),
    sdnVersion: getSdnVersion(),
    paymentTxSig: payment.txSig,
    verifiedAt: Date.now(),
  })
})
