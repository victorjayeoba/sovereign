import { Wallet } from 'lucide-react'
import { cn } from '@renderer/lib/cn'

interface WalletStatusProps {
  address?: string
  usdtBalance?: string
  solBalance?: string
  className?: string
}

function truncateAddress(addr: string) {
  if (addr.length <= 10) return addr
  return `${addr.slice(0, 5)}…${addr.slice(-4)}`
}

export function WalletStatus({
  address,
  usdtBalance,
  solBalance,
  className,
}: WalletStatusProps) {
  const initialized = Boolean(address)
  return (
    <div className={cn('glass flex h-full flex-col p-5', className)}>
      <header className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-glass-tint text-text-secondary">
          <Wallet size={14} strokeWidth={1.75} />
        </div>
        <h3 className="font-bricolage text-[14px] font-700 tracking-tight text-text-primary">
          Wallet
        </h3>
      </header>

      <div className="hairline my-4" />

      {!initialized ? (
        <div className="flex flex-1 flex-col justify-end">
          <p className="font-inter text-[13px] text-text-secondary">
            No wallet yet.
          </p>
          <p className="font-instrument text-[10.5px] font-medium tracking-wider uppercase text-text-tertiary mt-1.5">
            Tap Wallet → Create
          </p>
        </div>
      ) : (
        <>
          <div>
            <p className="font-instrument text-[10.5px] font-medium tracking-wider uppercase text-text-tertiary">
              Address
            </p>
            <p className="font-mono text-[12.5px] text-text-primary mt-1.5 truncate">
              {truncateAddress(address!)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-5">
            <div>
              <p className="font-instrument text-[10.5px] font-medium tracking-wider uppercase text-text-tertiary">
                USDT-SPL
              </p>
              <p className="font-bricolage text-[20px] font-700 tracking-tight text-text-primary mt-1">
                {usdtBalance ?? '0.00'}
              </p>
            </div>
            <div>
              <p className="font-instrument text-[10.5px] font-medium tracking-wider uppercase text-text-tertiary">
                SOL
              </p>
              <p className="font-bricolage text-[20px] font-700 tracking-tight text-text-primary mt-1">
                {solBalance ?? '0.0000'}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
