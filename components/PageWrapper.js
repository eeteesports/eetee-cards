'use client'
import { usePathname } from 'next/navigation'

// These pages manage their own full-width layout
const FULL_WIDTH = ['/', '/login', '/store']

export default function PageWrapper({ children }) {
  const pathname = usePathname()
  if (FULL_WIDTH.includes(pathname)) return <>{children}</>
  return <div className="max-w-5xl mx-auto">{children}</div>
}
