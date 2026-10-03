import { format } from 'date-fns'
import type { HealthReading } from '../types'

function escapeCell(value: string | number | null | undefined) {
  if (value == null) return ''
  const text = String(value)
  if (/[",\n]/.test(text)) return '"' + text.replace(/"/g, '""') + '"'
  return text
}

export function downloadReadingsCsv(readings: HealthReading[], start: Date, end: Date) {
  const sorted = [...readings].sort(
    (a, b) => new Date(a.reading_timestamp).getTime() - new Date(b.reading_timestamp).getTime()
  )

  const rows = [
    ['Date', 'Time', 'Systolic', 'Diastolic', 'Blood Sugar', 'Sugar Type', 'Notes'],
    ...sorted.map((reading) => {
      const date = new Date(reading.reading_timestamp)
      return [
        format(date, 'yyyy-MM-dd'),
        format(date, 'HH:mm'),
        reading.systolic,
        reading.diastolic,
        reading.blood_sugar,
        reading.sugar_type,
        reading.notes
      ]
    })
  ]

  const csv = rows.map((row) => row.map(escapeCell).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download =
    'health-readings-' +
    format(start, 'yyyy-MM-dd') +
    '-to-' +
    format(end, 'yyyy-MM-dd') +
    '.csv'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
