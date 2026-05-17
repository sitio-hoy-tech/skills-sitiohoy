import type { Metadata } from 'next'
import { Inter, Fraunces } from 'next/font/google'
import '@/styles/tokens.css'
import './globals.css'

const display = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
})

const body = Inter({
  subsets: ['latin'],
  variable: '--font-body',
})

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_SITE_NAME ?? 'SitioHoy',
  description: 'Sitio web creado con SitioHoy.',
  metadataBase: process.env.NEXT_PUBLIC_URL ? new URL(process.env.NEXT_PUBLIC_URL) : undefined,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  )
}
