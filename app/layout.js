import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import Providers from '@/components/Providers'
import PageWrapper from '@/components/PageWrapper'

// Two-font system (2026-08-17 brand refresh): Space Grotesk carries
// headings/wordmark/prices — a confident geometric sans with enough
// character to read as a real brand instead of default-template Arial/
// Inter-everywhere. Inter stays for body copy — it's genuinely good at
// that job, no reason to replace it. Both exposed as CSS variables so any
// component can opt into the display face via font-display / font-sans.
const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-display' })

export const metadata = {
  title: 'eetee Cards',
  description: 'A personal sports card collection — browse, buy, and make offers.',
  icons: {
    icon: '/eetee-logo.png',
    apple: '/eetee-logo.png',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans min-h-screen bg-gray-50`}>
        <Providers>
          <Navbar />
          <main><PageWrapper>{children}</PageWrapper></main>
        </Providers>
      </body>
    </html>
  )
}
