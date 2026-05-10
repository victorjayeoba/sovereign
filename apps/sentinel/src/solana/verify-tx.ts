/**
 * Solana transaction verification — checks that a USDT-SPL transfer matching
 * the payment intent actually settled on-chain.
 *
 * We use direct JSON-RPC over fetch (instead of @solana/web3.js) to keep the
 * Worker bundle small and the dep tree shallow. Workers compatibility ✅.
 */

interface SolanaParsedInstruction {
  program?: string
  programId?: string
  parsed?: {
    type?: string
    info?: {
      mint?: string
      destination?: string
      authority?: string
      tokenAmount?: { amount?: string; decimals?: number; uiAmount?: number }
    }
  }
}

interface SolanaParsedTx {
  result: {
    blockTime: number
    meta: {
      err: unknown
      innerInstructions?: Array<{ instructions: SolanaParsedInstruction[] }>
    }
    transaction: {
      message: {
        instructions: SolanaParsedInstruction[]
        accountKeys: Array<{ pubkey: string; signer?: boolean }>
      }
    }
  } | null
}

export interface VerifyArgs {
  rpcUrl: string
  txSig: string
  expectedMint: string
  expectedDestination: string
  expectedMinAmount: bigint // base units (USDT has 6 decimals)
  /** Reject if blockTime is older than now - this many seconds. */
  maxAgeSeconds?: number
}

export type VerifyResult =
  | { ok: true; payer: string; amount: string; blockTime: number }
  | { ok: false; reason: string }

async function rpc<T>(rpcUrl: string, method: string, params: unknown[]): Promise<T> {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  if (!res.ok) throw new Error(`Solana RPC ${method} HTTP ${res.status}`)
  return (await res.json()) as T
}

export async function verifyUsdtSplPayment(args: VerifyArgs): Promise<VerifyResult> {
  // 1. Confirm transaction status — must be 'confirmed' or 'finalized'
  const status = await rpc<{
    result: { value: Array<{ confirmationStatus?: string; err?: unknown } | null> } | null
  }>(args.rpcUrl, 'getSignatureStatuses', [
    [args.txSig],
    { searchTransactionHistory: true },
  ])

  const s = status.result?.value?.[0]
  if (!s) return { ok: false, reason: 'tx_not_found' }
  if (s.err) return { ok: false, reason: 'tx_failed' }
  if (s.confirmationStatus !== 'confirmed' && s.confirmationStatus !== 'finalized') {
    return { ok: false, reason: `tx_pending:${s.confirmationStatus ?? 'unknown'}` }
  }

  // 2. Fetch parsed transaction and walk instructions
  const tx = await rpc<SolanaParsedTx>(args.rpcUrl, 'getParsedTransaction', [
    args.txSig,
    { commitment: 'confirmed', maxSupportedTransactionVersion: 0 },
  ])

  if (!tx.result) return { ok: false, reason: 'tx_unparsable' }

  const maxAge = args.maxAgeSeconds ?? 300
  const ageSeconds = Math.floor(Date.now() / 1000) - tx.result.blockTime
  if (ageSeconds > maxAge) return { ok: false, reason: `tx_too_old:${ageSeconds}s` }

  // 3. Find the SPL TransferChecked instruction matching our expectations
  const allIxs: SolanaParsedInstruction[] = [
    ...tx.result.transaction.message.instructions,
    ...(tx.result.meta.innerInstructions?.flatMap((g) => g.instructions) ?? []),
  ]

  const transferIx = allIxs.find(
    (ix) =>
      ix.program === 'spl-token' &&
      (ix.parsed?.type === 'transferChecked' || ix.parsed?.type === 'transfer') &&
      ix.parsed?.info?.mint === args.expectedMint &&
      ix.parsed?.info?.destination === args.expectedDestination
  )

  if (!transferIx?.parsed?.info)
    return { ok: false, reason: 'no_matching_transfer_ix' }

  const amountStr = transferIx.parsed.info.tokenAmount?.amount
  if (!amountStr) return { ok: false, reason: 'missing_amount' }

  const amount = BigInt(amountStr)
  if (amount < args.expectedMinAmount)
    return { ok: false, reason: `underpaid:${amount}<${args.expectedMinAmount}` }

  const payer =
    transferIx.parsed.info.authority ??
    tx.result.transaction.message.accountKeys.find((k) => k.signer)?.pubkey ??
    'unknown'

  return { ok: true, payer, amount: amount.toString(), blockTime: tx.result.blockTime }
}
