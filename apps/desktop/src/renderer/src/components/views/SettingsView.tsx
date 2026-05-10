import {
  Settings as SettingsIcon,
  Cpu,
  Network,
  Lock,
  ExternalLink,
  AlertTriangle,
  X,
} from 'lucide-react'
import { GlassCard } from '../GlassCard'
import { cn } from '@renderer/lib/cn'
import { useSettingsStore } from '@renderer/store/settings'

/**
 * Settings view — persisted via Zustand + localStorage.
 *
 * Mainnet is locked at the store level: even if a renderer hack triggers
 * `setSolanaNetwork('mainnet')`, the store coerces it back to `devnet`.
 * This is deliberate — Sovereign ships a mock USDT mint on devnet and never
 * touches real funds in this build.
 */
export function SettingsView() {
  const qvacBackend = useSettingsStore((s) => s.qvacBackend)
  const solanaNetwork = useSettingsStore((s) => s.solanaNetwork)
  const restartNeeded = useSettingsStore((s) => s.qvacBackendRequiresRestart)
  const setQvacBackend = useSettingsStore((s) => s.setQvacBackend)
  const acknowledgeRestart = useSettingsStore((s) => s.acknowledgeRestart)

  return (
    <main className="flex-1 flex flex-col gap-4 overflow-hidden">
      <header className="shrink-0">
        <p className="font-instrument text-[10.5px] font-medium tracking-[0.12em] text-text-tertiary uppercase">
          Configuration
        </p>
        <h2 className="font-bricolage text-[26px] font-700 tracking-tight text-text-primary mt-1">
          Settings.
          <span className="text-text-tertiary"> Tune Sovereign's runtime.</span>
        </h2>
      </header>

      {/* Restart-required banner */}
      {restartNeeded && (
        <div className="glass border-l-2 border-l-cyan flex items-center gap-3 px-4 py-3">
          <AlertTriangle size={14} strokeWidth={1.75} className="text-cyan shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-inter text-[12.5px] font-medium text-text-primary">
              Restart Sovereign for the QVAC backend change to take effect.
            </p>
            <p className="font-instrument text-[10px] font-medium tracking-wider uppercase text-text-tertiary mt-0.5">
              Models load at app boot
            </p>
          </div>
          <button
            type="button"
            onClick={acknowledgeRestart}
            className="flex h-6 w-6 items-center justify-center rounded-md text-text-tertiary hover:text-text-primary transition-colors"
            aria-label="Dismiss"
          >
            <X size={14} strokeWidth={1.75} />
          </button>
        </div>
      )}

      <div className="flex-1 grid grid-cols-12 grid-rows-[auto_auto_1fr] gap-4 min-h-0 overflow-y-auto">
        {/* QVAC backend */}
        <GlassCard className="col-span-6 p-6 flex flex-col gap-4">
          <SectionHeader icon={Cpu} title="Inference Backend" />
          <p className="font-inter text-[12.5px] text-text-secondary leading-relaxed">
            Choose which QVAC backend powers on-device AI. Mock is fast and
            deterministic for dev. Real loads the actual @qvac/sdk models —
            recommended on Mac M-series with Metal.
          </p>
          <ToggleRow
            options={[
              { key: 'mock', label: 'Mock', detail: '~1.5s warm · placeholder data' },
              { key: 'real', label: 'Real (@qvac/sdk)', detail: '~1.4 GB models · Metal/Vulkan' },
            ]}
            value={qvacBackend}
            onChange={(v) => setQvacBackend(v as 'mock' | 'real')}
          />
        </GlassCard>

        {/* Network — mainnet locked */}
        <GlassCard className="col-span-6 p-6 flex flex-col gap-4">
          <SectionHeader icon={Network} title="Solana Network" />
          <p className="font-inter text-[12.5px] text-text-secondary leading-relaxed">
            Sovereign settles every verification in USDT-SPL. This build runs
            exclusively on Devnet — the mock USDT mint we deployed never touches
            real funds.
          </p>
          <ToggleRow
            options={[
              { key: 'devnet', label: 'Devnet', detail: 'free · mock USDT mint · default' },
              {
                key: 'mainnet',
                label: 'Mainnet',
                detail: 'locked · real USDT-SPL is mainnet-only',
                disabled: true,
              },
            ]}
            value={solanaNetwork}
            onChange={() => {
              /* setSolanaNetwork is intentionally a no-op for mainnet — store coerces */
            }}
          />
          <p className="font-instrument text-[10px] font-medium tracking-wider uppercase text-text-quaternary">
            Mainnet disabled in this build · safety lock
          </p>
        </GlassCard>

        {/* Security */}
        <GlassCard className="col-span-12 p-6 flex flex-col gap-4">
          <SectionHeader icon={Lock} title="Security" />
          <div className="grid grid-cols-3 gap-6">
            <KeyValue
              label="Mnemonic storage"
              value="OS Keychain"
              note="keytar · falls back to electron safeStorage"
            />
            <KeyValue
              label="Renderer sandbox"
              value="contextIsolation"
              note="nodeIntegration: false"
            />
            <KeyValue
              label="Document privacy"
              value="100% local"
              note="never sent to any cloud"
            />
          </div>
        </GlassCard>

        {/* About / links */}
        <GlassCard className="col-span-12 p-6 flex flex-col gap-4">
          <SectionHeader icon={SettingsIcon} title="About" />
          <div className="grid grid-cols-3 gap-6">
            <KeyValue label="Version" value="0.1.0" note="Colosseum Frontier · QVAC track" />
            <KeyValue label="Build" value="devnet-mock" note="May 2026" />
            <KeyValue label="License" value="MIT" />
          </div>
          <div className="flex items-center gap-3 mt-2">
            <ExternalLinkButton
              label="GitHub"
              url="https://github.com/victorjayeoba/sovereign"
            />
            <ExternalLinkButton
              label="QVAC docs"
              url="https://docs.qvac.tether.io"
            />
            <ExternalLinkButton
              label="WDK docs"
              url="https://docs.wdk.tether.io"
            />
          </div>
        </GlassCard>
      </div>
    </main>
  )
}

