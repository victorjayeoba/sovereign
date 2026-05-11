import type { ReactNode } from 'react'

/**
 * Wood-pedestal + tablet asset. The asset's tablet has an empty black screen —
 * we render any children into that rectangle via an absolute overlay.
 *
 * The percentages below are tuned to /pedestal.png. If the asset is swapped,
 * adjust the screen rect numbers to match the new bezel.
 */
export default function Pedestal({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto w-full aspect-[1020/730]">
      <img
        src="/pedestal.png"
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none"
        draggable={false}
      />

      <div
        className="absolute overflow-hidden"
        style={{
          top: '3.5%',
          left: '18.5%',
          width: '63%',
          height: '50%',
          borderRadius: '10px',
        }}
      >
        {children}
      </div>
    </div>
  )
}
