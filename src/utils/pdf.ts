import { format } from 'date-fns'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { HealthReading } from '../types'
import { bpRows, sugarRows, summarizeBp, summarizeSugar } from './stats'

type Color = [number, number, number]

interface ReportInput {
  readings: HealthReading[]
  patientName?: string
  start: Date
  end: Date
}

function bpValue(reading: HealthReading) {
  return reading.systolic != null && reading.diastolic != null
    ? reading.systolic + ' / ' + reading.diastolic
    : '—'
}

function sugarValue(reading: HealthReading) {
  return reading.blood_sugar != null ? String(reading.blood_sugar) : '—'
}

function drawLineChart(
  doc: jsPDF,
  title: string,
  x: number,
  y: number,
  width: number,
  height: number,
  series: Array<{ values: number[]; color: Color }>
) {
  const allValues = series.flatMap((item) => item.values)
  if (!allValues.length) return y

  const minValue = Math.min(...allValues)
  const maxValue = Math.max(...allValues)
  const range = Math.max(1, maxValue - minValue)

  doc.setFontSize(11)
  doc.setTextColor(30, 41, 59)
  doc.text(title, x, y)

  const chartTop = y + 5
  const chartBottom = chartTop + height
  doc.setDrawColor(226, 232, 240)
  doc.line(x, chartBottom, x + width, chartBottom)
  doc.line(x, chartTop, x, chartBottom)

  series.forEach((item) => {
    if (!item.values.length) return
    doc.setDrawColor(...item.color)
    doc.setLineWidth(0.7)

    item.values.forEach((value, index) => {
      if (index === 0) return
      const previous = item.values[index - 1]
      const count = Math.max(1, item.values.length - 1)
      const x1 = x + ((index - 1) / count) * width
      const x2 = x + (index / count) * width
      const y1 = chartBottom - ((previous - minValue) / range) * height
      const y2 = chartBottom - ((value - minValue) / range) * height
      doc.line(x1, y1, x2, y2)
    })
  })

  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text(String(Math.round(maxValue)), x - 2, chartTop + 2, { align: 'right' })
  doc.text(String(Math.round(minValue)), x - 2, chartBottom, { align: 'right' })

  return chartBottom + 8
}

export function generateWeeklyReportPdf({ readings, patientName, start, end }: ReportInput) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const bp = summarizeBp(readings)
  const sugar = summarizeSugar(readings)
  const sorted = [...readings].sort(
    (a, b) => new Date(a.reading_timestamp).getTime() - new Date(b.reading_timestamp).getTime()
  )

  doc.setTextColor(15, 23, 42)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('HEALTH TRACKER', 14, 18)

  doc.setFontSize(14)
  doc.text('Weekly Health Report', 14, 27)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(71, 85, 105)
  doc.text('Patient: ' + (patientName?.trim() || '—'), 14, 35)
  doc.text('Report Period: ' + format(start, 'd MMM yyyy') + ' – ' + format(end, 'd MMM yyyy'), 14, 41)

  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Blood Pressure Summary', 14, 53)

  autoTable(doc, {
    startY: 57,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    head: [['Readings', 'Average', 'Highest', 'Lowest', 'Latest']],
    body: [[
      String(bp.count),
      bp.count ? bp.averageSystolic + ' / ' + bp.averageDiastolic + ' mmHg' : '—',
      bp.highest ? bpValue(bp.highest) + ' mmHg' : '—',
      bp.lowest ? bpValue(bp.lowest) + ' mmHg' : '—',
      bp.latest ? bpValue(bp.latest) + ' mmHg' : '—'
    ]]
  })

  let cursor = ((doc as any).lastAutoTable?.finalY ?? 75) + 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Blood Sugar Summary', 14, cursor)

  autoTable(doc, {
    startY: cursor + 4,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    head: [['Readings', 'Average', 'Highest', 'Lowest', 'Latest']],
    body: [[
      String(sugar.count),
      sugar.count ? sugar.average + ' mg/dL' : '—',
      sugar.highest ? sugarValue(sugar.highest) + ' mg/dL' : '—',
      sugar.lowest ? sugarValue(sugar.lowest) + ' mg/dL' : '—',
      sugar.latest ? sugarValue(sugar.latest) + ' mg/dL' : '—'
    ]]
  })

  cursor = ((doc as any).lastAutoTable?.finalY ?? cursor + 20) + 10

  const bpSeries = bpRows(sorted)
  if (bpSeries.length) {
    if (cursor > 225) {
      doc.addPage()
      cursor = 20
    }
    cursor = drawLineChart(doc, 'Blood Pressure Trend (mmHg)', 18, cursor, 174, 34, [
      { values: bpSeries.map((r) => Number(r.systolic)), color: [37, 99, 235] },
      { values: bpSeries.map((r) => Number(r.diastolic)), color: [15, 118, 110] }
    ])
  }

  const sugarSeries = sugarRows(sorted)
  if (sugarSeries.length) {
    if (cursor > 225) {
      doc.addPage()
      cursor = 20
    }
    cursor = drawLineChart(doc, 'Blood Sugar Trend (mg/dL)', 18, cursor, 174, 34, [
      { values: sugarSeries.map((r) => Number(r.blood_sugar)), color: [37, 99, 235] }
    ])
  }

  if (cursor > 210) {
    doc.addPage()
    cursor = 20
  }

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(12)
  doc.text('Recorded Readings', 14, cursor)

  autoTable(doc, {
    startY: cursor + 4,
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 2.4, overflow: 'linebreak' },
    head: [['Date', 'Time', 'BP (mmHg)', 'Sugar (mg/dL)', 'Type', 'Notes']],
    body: sorted.map((reading) => {
      const date = new Date(reading.reading_timestamp)
      return [
        format(date, 'd MMM yyyy'),
        format(date, 'h:mm a'),
        bpValue(reading),
        sugarValue(reading),
        reading.sugar_type || '—',
        reading.notes || '—'
      ]
    }),
    didDrawPage: () => {
      const pageHeight = doc.internal.pageSize.getHeight()
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(100, 116, 139)
      doc.text(
        'This report contains user-recorded measurements and is intended for record keeping and discussion with a healthcare professional.',
        14,
        pageHeight - 8
      )
    },
    margin: { bottom: 16 }
  })

  const filename = 'health-report-' + format(start, 'yyyy-MM-dd') + '-to-' + format(end, 'yyyy-MM-dd') + '.pdf'
  return { blob: doc.output('blob'), filename }
}
