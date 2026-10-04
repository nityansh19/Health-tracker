import { useEffect, useMemo, useState } from 'react'
import { Calendar, Edit3, Trash2 } from 'lucide-react'
import { endOfDay, startOfDay, subDays } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { formatDateTime } from '../lib/date'
import { deleteReading, listReadings } from '../services/readings'
import type { HealthReading, MeasurementFilter } from '../types'

type RangeFilter = 'today' | '7days' | '30days' | 'all'

export default function HistoryPage() {
  const navigate = useNavigate()
  const [measurement, setMeasurement] = useState<MeasurementFilter>('all')
  const [range, setRange] = useState<RangeFilter>('7days')
  const [selectedDate, setSelectedDate] = useState('')
  const [readings, setReadings] = useState<HealthReading[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<HealthReading | null>(null)
  const [deleting, setDeleting] = useState(false)

  function getRange() {
    if (selectedDate) {
      const date = new Date(selectedDate + 'T12:00:00')
      return { from: startOfDay(date), to: endOfDay(date) }
    }
    if (range === 'today') return { from: startOfDay(new Date()), to: endOfDay(new Date()) }
    if (range === '7days') return { from: startOfDay(subDays(new Date(), 6)), to: endOfDay(new Date()) }
    if (range === '30days') return { from: startOfDay(subDays(new Date(), 29)), to: endOfDay(new Date()) }
    return {}
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    const windowRange = getRange()

    listReadings({
      measurement,
      from: windowRange.from,
      to: windowRange.to
    })
      .then((data) => active && setReadings(data))
      .catch((err) => active && setError(err instanceof Error ? err.message : "Couldn't load your readings."))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [measurement, range, selectedDate])

  const groups = useMemo(() => {
    return readings.reduce<Record<string, HealthReading[]>>((result, reading) => {
      const key = new Date(reading.reading_timestamp).toLocaleDateString('en-CA')
      if (!result[key]) result[key] = []
      result[key].push(reading)
      return result
    }, {})
  }, [readings])

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteReading(deleteTarget.id)
      setReadings((current) => current.filter((reading) => reading.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete this reading.")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="px-5 pb-5 pt-6">
      <header>
        <p className="text-sm font-semibold text-blue-700">All records</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">History</h1>
        <p className="mt-1 text-base text-slate-600">Newest readings appear first.</p>
      </header>

      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="grid grid-cols-2 gap-2">
          {[
            ['all', 'All'],
            ['bp', 'Blood Pressure'],
            ['pulse', 'Pulse'],
            ['sugar', 'Blood Sugar']
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMeasurement(value as MeasurementFilter)}
              className={
                'min-h-11 rounded-xl px-2 text-xs font-bold ' +
                (measurement === value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700')
              }
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2">
          {[
            ['today', 'Today'],
            ['7days', '7 Days'],
            ['30days', '30 Days'],
            ['all', 'All Time']
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setRange(value as RangeFilter)
                setSelectedDate('')
              }}
              className={
                'min-h-10 rounded-xl px-1 text-xs font-semibold ' +
                (!selectedDate && range === value ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600')
              }
            >
              {label}
            </button>
          ))}
        </div>

        <label className="mt-3 flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 px-3">
          <Calendar size={20} className="text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">Specific date</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="ml-auto min-w-0 bg-transparent text-sm text-slate-700 outline-none"
          />
        </label>
      </section>

      {error && <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

      <div className="mt-5 space-y-5">
        {loading ? (
          <div className="rounded-3xl bg-white p-8 text-center text-slate-500 shadow-card">Loading history…</div>
        ) : Object.keys(groups).length ? (
          Object.entries(groups).map(([day, dayReadings]) => (
            <section key={day}>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
                {new Date(day + 'T12:00:00').toLocaleDateString(undefined, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </h2>
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card">
                {dayReadings.map((reading, index) => (
                  <article key={reading.id} className={'p-4 ' + (index ? 'border-t border-slate-100' : '')}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-500">{formatDateTime(reading.reading_timestamp).time}</p>
                        <div className="mt-2 space-y-1">
                          {reading.systolic != null && reading.diastolic != null && (
                            <p className="text-lg font-bold text-slate-900">
                              BP: {reading.systolic} / {reading.diastolic} <span className="text-sm font-semibold text-slate-500">mmHg</span>
                            </p>
                          )}
                          {reading.pulse != null && (
                            <p className="text-lg font-bold text-slate-900">
                              Pulse: {reading.pulse} <span className="text-sm font-semibold text-slate-500">bpm</span>
                            </p>
                          )}
                          {reading.blood_sugar != null && (
                            <p className="text-lg font-bold text-slate-900">
                              Sugar: {reading.blood_sugar} <span className="text-sm font-semibold text-slate-500">mg/dL</span>
                            </p>
                          )}
                          {reading.sugar_type && <p className="text-sm font-medium text-slate-600">{reading.sugar_type}</p>}
                          {reading.notes && <p className="pt-1 text-sm text-slate-500">{reading.notes}</p>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => navigate('/add?id=' + reading.id)}
                          className="flex h-11 w-11 items-center justify-center rounded-xl text-blue-700 hover:bg-blue-50"
                          aria-label="Edit reading"
                        >
                          <Edit3 size={20} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(reading)}
                          className="flex h-11 w-11 items-center justify-center rounded-xl text-red-600 hover:bg-red-50"
                          aria-label="Delete reading"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-card">
            <p className="font-bold text-slate-800">No readings found</p>
            <p className="mt-1 text-sm text-slate-500">Try another filter or add a new reading.</p>
          </div>
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-900">Delete this reading?</h2>
            <p className="mt-2 text-sm text-slate-600">This will permanently remove the selected record.</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="min-h-13 rounded-2xl border border-slate-300 px-4 font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="min-h-13 rounded-2xl bg-red-600 px-4 font-bold text-white disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
