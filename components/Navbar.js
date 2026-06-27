'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCart } from '@/contexts/CartContext'

export default function Navbar() {
  const pathname = usePathname()
  const { items } = useCart()
  const cartCount = items.length
  const [addOpen, setAddOpen] = useState(false)
  const addRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (addRef.current && !addRef.current.contains(e.target)) setAddOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Close on route change
  useEffect(() => { setAddOpen(false) }, [pathname])

  const links = [
    { href: '/',           label: 'Dashboard',  icon: '📈' },
    { href: '/collection', label: 'Collection', icon: '📊' },
    { href: '/store',      label: 'Store',      icon: '🏷️' },
    { href: '/scout',      label: 'Scout',      icon: '🔭' },
    { href: '/tools',      label: 'Tools',      icon: '🛠️' },
  ]

  const isAddActive = pathname === '/add' || pathname === '/bulk-add'

  return (
    <nav className="bg-[#0f1b35] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40">
      <Link href="/" className="flex items-center gap-2 flex-shrink-0">
        <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-xs font-black">ET</div>
        <span className="font-black text-lg tracking-widest uppercase hidden sm:block">eetee Sports</span>
      </Link>

      <div className="flex gap-1 items-center">
        {/* Desktop: icon + label */}
        {links.map(({ href, label, icon }) => (
          <Link key={href} href={href}
            className={`px-3 py-2 rounded-lg text-sm font-medium hidden lg:flex items-center gap-1 transition-colors ${
              pathname === href ? 'bg-blue-600 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}>
            <span>{icon}</span> {label}
          </Link>
        ))}

        {/* Tablet: icons only */}
        {links.map(({ href, icon, label }) => (
          <Link key={`t-${href}`} href={href} title={label}
            className={`p-2 rounded-lg text-lg hidden sm:flex lg:hidden transition-colors ${
              pathname === href ? 'bg-blue-600' : 'hover:bg-white/10'
            }`}>
            {icon}
          </Link>
        ))}

        {/* Mobile: condensed icons */}
        {[
          { href: '/',           icon: '📈' },
          { href: '/collection', icon: '📊' },
          { href: '/tools',      icon: '🛠️' },
        ].map(({ href, icon }) => (
          <Link key={`m-${href}`} href={href}
            className={`p-2 rounded-lg text-lg sm:hidden transition-colors ${
              pathname === href ? 'bg-blue-600' : 'hover:bg-white/10'
            }`}>
            {icon}
          </Link>
        ))}

        {/* ── Add Card split button ── */}
        <div ref={addRef} className="relative ml-1">
          {/* Desktop: label + chevron */}
          <div className={`hidden lg:flex items-center rounded-lg overflow-hidden border ${isAddActive ? 'border-blue-400' : 'border-white/20'}`}>
            <Link href="/add"
              className={`px-3 py-2 text-sm font-medium flex items-center gap-1 transition-colors ${
                pathname === '/add' ? 'bg-blue-600 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}>
              <span>➕</span> Add Card
            </Link>
            <button onClick={() => setAddOpen(o => !o)}
              className={`px-2 py-2 text-xs border-l border-white/20 transition-colors ${
                addOpen ? 'bg-white/20 text-white' : 'text-white/50 hover:bg-white/10 hover:text-white'
              }`}
              title="Batch upload">
              {addOpen ? '▲' : '▼'}
            </button>
          </div>

          {/* Tablet: icon + chevron */}
          <div className={`hidden sm:flex lg:hidden items-center rounded-lg overflow-hidden border ${isAddActive ? 'border-blue-400' : 'border-white/20'}`}>
            <Link href="/add" title="Add single card"
              className={`p-2 text-lg transition-colors ${pathname === '/add' ? 'bg-blue-600' : 'hover:bg-white/10'}`}>
              ➕
            </Link>
            <button onClick={() => setAddOpen(o => !o)}
              className={`px-1.5 py-2 text-[10px] border-l border-white/20 transition-colors ${addOpen ? 'bg-white/20' : 'text-white/50 hover:bg-white/10'}`}>
              {addOpen ? '▲' : '▼'}
            </button>
          </div>

          {/* Mobile: just the ➕ icon (opens dropdown) */}
          <button onClick={() => setAddOpen(o => !o)}
            className={`sm:hidden p-2 rounded-lg text-lg transition-colors ${isAddActive || addOpen ? 'bg-blue-600' : 'hover:bg-white/10'}`}>
            ➕
          </button>

          {/* Dropdown */}
          {addOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
              <Link href="/add"
                className={`flex items-center gap-3 px-4 py-3 text-sm hover:bg-blue-50 transition-colors ${pathname === '/add' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-800'}`}>
                <span className="text-xl">🃏</span>
                <div>
                  <p className="font-bold text-sm leading-tight">Single Card</p>
                  <p className="text-xs text-gray-400">Voice + photo, one at a time</p>
                </div>
              </Link>
              <div className="border-t border-gray-100" />
              <Link href="/bulk-add"
                className={`flex items-center gap-3 px-4 py-3 text-sm hover:bg-blue-50 transition-colors ${pathname === '/bulk-add' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-800'}`}>
                <span className="text-xl">📦</span>
                <div>
                  <p className="font-bold text-sm leading-tight">Batch Upload</p>
                  <p className="text-xs text-gray-400">Shoot many cards, review all at once</p>
                </div>
              </Link>
            </div>
          )}
        </div>

        {/* Cart */}
        <Link href="/cart" title="Your cart"
          className={`relative ml-1 p-2 rounded-lg transition-colors ${
            pathname === '/cart' ? 'bg-green-600' : 'hover:bg-white/10'
          }`}>
          <span className="text-lg">🛒</span>
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs font-black w-5 h-5 rounded-full flex items-center justify-center leading-none">
              {cartCount}
            </span>
          )}
        </Link>
      </div>
    </nav>
  )
}
