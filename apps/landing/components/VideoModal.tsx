'use client'

import { useEffect, useRef } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Cancel01Icon } from '@hugeicons/core-free-icons'

interface VideoModalProps {
  videoId: string
  isOpen: boolean
  onClose: () => void
}

export default function VideoModal({ videoId, isOpen, onClose }: VideoModalProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    closeBtnRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sovereign product demo video"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 sm:px-8"
      style={{
        background: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(18px) saturate(140%)',
        WebkitBackdropFilter: 'blur(18px) saturate(140%)',
        animation: 'fadeIn 220ms ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full"
        style={{
          maxWidth: 'min(1180px, 92vw)',
          animation: 'fadeInUp 320ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <button
          ref={closeBtnRef}
          onClick={onClose}
          aria-label="Close video"
          className="absolute -top-12 right-0 sm:-top-14 flex items-center justify-center rounded-full transition-transform duration-200 hover:scale-105"
          style={{
            width: 40,
            height: 40,
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <HugeiconsIcon
            icon={Cancel01Icon}
            size={18}
            strokeWidth={2}
            color="rgba(255, 255, 255, 0.95)"
          />
        </button>

        <div
          className="relative w-full overflow-hidden rounded-glass"
          style={{
            aspectRatio: '16 / 9',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            boxShadow:
              '0 40px 120px -20px rgba(0, 209, 255, 0.25), 0 0 0 1px rgba(0, 209, 255, 0.08) inset',
          }}
        >
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
            title="Sovereign demo"
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  )
}