// ── Building blocks ────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: typeof Cpu
  title: string
}) {
  return (
    <header className="flex items-center gap-2.5">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-glass-tint text-text-secondary">
        <Icon size={13} strokeWidth={1.75} />
      </div>
      <h3 className="font-bricolage text-[14px] font-700 tracking-tight text-text-primary">
        {title}
      </h3>
    </header>
  )
}

interface ToggleOption {
  key: string
  label: string
  detail: string
  disabled?: boolean
}

function ToggleRow({
  options,
  value,
  onChange,
}: {
  options: ToggleOption[]
  value: string
  onChange: (key: string) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((opt) => {
        const active = opt.key === value
        const disabled = opt.disabled === true
        return (
          <button
            key={opt.key}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange(opt.key)}
            className={cn(
              'flex flex-col items-start gap-1 p-3 rounded-lg text-left',
              'glass transition-colors duration-200',
              disabled && 'opacity-50 cursor-not-allowed',
              !disabled && !active && 'hover:border-glass-borderStrong',
              active && 'border-cyan/60'
            )}
            style={
              active
                ? { boxShadow: '0 0 0 1px rgba(0, 209, 255, 0.4)' }
                : undefined
            }
          >
            <div className="flex items-center gap-2 w-full">
              <span
                className={cn(
                  'font-inter text-[12.5px] font-medium tracking-tight',
                  disabled
                    ? 'text-text-tertiary'
                    : active
                    ? 'text-cyan'
                    : 'text-text-primary'
                )}
              >
                {opt.label}
              </span>
              {disabled && (
                <Lock size={10} strokeWidth={1.75} className="text-text-quaternary ml-auto" />
              )}
            </div>
            <span className="font-instrument text-[10px] font-medium tracking-wider uppercase text-text-tertiary">
              {opt.detail}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function KeyValue({
  label,
  value,
  note,
}: {
  label: string
  value: string
  note?: string
}) {
  return (
    <div>
      <p className="font-instrument text-[10px] font-medium tracking-[0.14em] uppercase text-text-tertiary">
        {label}
      </p>
      <p className="font-inter text-[13px] font-medium text-text-primary mt-1">
        {value}
      </p>
      {note && (
        <p className="font-instrument text-[10px] font-medium tracking-wider uppercase text-text-quaternary mt-0.5">
          {note}
        </p>
      )}
    </div>
  )
}

function ExternalLinkButton({ label, url }: { label: string; url: string }) {
  return (
    <button
      type="button"
      onClick={() => void window.sovereign.app.openExternal(url)}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg',
        'glass glass-hover transition-colors duration-200'
      )}
    >
      <span className="font-instrument text-[10.5px] font-medium tracking-[0.14em] uppercase text-text-secondary">
        {label}
      </span>
      <ExternalLink size={11} strokeWidth={1.75} className="text-cyan" />
    </button>
  )
}
