'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await signIn('credentials', {
      password,
      redirect: false,
    })
    if (result?.ok) {
      router.push('/dashboard')
    } else {
      setError('Wrong password. Try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f1b35] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Branding */}
        <div className="flex flex-col items-center mb-10">
          <img
            src="https://res.cloudinary.com/dgfukcdmz/image/upload/eetee-cards/eetee-logo.png"
            alt="eetee Sports"
            className="w-24 h-24 rounded-full object-cover mb-4 ring-4 ring-white/20"
          />
          <h1 className="text-white font-black text-3xl tracking-widest uppercase">eetee Sports</h1>
          <p className="text-blue-300 text-sm mt-1">Card Collection Manager</p>
        </div>

        {/* Login card */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-2xl space-y-4">
          <h2 className="font-black text-gray-900 text-lg">Admin Login</h2>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoFocus
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 mt-1 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm font-medium bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>

        <p className="text-center mt-6">
          <a href="/" className="text-blue-400 hover:text-blue-300 text-sm transition-colors">
            ← Back to store
          </a>
        </p>
      </div>
    </div>
  )
}
