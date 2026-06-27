import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import Providers from '@/components/Providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'eetee Sports',
  description: 'My Card Collection — All In One Place',
  icons: {
    icon: 'https://res.cloudinary.com/dgfukcdmz/image/upload/eetee-cards/eetee-logo.png',
    apple: 'https://res.cloudinary.com/dgfukcdmz/image/upload/eetee-cards/eetee-logo.png',
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
          <main className="max-w-5xl mx-auto">{children}</main>
        </Providers>
      </body>
    </html>
  )
}
