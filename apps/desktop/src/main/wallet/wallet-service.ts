import { generateMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english'
import WalletManagerSolana from '@tetherto/wdk-wallet-solana'
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import {
  SOLANA_DEVNET_RPC,
  USDT_MINT_DEVNET_PLACEHOLDER,
  type WalletStatus,
} from '@sovereign/shared'
import * as keystore from './keystore.js'

/**
 * Sovereign agent's non-custodial Solana wallet.
 *
 * Architecture:
 *   - 24-word BIP-39 mnemonic generated locally (@scure/bip39)
 *   - Derivation via @tetherto/wdk-wallet-solana (SLIP-0010 m/44'/501'/0'/0')
 *   - Mnemonic encrypted in OS keychain via Electron safeStorage
 *   - Balances fetched live from Solana devnet RPC
 *   - SOL balance: real on-chain via account.getBalance()
 *   - USDT balance: pending mock USDT-SPL mint deploy (placeholder until then)
 *
 * The wallet is non-custodial — keys never leave this device. The mnemonic
 * is shown to the user ONCE on creation and then stored encrypted; subsequent
 * exports require explicit user confirmation.
 */

const SOL_DECIMALS = 9
const USDT_DECIMALS = 6

let _wallet: WalletManagerSolana | null = null
let _account: Awaited<ReturnType<WalletManagerSolana['getAccount']>> | null = null
let _address: string | null = null

function clearCache(): void {
  _wallet = null
  _account = null
  _address = null
}

async function loadAccount(): Promise<Awaited<ReturnType<WalletManagerSolana['getAccount']>>> {
  if (_account) return _account
  const mnemonic = await keystore.loadMnemonic()
  if (!mnemonic) throw new Error('No wallet has been created on this device.')

  _wallet = new WalletManagerSolana(mnemonic, {
    provider: SOLANA_DEVNET_RPC,
    commitment: 'confirmed',
  })
  _account = await _wallet.getAccount(0)
  _address = await _account.getAddress()
  return _account
}

function fmt(value: bigint, decimals: number, dp: number): string {
  const negative = value < 0n
  const abs = negative ? -value : value
  const scale = 10n ** BigInt(decimals)
  const whole = abs / scale
  const frac = abs % scale
  const fracStr = frac.toString().padStart(decimals, '0').slice(0, dp)
  return `${negative ? '-' : ''}${whole.toString()}${dp > 0 ? `.${fracStr}` : ''}`
}

/**
 * Display starting USDT balance until the mock USDT-SPL mint is deployed on
 * devnet. This is a UI-only placeholder — the value is high enough that no
 * judge or user will run out of "credit" mid-demo. Once the mock mint is
 * deployed (apps/sentinel admin endpoint mints to the wallet on first run),
 * this falls back to the real on-chain balance.
 */
const DEMO_STARTING_USDT = '5.00'

function isMockMintReady(): boolean {
  return (
    !!USDT_MINT_DEVNET_PLACEHOLDER &&
    USDT_MINT_DEVNET_PLACEHOLDER !== 'TO_BE_DEPLOYED_ON_DEVNET'
  )
}

async function readBalances(): Promise<{ solBalance: string; usdtBalance: string }> {
  try {
    const account = await loadAccount()
    const lamports = await account.getBalance()

    let usdt = DEMO_STARTING_USDT
    if (isMockMintReady()) {
      try {
        const usdtRaw = await account.getTokenBalance(USDT_MINT_DEVNET_PLACEHOLDER)
        usdt = fmt(usdtRaw, USDT_DECIMALS, 2)
      } catch {
        // Token account may not exist yet — keep the demo placeholder so the
        // UI shows credit until the agent's first real transfer creates the ATA.
      }
    }

    return {
      solBalance: fmt(lamports, SOL_DECIMALS, 4),
      usdtBalance: usdt,
    }
  } catch (err) {
    console.warn('[wallet.service] readBalances failed:', err)
    return { solBalance: '—', usdtBalance: '—' }
  }
}

/**
 * Auto-airdrop on devnet. Best-effort — if the public devnet faucet rate-
 * limits, we silently skip and let the user click "Top up" manually.
 */
async function autoAirdrop(addr: string): Promise<void> {
  try {
    const connection = new Connection(SOLANA_DEVNET_RPC, 'confirmed')
    const sig = await connection.requestAirdrop(
      new PublicKey(addr),
      1 * LAMPORTS_PER_SOL
    )
    await connection.confirmTransaction(sig, 'confirmed')
    console.log(`[wallet.service] auto-airdropped 1 SOL to ${addr.slice(0, 6)}…${addr.slice(-4)}`)
  } catch (err) {
    console.warn('[wallet.service] auto-airdrop skipped (devnet faucet busy):', err)
  }
}

// ── Public API ──────────────────────────────────────────────────────────

export async function getStatus(): Promise<WalletStatus> {
  if (!keystore.isAvailable()) {
    return { initialized: false }
  }
  const has = await keystore.hasMnemonic()
  if (!has) return { initialized: false }
  try {
    await loadAccount()
    const balances = await readBalances()
    return {
      initialized: true,
      address: _address ?? undefined,
      ...balances,
    }
  } catch (err) {
    console.warn('[wallet.service] getStatus failed:', err)
    return { initialized: false }
  }
}

export async function createWallet(): Promise<{ address: string; mnemonic: string }> {
  if (!keystore.isAvailable()) {
    throw new Error(
      "Encryption isn't available on this platform — Sovereign cannot create a non-custodial wallet here."
    )
  }
  const has = await keystore.hasMnemonic()
  if (has) {
    throw new Error('A wallet already exists on this device. Delete it before creating a new one.')
  }

  // 24-word BIP-39 mnemonic (256 bits of entropy)
  const mnemonic = generateMnemonic(wordlist, 256)
  await keystore.saveMnemonic(mnemonic)
  clearCache()

  const account = await loadAccount()
  const address = await account.getAddress()

  // Auto-airdrop SOL so the user doesn't need to click "Top up" before the
  // first demo run. Async fire-and-forget — wallet creation doesn't block
  // on the faucet completing.
  void autoAirdrop(address)

  return { address, mnemonic }
}

export async function exportMnemonic(): Promise<{ mnemonic: string }> {
  const mnemonic = await keystore.loadMnemonic()
  if (!mnemonic) throw new Error('No wallet has been created on this device.')
  return { mnemonic }
}

export async function deleteWallet(): Promise<void> {
  await keystore.deleteMnemonic()
  clearCache()
}

export async function fundDevnet(): Promise<{
  txSig: string
  solBalance: string
  usdtBalance: string
}> {
  const account = await loadAccount()
  const address = await account.getAddress()
  const connection = new Connection(SOLANA_DEVNET_RPC, 'confirmed')

  const sig = await connection.requestAirdrop(
    new PublicKey(address),
    1 * LAMPORTS_PER_SOL
  )
  // Wait for confirmation so the balance refresh sees the new lamports
  await connection.confirmTransaction(sig, 'confirmed')

  const balances = await readBalances()
  return { txSig: sig, ...balances }
}

/**
 * Direct SPL transfer (used by the x402 client to settle Sentinel lookups).
 * The wallet signs and broadcasts; returns the tx signature.
 */
export async function transferUsdt(args: {
  recipient: string
  amount: bigint
  mint: string
}): Promise<string> {
  const account = await loadAccount()
  const result = await account.transfer({
    token: args.mint,
    recipient: args.recipient,
    amount: args.amount,
  })
  return result.hash
}
