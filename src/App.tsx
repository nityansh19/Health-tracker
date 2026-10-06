import { lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import CreatorIntro from './components/CreatorIntro'
import LoadingScreen from './components/LoadingScreen'
import { useAuth } from './context/AuthContext'
import { supabaseConfigured } from './lib/supabase'
import AuthPage from './pages/AuthPage'
import HomePage from './pages/HomePage'

const AddReadingPage = lazy(() => import('./pages/AddReadingPage'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const MedicinesPage = lazy(() => import('./pages/MedicinesPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

export default function App() {
  const { user, loading } = useAuth()
  const [showCreatorIntro, setShowCreatorIntro] = useState(true)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const introDuration = prefersReducedMotion ? 550 : 1750
    let hideTimer: number | undefined
    let wasHidden = false

    const hideIntroAfterDelay = () => {
      if (hideTimer) window.clearTimeout(hideTimer)
      hideTimer = window.setTimeout(() => setShowCreatorIntro(false), introDuration)
    }

    const replayIntro = () => {
      setShowCreatorIntro(true)
      hideIntroAfterDelay()
    }

    // Show the creator intro on every fresh app/site launch.
    hideIntroAfterDelay()

    // Replay it whenever the installed PWA or browser tab is reopened
    // after being sent to the background.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        wasHidden = true
        return
      }

      if (document.visibilityState === 'visible' && wasHidden) {
        wasHidden = false
        replayIntro()
      }
    }

    // Covers browser back/forward cache restores as another kind of reopen.
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) replayIntro()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pageshow', handlePageShow)

    return () => {
      if (hideTimer) window.clearTimeout(hideTimer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [])

  if (showCreatorIntro) return <CreatorIntro />
  if (!supabaseConfigured) return <SetupRequired />
  if (loading) return <LoadingScreen />
  if (!user) return <AuthPage />

  return (
    <Suspense fallback={<LoadingScreen label="Opening…" />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="add" element={<AddReadingPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="medicines" element={<MedicinesPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

function SetupRequired() {
  return (
    <div className="min-h-screen bg-slate-50 px-5 py-10">
      <div className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
        <p className="text-sm font-bold text-blue-700">One-time setup needed</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Connect Health Tracker to Supabase</h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to the environment, then run the SQL in
          supabase/schema.sql in your Supabase SQL Editor.
        </p>
        <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-medium text-slate-600">
          Only the public publishable key belongs in the frontend. Never add a secret key, service-role key, or database password.
        </p>
      </div>
    </div>
  )
}
