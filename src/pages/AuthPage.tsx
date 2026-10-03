import { useState, type FormEvent } from 'react'
import { HeartPulse, LockKeyhole, Mail } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return

    setBusy(true)
    setError('')
    setMessage('')

    if (mode === 'login') {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) setError('Could not sign in. Check your email and password and try again.')
    } else {
      const { data, error: authError } = await supabase.auth.signUp({ email, password })
      if (authError) {
        setError('Could not create the account. Please try again.')
      } else if (!data.session) {
        setMessage('Account created. Check your email to confirm it, then sign in.')
      }
    }

    setBusy(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 px-5 py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <HeartPulse size={34} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Health Tracker</h1>
          <p className="mt-2 text-base text-slate-600">Simple BP and blood sugar records, always available when you need them.</p>
        </div>

        <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
          <h2 className="text-xl font-bold text-slate-900">{mode === 'login' ? 'Sign in' : 'Create account'}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {mode === 'login' ? 'Your records stay linked to this account.' : 'Create one private account for your health records.'}
          </p>

          <label className="mt-6 block text-sm font-semibold text-slate-700">
            Email
            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
              <Mail size={20} className="text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="min-h-14 w-full bg-transparent text-base text-slate-900 outline-none"
                placeholder="you@example.com"
              />
            </div>
          </label>

          <label className="mt-4 block text-sm font-semibold text-slate-700">
            Password
            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
              <LockKeyhole size={20} className="text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={6}
                required
                className="min-h-14 w-full bg-transparent text-base text-slate-900 outline-none"
                placeholder="At least 6 characters"
              />
            </div>
          </label>

          {error && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
          {message && <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</p>}

          <button
            type="submit"
            disabled={busy}
            className="mt-6 min-h-14 w-full rounded-2xl bg-blue-600 px-5 text-base font-bold text-white shadow-sm disabled:opacity-60"
          >
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login')
              setError('')
              setMessage('')
            }}
            className="mt-4 min-h-12 w-full rounded-2xl text-sm font-semibold text-blue-700"
          >
            {mode === 'login' ? 'First time? Create an account' : 'Already have an account? Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
