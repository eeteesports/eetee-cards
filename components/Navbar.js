'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCart } from '@/contexts/CartContext'

export default function Navbar() {
  const pathname = usePathname()
  const { items } = useCart()
  const cartCount = items.length

  const links = [
    { href: '/',           label: 'Dashboard',  icon: '📈' },
    { href: '/collection', label: 'Collection', icon: '📊' },
    { href: '/store',      label: 'Store',      icon: '🏷️' },
    { href: '/scout',      label: 'Scout',      icon: '🔭' },
    { href: '/add',        label: 'Add Card',   icon: '➕' },
  ]

  return (
    <nav className="bg-[#0f1b35] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40">
      <Link href="/" className="flex items-center gap-2 flex-shrink-0">
        <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-xs font-black">ET</div>
        <span className="font-black text-lg tracking-widest uppercase hidden sm:block">eetee Sports</span>
      </Link>

      <div className="flex gap-1 items-center">
        {/* Desktop: icon + label */}
        {links.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className={`px-3 py-2 rounded-lg text-sm font-medium hidden lg:flex items-center gap-1 transition-colors ${
              pathname === href ? 'bg-blue-600 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <span>{icon}</span> {label}
          </Link>
        ))}

        {/* Tablet: icons only */}
        {links.map(({ href, icon, label }) => (
          <Link
            key={`t-${href}`}
            href={href}
            title={label}
            className={`p-2 rounded-lg text-lg hidden sm:flex lg:hidden transition-colors ${
              pathname === href ? 'bg-blue-600' : 'hover:bg-white/10'
            }`}
          >
            {icon}
          </Link>
        ))}

        {/* Mobile: condensed icons */}
        {[
          { href: '/',           icon: '📈' },
          { href: '/collection', icon: '📊' },
          { href: '/store',      icon: '🏷️' },
          { href: '/add',        icon: '➕' },
        ].map(({ href, icon }) => (
          <Link
            key={`m-${href}`}
            href={href}
            className={`p-2 rounded-lg text-lg sm:hidden transition-colors ${
              pathname === href ? 'bg-blue-600' : 'hover:bg-white/10'
            }`}
          >
            {icon}
          </Link>
        ))}

        {/* Cart */}
        <Link
          href="/cart"
          title="Your cart"
          className={`relative ml-1 p-2 rounded-lg transition-colors ${
            pathname === '/cart' ? 'bg-green-600' : 'hover:bg-white/10'
          }`}
        >
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
