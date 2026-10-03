import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CalendarDays, Droplets, Gauge, Plus, UserRoundCog, WifiOff } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { formatDateTime, rollingWeek } from '../lib/date'
import { getProfile } from '../services/profile'
import { listReadings, listRecentReadings } from '../services/readings'
import type { HealthReading, UserProfile } from '../types'
import { delta, deltaText } from '../utils/stats'

export default function HomePage() {
  const [readings, setReadings] = useState<HealthReading[]>([])
  const [weekReadings, setWeekReadings] = useState<HealthReading[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [offline, setOffline] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const saved = searchParams.get('saved') === '1'

  useEffect(() => {
    let active = true
    const { start, end } = rollingWeek(0)

    Promise.all([
      listRecentReadings(30),
      listReadings({ from: start, to: end }).catch(() => []),
      getProfile().catch(() => null)
    ])
      .then(([recent, week, userProfile]) => {
        if (!active) return
        setReadings(recent.readings)
        setOffline(recent.offline)
        setWeekReadings(week)
        setProfile(userProfile)
      })
      .catch(() => active && setError("Couldn't load your readings. Check your internet connection and try again."))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!saved) return
    const timer = window.setTimeout(() => setSearchParams({}, { replace: true }), 3500)
    return () => window.clearTimeout(timer)
  }, [saved, setSearchParams])

  const bp = useMemo(
    () => readings.filter((r) => r.systolic != null && r.diastolic != null),
    [readings]
  )
  const sugar = useMemo(() => readings.filter((r) => r.blood_sugar != null), [readings])
  const latestBp = bp[0]
  const previousBp = bp[1]
  const latestSugar = sugar[0]
  const previousSugar = sugar[1]
  const weekBpCount = weekReadings.filter((r) => r.systolic != null && r.diastolic != null).length
  const weekSugarCount = weekReadings.filter((r) => r.blood_sugar != null).length
  const needsProfile = !loading && !profile?.name?.trim()

  return (
    <div className="px-5 pb-4 pt-6">
      <header className="mb-5">
        <p className="text-sm font-semibold text-blue-700">Health Tracker</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          Hello, {profile?.name?.trim() || 'Mom'}
        </h1>
        <p className="mt-1 text-base text-slate-600">Your latest readings at a glance.</p>
      </header>

      {needsProfile && (
        <Link
          to="/settings"
          className="mb-4 flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-left"
        >
          <UserRoundCog size={21} className="shrink-0 text-blue-700" />
          <span className="flex-1">
            <span className="block text-sm font-bold text-blue-900">Add patient name</span>
            <span className="block text-xs leading-5 text-blue-700">It will appear on weekly reports and PDFs.</span>
          </span>
          <ArrowRight size={18} className="text-blue-700" />
        </Link>
      )}

      {saved && (
        <div className="mb-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700" role="status">
          Reading saved successfully.
        </div>
      )}

      {offline && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          <WifiOff size={20} className="mt-0.5 shrink-0" />
          Showing recently cached readings. New readings require an internet connection.
        </div>
      )}

      {error && <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Latest Readings</h2>
          {loading && <span className="text-sm text-slate-400">Loading…</span>}
        </div>

        <div className="grid gap-3">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <Gauge size={24} />
              </span>
              <div>
                <p className="font-semibold text-slate-700">Blood Pressure</p>
                <p className="text-sm text-slate-500">Latest recorded value</p>
              </div>
            </div>
            {latestBp ? (
              <>
                <div className="mt-5 flex items-end gap-2">
                  <span className="text-4xl font-bold tracking-tight text-slate-900">
                    {latestBp.systolic} / {latestBp.diastolic}
                  </span>
                  <span className="pb-1 text-sm font-semibold text-slate-500">mmHg</span>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  {formatDateTime(latestBp.reading_timestamp).date} • {formatDateTime(latestBp.reading_timestamp).time}
                </p>
                {previousBp && (
                  <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold">
                    <span className="rounded-full bg-slate-100 px-3 py-2 text-slate-700">
                      Systolic {deltaText(delta(latestBp.systolic, previousBp.systolic))}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-2 text-slate-700">
                      Diastolic {deltaText(delta(latestBp.diastolic, previousBp.diastolic))}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <p className="mt-5 text-base text-slate-500">No blood pressure reading yet.</p>
            )}
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
                <Droplets size={24} />
              </span>
              <div>
                <p className="font-semibold text-slate-700">Blood Sugar</p>
                <p className="text-sm text-slate-500">Latest recorded value</p>
              </div>
            </div>
            {latestSugar ? (
              <>
                <div className="mt-5 flex items-end gap-2">
                  <span className="text-4xl font-bold tracking-tight text-slate-900">{latestSugar.blood_sugar}</span>
                  <span className="pb-1 text-sm font-semibold text-slate-500">mg/dL</span>
                </div>
                <p className="mt-2 text-sm font-medium text-slate-600">
                  {latestSugar.sugar_type || 'Reading'} • {formatDateTime(latestSugar.reading_timestamp).date} • {formatDateTime(latestSugar.reading_timestamp).time}
                </p>
                {previousSugar && (
                  <div className="mt-4 inline-flex rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
                    {deltaText(delta(Number(latestSugar.blood_sugar), Number(previousSugar.blood_sugar)), 'mg/dL')} from previous
                  </div>
                )}
              </>
            ) : (
              <p className="mt-5 text-base text-slate-500">No blood sugar reading yet.</p>
            )}
          </article>
        </div>
      </section>

      <Link
        to="/add"
        className="mt-4 flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-lg font-bold text-white shadow-lg shadow-blue-600/20 active:scale-[0.99]"
      >
        <Plus size={26} />
        Add New Reading
      </Link>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
            <CalendarDays size={22} />
          </span>
          <div className="flex-1">
            <h2 className="font-bold text-slate-900">This Week</h2>
            <p className="text-sm text-slate-500">Latest 7-day report</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-2xl font-bold text-slate-900">{weekBpCount}</p>
            <p className="mt-1 text-sm text-slate-600">BP readings</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-2xl font-bold text-slate-900">{weekSugarCount}</p>
            <p className="mt-1 text-sm text-slate-600">Sugar readings</p>
          </div>
        </div>
        <Link to="/reports" className="mt-3 flex min-h-12 items-center justify-between rounded-2xl px-2 text-base font-bold text-blue-700">
          View Weekly Report
          <ArrowRight size={20} />
        </Link>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Recent Readings</h2>
          <Link to="/history" className="text-sm font-bold text-blue-700">View History</Link>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card">
          {readings.slice(0, 5).length ? readings.slice(0, 5).map((reading, index) => (
            <div key={reading.id} className={'p-4 ' + (index ? 'border-t border-slate-100' : '')}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-500">
                    {formatDateTime(reading.reading_timestamp).date} • {formatDateTime(reading.reading_timestamp).time}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-base font-bold text-slate-900">
                    {reading.systolic != null && reading.diastolic != null && <span>{reading.systolic} / {reading.diastolic} mmHg</span>}
                    {reading.blood_sugar != null && <span>{reading.blood_sugar} mg/dL</span>}
                  </div>
                </div>
              </div>
            </div>
          )) : (
            <div className="p-6 text-center">
              <p className="font-semibold text-slate-700">No readings yet</p>
              <p className="mt-1 text-sm text-slate-500">Add your first BP or Sugar reading.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
