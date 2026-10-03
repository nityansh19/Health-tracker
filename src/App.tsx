import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import LoadingScreen from './components/LoadingScreen'
import { useAuth } from './context/AuthContext'
import { supabaseConfigured } from './lib/supabase'
import AddReadingPage from './pages/AddReadingPage'
import AuthPage from './pages/AuthPage'
import HistoryPage from './pages/HistoryPage'
import HomePage from './pages/HomePage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  const { user, loading } = useAuth()

  if (!supabaseConfigured) return <SetupRequired />
  if (loading) return <LoadingScreen />
  if (!user) return <AuthPage />

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="add" element={<AddReadingPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function SetupRequired() {
  return (
    <div className="min-h-screen bg-slate-50 px-5 py-10">
      <div className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
        <p className="text-sm font-bold text-blue-700">One-time setup needed</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Connect Health Tracker to Supabase</h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to the environment, then run the SQL in
          supabase/schema.sql in your Supabase SQL Editor.
        </p>
        <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-medium text-slate-600">
          Only the public anon key belongs in the frontend. Never add a service-role key or database password.
        </p>
      </div>
    </div>
  )
}
