import type { Metadata } from 'next'

import './globals.css'

export const metadata: Metadata = {
  title: 'Roadtrip Planner',
  description: 'Visual timeline planner for multi-day road trips.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
