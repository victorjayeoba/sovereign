import type { Metadata } from 'next'
import { Bricolage_Grotesque, Inter, Instrument_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const instrument = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-instrument',
  weight: ['400', '500', '600'],
  display: 'swap',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Sovereign — Forensic AI that pays its own way',
  description:
    'Local QVAC inference and autonomous USDT-SPL settlement. Built for investigators who cannot send their documents to the cloud.',
  metadataBase: new URL('https://sovereign.local'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${inter.variable} ${instrument.variable} ${jetbrains.variable}`}
    >
      <body className="font-inter antialiased">{children}</body>
    </html>
  )
}
