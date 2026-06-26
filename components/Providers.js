'use client'
import { CartProvider } from '@/contexts/CartContext'

export default function Providers({ children }) {
  return <CartProvider>{children}</CartProvider>
}
