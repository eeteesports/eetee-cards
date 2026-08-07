import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import Providers from '@/components/Providers'
import PageWrapper from '@/components/PageWrapper'

const inter = Inter({ subsets: ['latin'] })

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
      <body className={`${inter.className} min-h-screen bg-gray-50`}>
        <Providers>
          <Navbar />
          <main><PageWrapper>{children}</PageWrapper></main>
        </Providers>
      </body>
    </html>
  )
}
