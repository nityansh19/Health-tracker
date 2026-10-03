import { useEffect, useState, type FormEvent } from 'react'
import { LogOut, Save, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getProfile, saveProfile } from '../services/profile'

export default function SettingsPage() {
  const [name, setName] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [doctorName, setDoctorName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    getProfile()
      .then((profile) => {
        if (!profile) return
        setName(profile.name || '')
        setDateOfBirth(profile.date_of_birth || '')
        setDoctorName(profile.doctor_name || '')
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load your profile."))
      .finally(() => setLoading(false))
  }, [])

  async function submitProfile(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await saveProfile({
        name: name.trim(),
        date_of_birth: dateOfBirth || null,
        doctor_name: doctorName.trim() || null
      })
      setMessage('Profile saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your profile.")
    } finally {
      setSaving(false)
    }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault()
    if (!supabase || newPassword.length < 6) {
      setError('New password must be at least 6 characters.')
      return
    }

    setSaving(true)
    setError('')
    setMessage('')
    const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword })
    setSaving(false)

    if (passwordError) {
      setError("Couldn't change the password. Please try again.")
      return
    }

    setNewPassword('')
    setMessage('Password changed successfully.')
  }

  async function logout() {
    if (!supabase) return
    await supabase.auth.signOut()
  }

  return (
    <div className="px-5 pb-5 pt-6">
      <header>
        <p className="text-sm font-semibold text-blue-700">Simple account settings</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Profile & Settings</h1>
        <p className="mt-1 text-base text-slate-600">Only the details needed for your records and reports.</p>
      </header>

      {error && <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
      {message && <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div>}

      <form onSubmit={submitProfile} className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
        <h2 className="text-lg font-bold text-slate-900">Patient Details</h2>
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Loading profile…</p>
        ) : (
          <div className="mt-4 space-y-4">
            <Field label="Name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-14 w-full bg-transparent px-4 text-base outline-none"
                placeholder="Patient name"
              />
            </Field>

            <Field label="Date of Birth (optional)">
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="h-14 w-full bg-transparent px-4 text-base outline-none"
              />
            </Field>

            <Field label="Doctor Name (optional)">
              <input
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                className="h-14 w-full bg-transparent px-4 text-base outline-none"
                placeholder="Doctor name"
              />
            </Field>

            <button
              type="submit"
              disabled={saving}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 font-bold text-white disabled:opacity-60"
            >
              <Save size={20} />
              Save Profile
            </button>
          </div>
        )}
      </form>

      <form onSubmit={changePassword} className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex items-center gap-3">
          <ShieldCheck size={24} className="text-blue-700" />
          <h2 className="text-lg font-bold text-slate-900">Change Password</h2>
        </div>
        <Field label="New Password" extraClass="mt-4">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={6}
            autoComplete="new-password"
            className="h-14 w-full bg-transparent px-4 text-base outline-none"
            placeholder="At least 6 characters"
          />
        </Field>
        <button
          type="submit"
          disabled={saving || !newPassword}
          className="mt-3 min-h-13 w-full rounded-2xl border border-blue-200 px-4 font-bold text-blue-700 disabled:opacity-50"
        >
          Update Password
        </button>
      </form>

      <button
        type="button"
        onClick={logout}
        className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-4 font-bold text-red-600"
      >
        <LogOut size={20} />
        Logout
      </button>
    </div>
  )
}

function Field({
  label,
  children,
  extraClass = ''
}: {
  label: string
  children: React.ReactNode
  extraClass?: string
}) {
  return (
    <label className={'block text-sm font-semibold text-slate-700 ' + extraClass}>
      {label}
      <div className="mt-2 overflow-hidden rounded-2xl border border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
        {children}
      </div>
    </label>
  )
}
