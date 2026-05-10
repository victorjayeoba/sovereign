import { useEffect, useState } from 'react'
import {
  Coins,
  KeyRound,
  Plus,
  Copy,
  ExternalLink,
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import { GlassCard } from '../GlassCard'
import { cn } from '@renderer/lib/cn'
import { useWalletStore } from '@renderer/store/wallet'

/**
 * Funds view — manages the agent's own non-custodial Solana wallet.
 *
 * All work is delegated to the main process via window.sovereign.wallet.
 * The mnemonic is shown ONCE on creation in a confirmation panel and
 * never persisted to the renderer.
 */
export function FundsView() {
  const initialized = useWalletStore((s) => s.initialized)
  const address = useWalletStore((s) => s.address)
  const usdtBalance = useWalletStore((s) => s.usdtBalance)
  const solBalance = useWalletStore((s) => s.solBalance)
  const loading = useWalletStore((s) => s.loading)
  const freshMnemonic = useWalletStore((s) => s.freshMnemonic)
  const error = useWalletStore((s) => s.error)
  const refresh = useWalletStore((s) => s.refresh)
  const create = useWalletStore((s) => s.create)
  const fundDevnet = useWalletStore((s) => s.fundDevnet)
  const clearFreshMnemonic = useWalletStore((s) => s.clearFreshMnemonic)

  // Refresh on mount + every 30s while wallet is initialized
  useEffect(() => {
    void refresh()
    const id = setInterval(() => {
      if (useWalletStore.getState().initialized) void refresh()
    }, 30_000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main className="flex-1 flex flex-col gap-4 overflow-hidden">
      <header className="shrink-0">
        <p className="font-instrument text-[10.5px] font-medium tracking-[0.12em] text-text-tertiary uppercase">
          Agent Wallet
        </p>
        <h2 className="font-bricolage text-[26px] font-700 tracking-tight text-text-primary mt-1">
          Funds.
          <span className="text-text-tertiary"> The agent pays for its own work.</span>
        </h2>
      </header>

      {error && (
        <div className="glass border-l-2 border-l-flag-red flex items-center gap-3 px-4 py-3 shrink-0">
          <AlertTriangle size={14} strokeWidth={1.75} className="text-flag-red shrink-0" />
          <p className="font-inter text-[12.5px] text-text-primary flex-1">{error}</p>
        </div>
      )}

      {/* Mnemonic-shown-once panel */}
      {freshMnemonic && (
        <FreshMnemonicPanel
          mnemonic={freshMnemonic}
          onAcknowledge={clearFreshMnemonic}
        />
      )}

      <div className="flex-1 grid grid-cols-12 grid-rows-[1fr_1fr] gap-4 min-h-0">
        {/* Wallet identity (col-span-8 row-1) */}
        <GlassCard className="col-span-8 row-span-1 flex flex-col p-6 min-h-0">
          {!initialized ? (
            <CreateWalletPanel
              onCreate={() => void create()}
              loading={loading}
            />
          ) : (
            <WalletIdentityPanel address={address} />
          )}
        </GlassCard>

        {/* Balance (col-span-4 row-1) */}
        <GlassCard className="col-span-4 row-span-1 flex flex-col p-6 min-h-0">
          <header className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-glass-tint text-text-secondary">
              <Coins size={14} strokeWidth={1.75} />
            </div>
            <h3 className="font-bricolage text-[14px] font-700 tracking-tight text-text-primary">
              Balance
            </h3>
          </header>
          <div className="hairline my-4" />
          <div className="flex flex-col gap-5 flex-1">
            <BalanceRow
              label="USDT-SPL"
              amount={initialized ? usdtBalance ?? '0.00' : '0.00'}
              note="for verifications"
            />
            <BalanceRow
              label="SOL"
              amount={initialized ? solBalance ?? '0.0000' : '0.0000'}
              note="for tx fees"
            />
          </div>
          <div className="hairline mb-3" />
          <button
            type="button"
            disabled={!initialized || loading}
            onClick={() => void fundDevnet()}
            className={cn(
              'flex items-center justify-center gap-2 px-3 py-2 rounded-lg',
              'glass glass-hover transition-colors duration-200',
              (!initialized || loading) && 'opacity-40 cursor-not-allowed'
            )}
          >
            {loading ? (
              <Loader2 size={13} strokeWidth={2} className="text-cyan animate-spin" />
            ) : (
              <Plus size={13} strokeWidth={2} className="text-cyan" />
            )}
            <span className="font-instrument text-[10.5px] font-medium tracking-[0.14em] uppercase text-text-secondary">
              {loading ? 'Working…' : 'Top up · devnet faucet'}
            </span>
          </button>
        </GlassCard>

        {/* Activity (col-span-12 row-2) */}
        <GlassCard className="col-span-12 row-span-1 flex flex-col min-h-0">
          <header className="flex items-center justify-between px-5 pt-4 pb-3">
            <h3 className="font-bricolage text-[14px] font-700 tracking-tight text-text-primary">
              Recent Activity
            </h3>
            <span className="font-instrument text-[10.5px] font-medium tracking-wider uppercase text-text-tertiary">
              {initialized ? 'on-chain · solana devnet' : 'no activity'}
            </span>
          </header>
          <div className="hairline mx-5" />
          <div className="flex-1 overflow-y-auto px-5 py-3">
            <p className="font-inter text-[12.5px] text-text-secondary leading-relaxed">
              {initialized
                ? 'Every USDT-SPL payment the agent makes — for OFAC checks, mixer checks, future intelligence sources — settles on Solana Devnet and lands here as a verifiable transaction. Activity-ledger fetcher wires up when the x402 client lands.'
                : 'Create a wallet to begin. Once funded, every autonomous USDT-SPL payment will land here as a verifiable on-chain transaction.'}
            </p>
          </div>
        </GlassCard>
      </div>
    </main>
  )
}

// ── Fresh-mnemonic confirmation panel ──────────────────────────────────

function FreshMnemonicPanel({
  mnemonic,
  onAcknowledge,
}: {
  mnemonic: string
  onAcknowledge: () => void
}) {
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)
  const words = mnemonic.split(/\s+/).filter(Boolean)

  return (
    <div className="glass shrink-0 border-l-2 border-l-cyan p-5">
      <header className="flex items-center gap-2.5 mb-3">
        <ShieldCheck size={14} strokeWidth={1.75} className="text-cyan" />
        <h3 className="font-bricolage text-[14px] font-700 tracking-tight text-text-primary">
          Save this recovery phrase
        </h3>
        <span className="font-instrument text-[10px] font-medium tracking-wider uppercase text-cyan ml-auto">
          shown once
        </span>
      </header>
      <p className="font-inter text-[12.5px] text-text-secondary leading-relaxed mb-3">
        Write down or screenshot these 24 words and store them somewhere safe.
        They restore your wallet if Sovereign is uninstalled. After you click
        "I've saved it" they will not be shown again.
      </p>

      <div
        className={cn(
          'glass grid grid-cols-4 gap-2 p-3 transition-all duration-200',
          !revealed && 'blur-sm select-none'
        )}
      >
        {words.map((word, i) => (
          <div
            key={i}
            className="flex items-baseline gap-1.5 px-2 py-1 rounded-md bg-glass-tint"
          >
            <span className="font-instrument text-[9px] font-medium tracking-wider uppercase text-text-quaternary w-5 shrink-0">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="font-mono text-[12px] text-text-primary truncate">
              {word}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mt-3">
        <button
          type="button"
          onClick={() => setRevealed((r) => !r)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md glass glass-hover transition-colors"
        >
          {revealed ? (
            <EyeOff size={11} strokeWidth={1.75} className="text-cyan" />
          ) : (
            <Eye size={11} strokeWidth={1.75} className="text-cyan" />
          )}
          <span className="font-instrument text-[10px] font-medium tracking-wider uppercase text-text-secondary">
            {revealed ? 'Hide' : 'Reveal'}
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(mnemonic)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md glass glass-hover transition-colors"
        >
          <Copy size={11} strokeWidth={1.75} className="text-cyan" />
          <span className="font-instrument text-[10px] font-medium tracking-wider uppercase text-text-secondary">
            {copied ? 'Copied' : 'Copy'}
          </span>
        </button>
        <button
          type="button"
          onClick={onAcknowledge}
          className={cn(
            'ml-auto flex items-center gap-2 px-3.5 py-1.5 rounded-md',
            'glass glass-hover',
            'border border-cyan/40 hover:border-cyan/70 text-cyan transition-colors duration-200'
          )}
        >
          <ShieldCheck size={11} strokeWidth={1.75} />
          <span className="font-instrument text-[10px] font-medium tracking-[0.14em] uppercase">
            I've saved it
          </span>
        </button>
      </div>
    </div>
  )
}

// ── Panels ────────────────────────────────────────────────────────────

function CreateWalletPanel({
  onCreate,
  loading,
}: {
  onCreate: () => void
  loading: boolean
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center flex-1 gap-5 py-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-glass-tint text-cyan">
        {loading ? (
          <Loader2 size={22} strokeWidth={1.5} className="animate-spin" />
        ) : (
          <KeyRound size={22} strokeWidth={1.5} />
        )}
      </div>
      <div>
        <h3 className="font-bricolage text-[20px] font-700 tracking-tight text-text-primary">
          No agent wallet yet.
        </h3>
        <p className="font-inter text-[13px] text-text-secondary mt-2 max-w-[420px]">
          Sovereign will generate a non-custodial Solana wallet on this device
          via Tether's WDK. The 24-word recovery phrase is encrypted in your
          OS keychain — the agent signs USDT-SPL payments without asking you
          each time.
        </p>
      </div>
      <button
        type="button"
        onClick={onCreate}
        disabled={loading}
        className={cn(
          'mt-2 flex items-center gap-2.5 px-5 py-2.5 rounded-lg',
          'glass glass-hover',
          'border border-cyan/40 hover:border-cyan/70',
          'text-cyan transition-colors duration-200',
          loading && 'opacity-50 cursor-wait'
        )}
      >
        <ShieldCheck size={14} strokeWidth={1.75} />
        <span className="font-instrument text-[11px] font-medium tracking-[0.16em] uppercase">
          {loading ? 'Creating wallet…' : 'Create non-custodial wallet'}
        </span>
      </button>
      <p className="font-instrument text-[10px] font-medium tracking-wider uppercase text-text-quaternary">
        Solana devnet · keys never leave this machine
      </p>
    </div>
  )
}

function WalletIdentityPanel({ address }: { address: string | null }) {
  const [copied, setCopied] = useState(false)
  const onCopy = () => {
    if (!address) return
    void navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <>
      <header className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-100 text-cyan">
          <KeyRound size={14} strokeWidth={1.75} />
        </div>
        <h3 className="font-bricolage text-[14px] font-700 tracking-tight text-text-primary">
          Agent Wallet
        </h3>
        <span className="font-instrument text-[10.5px] font-medium tracking-wider uppercase text-cyan ml-auto">
          devnet · BIP-39
        </span>
      </header>
      <div className="hairline my-4" />

      <p className="font-instrument text-[10.5px] font-medium tracking-[0.14em] uppercase text-text-tertiary">
        Address
      </p>
      <div className="flex items-center gap-2 mt-1.5">
        <span className="font-mono text-[13px] text-text-primary truncate flex-1">
          {address ?? '—'}
        </span>
        {address && (
          <>
            <button
              type="button"
              onClick={onCopy}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md glass glass-hover transition-colors"
            >
              <Copy size={11} strokeWidth={1.75} className="text-cyan" />
              <span className="font-instrument text-[9.5px] font-medium tracking-wider uppercase text-text-secondary">
                {copied ? 'copied' : 'copy'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                const url = `https://explorer.solana.com/address/${address}?cluster=devnet`
                void window.sovereign.app.openExternal(url)
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md glass glass-hover transition-colors"
            >
              <ExternalLink size={11} strokeWidth={1.75} className="text-cyan" />
              <span className="font-instrument text-[9.5px] font-medium tracking-wider uppercase text-text-secondary">
                Explorer
              </span>
            </button>
          </>
        )}
      </div>

      <div className="hairline my-5" />

      <div className="grid grid-cols-3 gap-5 text-[12px]">
        <div>
          <p className="font-instrument text-[10px] font-medium tracking-wider uppercase text-text-tertiary">
            Derivation
          </p>
          <p className="font-mono text-[11.5px] text-text-primary mt-1.5">
            m/44&apos;/501&apos;/0&apos;
          </p>
        </div>
        <div>
          <p className="font-instrument text-[10px] font-medium tracking-wider uppercase text-text-tertiary">
            Network
          </p>
          <p className="font-inter text-[12px] text-text-primary mt-1.5">
            Solana Devnet
          </p>
        </div>
        <div>
          <p className="font-instrument text-[10px] font-medium tracking-wider uppercase text-text-tertiary">
            Mnemonic
          </p>
          <p className="font-inter text-[12px] text-text-primary mt-1.5">
            OS Keychain
          </p>
        </div>
      </div>
    </>
  )
}

function BalanceRow({
  label,
  amount,
  note,
}: {
  label: string
  amount: string
  note: string
}) {
  return (
    <div>
      <p className="font-instrument text-[10px] font-medium tracking-[0.16em] uppercase text-text-tertiary">
        {label}
      </p>
      <p className="font-bricolage text-[28px] font-700 tracking-tight text-text-primary mt-1 leading-none">
        {amount}
      </p>
      <p className="font-instrument text-[10px] font-medium tracking-wider uppercase text-text-quaternary mt-1.5">
        {note}
      </p>
    </div>
  )
}
