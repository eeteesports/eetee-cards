'use client'
import OwnerWorkspace from './OwnerWorkspace'
import FixCardHost from './FixCardHost'
import { SessionProvider } from 'next-auth/react'
import { CartProvider } from '@/contexts/CartContext'

export default function Providers({ children }) {
  return (
    <SessionProvider>
      <CartProvider><OwnerWorkspace>{children}</OwnerWorkspace><FixCardHost/></CartProvider>
    </SessionProvider>
  )
}
