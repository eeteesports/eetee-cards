'use client'
import { createContext, useContext, useState, useEffect } from 'react'

const CartContext = createContext({ items: [], add: () => {}, remove: () => {}, clear: () => {} })

export function CartProvider({ children }) {
  const [items, setItems] = useState([])
  const [hydrated, setHydrated] = useState(false)

  // Load from localStorage after mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('eetee-cart')
      if (saved) setItems(JSON.parse(saved))
    } catch {}
    setHydrated(true)
  }, [])

  function save(newItems) {
    setItems(newItems)
    try { localStorage.setItem('eetee-cart', JSON.stringify(newItems)) } catch {}
  }

  function add(card) {
    setItems((prev) => {
      if (prev.find((i) => i.id === card.id)) return prev
      const next = [...prev, card]
      try { localStorage.setItem('eetee-cart', JSON.stringify(next)) } catch {}
      return next
    })
  }

  function remove(id) {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id)
      try { localStorage.setItem('eetee-cart', JSON.stringify(next)) } catch {}
      return next
    })
  }

  function clear() {
    setItems([])
    try { localStorage.removeItem('eetee-cart') } catch {}
  }

  return (
    <CartContext.Provider value={{ items, add, remove, clear, hydrated }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}
