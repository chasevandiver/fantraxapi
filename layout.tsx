import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'War Room 2026', description: 'Fantasy baseball draft assistant' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#0f0f0f', color: '#f0f0f0', minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  )
}
