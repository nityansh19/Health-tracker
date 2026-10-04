import type { HealthReading } from '../types'

export interface BpSummary {
  count: number
  averageSystolic: number | null
  averageDiastolic: number | null
  highest: HealthReading | null
  lowest: HealthReading | null
  latest: HealthReading | null
}

export interface SugarSummary {
  count: number
  average: number | null
  highest: HealthReading | null
  lowest: HealthReading | null
  latest: HealthReading | null
}

export interface PulseSummary {
  count: number
  average: number | null
  highest: HealthReading | null
  lowest: HealthReading | null
  latest: HealthReading | null
}

const round = (value: number) => Math.round(value)

export function bpRows(readings: HealthReading[]) {
  return readings.filter((item) => item.systolic != null && item.diastolic != null)
}

export function sugarRows(readings: HealthReading[]) {
  return readings.filter((item) => item.blood_sugar != null)
}

export function pulseRows(readings: HealthReading[]) {
  return readings.filter((item) => item.pulse != null)
}

export function summarizeBp(readings: HealthReading[]): BpSummary {
  const rows = bpRows(readings)
  if (!rows.length) {
    return {
      count: 0,
      averageSystolic: null,
      averageDiastolic: null,
      highest: null,
      lowest: null,
      latest: null
    }
  }

  const sortedByLevel = [...rows].sort((a, b) => {
    const systolicDiff = (a.systolic ?? 0) - (b.systolic ?? 0)
    return systolicDiff || (a.diastolic ?? 0) - (b.diastolic ?? 0)
  })

  const latest = [...rows].sort(
    (a, b) => new Date(b.reading_timestamp).getTime() - new Date(a.reading_timestamp).getTime()
  )[0]

  return {
    count: rows.length,
    averageSystolic: round(rows.reduce((sum, r) => sum + (r.systolic ?? 0), 0) / rows.length),
    averageDiastolic: round(rows.reduce((sum, r) => sum + (r.diastolic ?? 0), 0) / rows.length),
    highest: sortedByLevel[sortedByLevel.length - 1],
    lowest: sortedByLevel[0],
    latest
  }
}

export function summarizeSugar(readings: HealthReading[]): SugarSummary {
  const rows = sugarRows(readings)
  if (!rows.length) {
    return { count: 0, average: null, highest: null, lowest: null, latest: null }
  }

  const sorted = [...rows].sort((a, b) => (a.blood_sugar ?? 0) - (b.blood_sugar ?? 0))
  const latest = [...rows].sort(
    (a, b) => new Date(b.reading_timestamp).getTime() - new Date(a.reading_timestamp).getTime()
  )[0]

  return {
    count: rows.length,
    average: round(rows.reduce((sum, r) => sum + Number(r.blood_sugar ?? 0), 0) / rows.length),
    highest: sorted[sorted.length - 1],
    lowest: sorted[0],
    latest
  }
}

export function summarizePulse(readings: HealthReading[]): PulseSummary {
  const rows = pulseRows(readings)
  if (!rows.length) {
    return { count: 0, average: null, highest: null, lowest: null, latest: null }
  }

  const sorted = [...rows].sort((a, b) => (a.pulse ?? 0) - (b.pulse ?? 0))
  const latest = [...rows].sort(
    (a, b) => new Date(b.reading_timestamp).getTime() - new Date(a.reading_timestamp).getTime()
  )[0]

  return {
    count: rows.length,
    average: round(rows.reduce((sum, r) => sum + Number(r.pulse ?? 0), 0) / rows.length),
    highest: sorted[sorted.length - 1],
    lowest: sorted[0],
    latest
  }
}

export function delta(current: number | null | undefined, previous: number | null | undefined) {
  if (current == null || previous == null) return null
  return Number(current) - Number(previous)
}

export function deltaText(value: number | null, unit = '') {
  if (value == null) return '—'
  if (value === 0) return '— No change'
  const symbol = value > 0 ? '↑' : '↓'
  const amount = Math.abs(Math.round(value * 10) / 10)
  return symbol + ' ' + amount + (unit ? ' ' + unit : '')
}

export function groupReadingsByDay(readings: HealthReading[]) {
  const sorted = [...readings].sort(
    (a, b) => new Date(a.reading_timestamp).getTime() - new Date(b.reading_timestamp).getTime()
  )

  return sorted.reduce<Record<string, HealthReading[]>>((groups, reading) => {
    const key = new Date(reading.reading_timestamp).toLocaleDateString('en-CA')
    if (!groups[key]) groups[key] = []
    groups[key].push(reading)
    return groups
  }, {})
}
