'use client'
import FixCardHost from './FixCardHost'
import { SessionProvider } from 'next-auth/react'
import { CartProvider } from '@/contexts/CartContext'

export default function Providers({ children }) {
  return (
    <SessionProvider>
      <CartProvider>{children}<FixCardHost/></CartProvider>
    </SessionProvider>
  )
}
