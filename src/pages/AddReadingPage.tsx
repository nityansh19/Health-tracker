import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, CalendarClock, Droplets, Gauge, Save } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toLocalDateTimeInput } from '../lib/date'
import { createReading, getReading, updateReading } from '../services/readings'
import type { SugarType } from '../types'

const sugarTypes: SugarType[] = ['Fasting', 'Before Meal', 'After Meal', 'Random']

function parseNumber(value: string) {
  if (!value.trim()) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export default function AddReadingPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('id')
  const systolicRef = useRef<HTMLInputElement>(null)

  const [systolic, setSystolic] = useState('')
  const [diastolic, setDiastolic] = useState('')
  const [sugar, setSugar] = useState('')
  const [sugarType, setSugarType] = useState<SugarType>('Random')
  const [notes, setNotes] = useState('')
  const [dateTime, setDateTime] = useState(toLocalDateTimeInput())
  const [showDateTime, setShowDateTime] = useState(false)
  const [loading, setLoading] = useState(Boolean(editId))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!editId) {
      const timer = window.setTimeout(() => systolicRef.current?.focus(), 200)
      return () => window.clearTimeout(timer)
    }

    getReading(editId)
      .then((reading) => {
        setSystolic(reading.systolic?.toString() ?? '')
        setDiastolic(reading.diastolic?.toString() ?? '')
        setSugar(reading.blood_sugar?.toString() ?? '')
        setSugarType(reading.sugar_type ?? 'Random')
        setNotes(reading.notes ?? '')
        setDateTime(toLocalDateTimeInput(new Date(reading.reading_timestamp)))
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load this reading."))
      .finally(() => setLoading(false))
  }, [editId])

  async function save(event: FormEvent) {
    event.preventDefault()
    const sys = parseNumber(systolic)
    const dia = parseNumber(diastolic)
    const bloodSugar = parseNumber(sugar)

    setError('')

    if ((sys == null) !== (dia == null)) {
      setError('For blood pressure, enter both systolic and diastolic values.')
      return
    }

    if (sys == null && dia == null && bloodSugar == null) {
      setError('Enter a blood pressure reading, a blood sugar reading, or both.')
      return
    }

    if ([sys, dia, bloodSugar].some((value) => value != null && value <= 0)) {
      setError('Readings must be greater than zero.')
      return
    }

    const timestamp = new Date(dateTime)
    if (Number.isNaN(timestamp.getTime())) {
      setError('Please choose a valid date and time.')
      return
    }

    setSaving(true)

    try {
      const input = {
        systolic: sys,
        diastolic: dia,
        blood_sugar: bloodSugar,
        sugar_type: bloodSugar == null ? null : sugarType,
        notes: notes.trim() || null,
        reading_timestamp: timestamp.toISOString()
      }

      if (editId) {
        await updateReading(editId, input)
      } else {
        await createReading(input)
      }

      navigate('/?saved=1', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your reading. Please try again.")
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen px-5 pb-8 pt-5">
      <div className="mb-5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700"
          aria-label="Go back"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <p className="text-sm font-semibold text-blue-700">{editId ? 'Edit record' : 'Quick entry'}</p>
          <h1 className="text-2xl font-bold text-slate-900">{editId ? 'Edit Reading' : 'Add Reading'}</h1>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl bg-white p-8 text-center text-slate-600 shadow-card">Loading reading…</div>
      ) : (
        <form onSubmit={save} className="space-y-4">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <Gauge size={24} />
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Blood Pressure</h2>
                <p className="text-sm text-slate-500">Leave blank if adding sugar only.</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <label className="text-sm font-semibold text-slate-700">
                Systolic
                <div className="mt-2 rounded-2xl border border-slate-300 px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                  <input
                    ref={systolicRef}
                    type="number"
                    inputMode="numeric"
                    min="1"
                    step="1"
                    value={systolic}
                    onChange={(e) => setSystolic(e.target.value)}
                    className="h-16 w-full bg-transparent text-center text-3xl font-bold text-slate-900 outline-none"
                    placeholder="120"
                  />
                </div>
              </label>

              <label className="text-sm font-semibold text-slate-700">
                Diastolic
                <div className="mt-2 rounded-2xl border border-slate-300 px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    step="1"
                    value={diastolic}
                    onChange={(e) => setDiastolic(e.target.value)}
                    className="h-16 w-full bg-transparent text-center text-3xl font-bold text-slate-900 outline-none"
                    placeholder="80"
                  />
                </div>
              </label>
            </div>
            <p className="mt-2 text-center text-sm font-semibold text-slate-500">mmHg</p>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
                <Droplets size={24} />
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Blood Sugar</h2>
                <p className="text-sm text-slate-500">Leave blank if adding BP only.</p>
              </div>
            </div>

            <label className="mt-5 block text-sm font-semibold text-slate-700">
              Sugar Level
              <div className="mt-2 flex items-center rounded-2xl border border-slate-300 px-4 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                <input
                  type="number"
                  inputMode="decimal"
                  min="1"
                  step="0.1"
                  value={sugar}
                  onChange={(e) => setSugar(e.target.value)}
                  className="h-16 min-w-0 flex-1 bg-transparent text-3xl font-bold text-slate-900 outline-none"
                  placeholder="105"
                />
                <span className="text-sm font-semibold text-slate-500">mg/dL</span>
              </div>
            </label>

            <div className="mt-4">
              <p className="text-sm font-semibold text-slate-700">Measurement Type</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {sugarTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSugarType(type)}
                    className={
                      'min-h-12 rounded-2xl border px-3 text-sm font-semibold transition ' +
                      (sugarType === type
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-700')
                    }
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
            <button
              type="button"
              onClick={() => setShowDateTime((value) => !value)}
              className="flex min-h-12 w-full items-center justify-between gap-3 text-left"
            >
              <span className="flex items-center gap-3">
                <CalendarClock size={22} className="text-slate-600" />
                <span>
                  <span className="block font-bold text-slate-900">Date & Time</span>
                  <span className="block text-sm text-slate-500">{new Date(dateTime).toLocaleString()}</span>
                </span>
              </span>
              <span className="text-sm font-bold text-blue-700">{showDateTime ? 'Done' : 'Change'}</span>
            </button>

            {showDateTime && (
              <input
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="mt-3 min-h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            )}
          </section>

          <label className="block rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
            <span className="font-bold text-slate-900">Optional Notes</span>
            <span className="mt-1 block text-sm text-slate-500">For example: after lunch, before medicine, feeling tired.</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={300}
              className="mt-3 w-full resize-none rounded-2xl border border-slate-300 p-4 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Add a note if needed"
            />
          </label>

          {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

          <button
            type="submit"
            disabled={saving}
            className="flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-lg font-bold text-white shadow-lg shadow-blue-600/20 disabled:opacity-60"
          >
            <Save size={23} />
            {saving ? 'Saving…' : editId ? 'Update Reading' : 'Save Reading'}
          </button>
        </form>
      )}
    </div>
  )
}
