import type { Env, PaymentIntent } from '../types.js'
import { getIntentStore } from '../intent/store.js'

/**
 * x402 challenge construction.
 *
 * When a client requests a paid resource without payment, we mint a
 * payment intent (nonce + recipient + amount), persist it with TTL,
 * and return the challenge body alongside HTTP 402 Payment Required.
 *
 * Spec reference: https://x402.org
 */

export interface X402ChallengeBody {
  paymentRequired: true
  network: 'solana-devnet'
  asset: 'USDT-SPL'
  mint: string
  recipient: string
  amount: string
  nonce: string
  expiresAt: number
}

export async function createChallenge(
  env: Env,
  args: { address: string; chain: 'solana' | 'ethereum' | 'bitcoin' }
): Promise<X402ChallengeBody> {
  const ttlSec = parseInt(env.NONCE_TTL_SEC, 10) || 60
  const expiresAt = Date.now() + ttlSec * 1000
  const nonce = crypto.randomUUID()

  if (!env.USDT_MINT_DEVNET || !env.TREASURY_ATA) {
    throw new Error(
      'Sentinel misconfigured: USDT_MINT_DEVNET and TREASURY_ATA must be set in wrangler.toml [vars]'
    )
  }

  const intent: PaymentIntent = {
    nonce,
    address: args.address,
    chain: args.chain,
    amount: env.LOOKUP_PRICE,
    expiresAt,
    consumed: false,
  }

  const store = getIntentStore(env)
  await store.put(intent)

  return {
    paymentRequired: true,
    network: 'solana-devnet',
    asset: 'USDT-SPL',
    mint: env.USDT_MINT_DEVNET,
    recipient: env.TREASURY_ATA,
    amount: env.LOOKUP_PRICE,
    nonce,
    expiresAt,
  }
}
