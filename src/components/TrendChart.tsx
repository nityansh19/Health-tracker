import { format } from 'date-fns'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import type { HealthReading } from '../types'

export function BloodPressureChart({ readings }: { readings: HealthReading[] }) {
  const data = readings
    .filter((r) => r.systolic != null && r.diastolic != null)
    .sort((a, b) => new Date(a.reading_timestamp).getTime() - new Date(b.reading_timestamp).getTime())
    .map((r) => ({
      time: format(new Date(r.reading_timestamp), 'd MMM, h:mm a'),
      systolic: r.systolic,
      diastolic: r.diastolic
    }))

  if (!data.length) return <ChartEmpty />

  return (
    <div className="h-60 w-full" aria-label="Blood pressure trend chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="time" tick={{ fontSize: 11 }} minTickGap={28} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Line type="monotone" dataKey="systolic" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="diastolic" stroke="#0f766e" strokeWidth={2.5} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function BloodSugarChart({ readings }: { readings: HealthReading[] }) {
  const data = readings
    .filter((r) => r.blood_sugar != null)
    .sort((a, b) => new Date(a.reading_timestamp).getTime() - new Date(b.reading_timestamp).getTime())
    .map((r) => ({
      time: format(new Date(r.reading_timestamp), 'd MMM, h:mm a'),
      sugar: r.blood_sugar
    }))

  if (!data.length) return <ChartEmpty />

  return (
    <div className="h-60 w-full" aria-label="Blood sugar trend chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="time" tick={{ fontSize: 11 }} minTickGap={28} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Line type="monotone" dataKey="sugar" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function ChartEmpty() {
  return (
    <div className="flex h-40 items-center justify-center rounded-2xl bg-slate-50 px-6 text-center text-sm font-medium text-slate-500">
      No readings were recorded during this period.
    </div>
  )
}
