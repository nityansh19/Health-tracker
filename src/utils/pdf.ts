import { format } from 'date-fns'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { HealthReading, Medication, SugarType } from '../types'
import { bpRows, pulseRows, sugarRows, summarizeBp, summarizePulse, summarizeSugar } from './stats'

type Color = [number, number, number]

interface ReportInput {
  readings: HealthReading[]
  previousReadings?: HealthReading[]
  patientName?: string | null
  doctorName?: string | null
  medications?: Medication[]
  start: Date
  end: Date
}

const sugarTypes: SugarType[] = ['Fasting', 'Before Meal', 'After Meal', 'Random']

function bpValue(reading: HealthReading) {
  return reading.systolic != null && reading.diastolic != null
    ? reading.systolic + ' / ' + reading.diastolic
    : '—'
}

function pulseValue(reading: HealthReading) {
  return reading.pulse != null ? String(reading.pulse) : '—'
}

function sugarValue(reading: HealthReading) {
  return reading.blood_sugar != null ? String(reading.blood_sugar) : '—'
}

function changeText(current: number | null, previous: number | null, unit = '') {
  if (current == null) return '—'
  if (previous == null) return 'No previous data'
  const difference = current - previous
  if (difference === 0) return 'No change'
  const arrow = difference > 0 ? 'Up ' : 'Down '
  return arrow + Math.abs(difference) + (unit ? ' ' + unit : '')
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
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text(title, x, y)

  const chartTop = y + 5
  const chartBottom = chartTop + height
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
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

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text(String(Math.round(maxValue)), x - 2, chartTop + 2, { align: 'right' })
  doc.text(String(Math.round(minValue)), x - 2, chartBottom, { align: 'right' })

  return chartBottom + 8
}

function groupByDate(readings: HealthReading[]) {
  const groups = new Map<string, HealthReading[]>()
  readings.forEach((reading) => {
    const key = format(new Date(reading.reading_timestamp), 'yyyy-MM-dd')
    const group = groups.get(key) ?? []
    group.push(reading)
    groups.set(key, group)
  })
  return groups
}

export function generateWeeklyReportPdf({
  readings,
  previousReadings = [],
  patientName,
  doctorName,
  medications = [],
  start,
  end
}: ReportInput) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const bp = summarizeBp(readings)
  const pulse = summarizePulse(readings)
  const sugar = summarizeSugar(readings)
  const previousBp = summarizeBp(previousReadings)
  const previousPulse = summarizePulse(previousReadings)
  const previousSugar = summarizeSugar(previousReadings)

  const sorted = [...readings].sort(
    (a, b) => new Date(a.reading_timestamp).getTime() - new Date(b.reading_timestamp).getTime()
  )

  const daysTracked = new Set(
    sorted.map((reading) => format(new Date(reading.reading_timestamp), 'yyyy-MM-dd'))
  ).size
  const totalMeasurements = bp.count + pulse.count + sugar.count
  const notesCount = sorted.filter((reading) => Boolean(reading.notes?.trim())).length
  const firstReading = sorted[0] ?? null
  const latestReading = sorted[sorted.length - 1] ?? null
  const sugarTypeCounts = sugarTypes.map((type) => ({
    type,
    count: sorted.filter((reading) => reading.blood_sugar != null && reading.sugar_type === type).length
  }))
  const untypedSugarCount = sorted.filter(
    (reading) => reading.blood_sugar != null && !reading.sugar_type
  ).length

  doc.setTextColor(15, 23, 42)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('HEALTH TRACKER', 14, 18)

  doc.setFontSize(14)
  doc.text('Weekly Health Report', 14, 27)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(71, 85, 105)
  doc.text('Patient: ' + (patientName?.trim() || '—'), 14, 35)
  doc.text('Doctor: ' + (doctorName?.trim() || 'Not specified'), 14, 41)
  doc.text('Report Period: ' + format(start, 'd MMM yyyy') + ' – ' + format(end, 'd MMM yyyy'), 14, 47)
  doc.text('Generated: ' + format(new Date(), 'd MMM yyyy, h:mm a'), 14, 53)

  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Week at a Glance', 14, 64)

  autoTable(doc, {
    startY: 68,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3, halign: 'center' },
    head: [['Saved Entries', 'Days Tracked', 'Measurements', 'Entries With Notes']],
    body: [[
      String(readings.length),
      daysTracked + ' / 7',
      String(totalMeasurements),
      String(notesCount)
    ]]
  })

  let cursor = ((doc as any).lastAutoTable?.finalY ?? 84) + 5

  autoTable(doc, {
    startY: cursor,
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: 1.5, textColor: [71, 85, 105] },
    body: [[
      'First recorded: ' + (firstReading ? format(new Date(firstReading.reading_timestamp), 'EEE, d MMM • h:mm a') : '—'),
      'Latest recorded: ' + (latestReading ? format(new Date(latestReading.reading_timestamp), 'EEE, d MMM • h:mm a') : '—')
    ]]
  })

  cursor = ((doc as any).lastAutoTable?.finalY ?? cursor + 10) + 9

  if (medications.length) {
    if (cursor > 205) {
      doc.addPage()
      cursor = 20
    }

    doc.setTextColor(15, 23, 42)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('Current Medicines', 14, cursor)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(100, 116, 139)
    doc.text('Medication details recorded by the patient for reference during the appointment.', 14, cursor + 5)

    autoTable(doc, {
      startY: cursor + 9,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2.3, overflow: 'linebreak' },
      head: [['Medicine', 'For', 'Dosage', 'When to Take', 'Notes']],
      body: medications.map((medicine) => [
        medicine.name,
        medicine.purpose,
        medicine.dosage,
        medicine.schedule || '—',
        medicine.notes || '—'
      ]),
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 27 },
        2: { cellWidth: 27 },
        3: { cellWidth: 43 },
        4: { cellWidth: 'auto' }
      }
    })

    cursor = ((doc as any).lastAutoTable?.finalY ?? cursor + 25) + 9
  }

  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Measurement Summary', 14, cursor)

  autoTable(doc, {
    startY: cursor + 4,
    theme: 'grid',
    styles: { fontSize: 8.3, cellPadding: 2.5, halign: 'center' },
    head: [['Measurement', 'Readings', 'Average', 'Latest', 'Highest', 'Lowest']],
    body: [
      [
        'Blood Pressure',
        String(bp.count),
        bp.count ? bp.averageSystolic + ' / ' + bp.averageDiastolic + ' mmHg' : '—',
        bp.latest ? bpValue(bp.latest) + ' mmHg' : '—',
        bp.highest ? bpValue(bp.highest) + ' mmHg' : '—',
        bp.lowest ? bpValue(bp.lowest) + ' mmHg' : '—'
      ],
      [
        'Pulse',
        String(pulse.count),
        pulse.count ? pulse.average + ' bpm' : '—',
        pulse.latest ? pulseValue(pulse.latest) + ' bpm' : '—',
        pulse.highest ? pulseValue(pulse.highest) + ' bpm' : '—',
        pulse.lowest ? pulseValue(pulse.lowest) + ' bpm' : '—'
      ],
      [
        'Blood Sugar',
        String(sugar.count),
        sugar.count ? sugar.average + ' mg/dL' : '—',
        sugar.latest ? sugarValue(sugar.latest) + ' mg/dL' : '—',
        sugar.highest ? sugarValue(sugar.highest) + ' mg/dL' : '—',
        sugar.lowest ? sugarValue(sugar.lowest) + ' mg/dL' : '—'
      ]
    ]
  })

  cursor = ((doc as any).lastAutoTable?.finalY ?? cursor + 32) + 9
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Compared With Previous 7 Days', 14, cursor)

  autoTable(doc, {
    startY: cursor + 4,
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    head: [['Measurement', 'This Period', 'Previous Period', 'Change']],
    body: [
      [
        'Systolic average',
        bp.averageSystolic != null ? bp.averageSystolic + ' mmHg' : '—',
        previousBp.averageSystolic != null ? previousBp.averageSystolic + ' mmHg' : '—',
        changeText(bp.averageSystolic, previousBp.averageSystolic, 'mmHg')
      ],
      [
        'Diastolic average',
        bp.averageDiastolic != null ? bp.averageDiastolic + ' mmHg' : '—',
        previousBp.averageDiastolic != null ? previousBp.averageDiastolic + ' mmHg' : '—',
        changeText(bp.averageDiastolic, previousBp.averageDiastolic, 'mmHg')
      ],
      [
        'Pulse average',
        pulse.average != null ? pulse.average + ' bpm' : '—',
        previousPulse.average != null ? previousPulse.average + ' bpm' : '—',
        changeText(pulse.average, previousPulse.average, 'bpm')
      ],
      [
        'Blood sugar average',
        sugar.average != null ? sugar.average + ' mg/dL' : '—',
        previousSugar.average != null ? previousSugar.average + ' mg/dL' : '—',
        changeText(sugar.average, previousSugar.average, 'mg/dL')
      ]
    ]
  })

  cursor = ((doc as any).lastAutoTable?.finalY ?? cursor + 34) + 9

  if (sugar.count > 0) {
    if (cursor > 235) {
      doc.addPage()
      cursor = 20
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('Blood Sugar Timing', 14, cursor)

    autoTable(doc, {
      startY: cursor + 4,
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 2.5, halign: 'center' },
      head: [['Fasting', 'Before Meal', 'After Meal', 'Random', 'Not Specified']],
      body: [[
        String(sugarTypeCounts.find((item) => item.type === 'Fasting')?.count ?? 0),
        String(sugarTypeCounts.find((item) => item.type === 'Before Meal')?.count ?? 0),
        String(sugarTypeCounts.find((item) => item.type === 'After Meal')?.count ?? 0),
        String(sugarTypeCounts.find((item) => item.type === 'Random')?.count ?? 0),
        String(untypedSugarCount)
      ]]
    })

    cursor = ((doc as any).lastAutoTable?.finalY ?? cursor + 18) + 9
  }

  const dailyGroups = groupByDate(sorted)
  if (dailyGroups.size) {
    if (cursor > 210) {
      doc.addPage()
      cursor = 20
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('Daily Summary', 14, cursor)

    const dailyRows = Array.from(dailyGroups.entries()).map(([dateKey, dayReadings]) => {
      const dayBp = summarizeBp(dayReadings)
      const dayPulse = summarizePulse(dayReadings)
      const daySugar = summarizeSugar(dayReadings)
      return [
        format(new Date(dateKey + 'T12:00:00'), 'EEE, d MMM'),
        String(dayReadings.length),
        dayBp.count ? dayBp.averageSystolic + ' / ' + dayBp.averageDiastolic : '—',
        dayPulse.count ? String(dayPulse.average) : '—',
        daySugar.count ? String(daySugar.average) : '—'
      ]
    })

    autoTable(doc, {
      startY: cursor + 4,
      theme: 'striped',
      styles: { fontSize: 8.3, cellPadding: 2.4, halign: 'center' },
      head: [['Day', 'Entries', 'Avg BP', 'Avg Pulse', 'Avg Sugar']],
      body: dailyRows
    })

    cursor = ((doc as any).lastAutoTable?.finalY ?? cursor + 40) + 10
  }

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

  const pulseSeries = pulseRows(sorted)
  if (pulseSeries.length) {
    if (cursor > 225) {
      doc.addPage()
      cursor = 20
    }
    cursor = drawLineChart(doc, 'Pulse Trend (bpm)', 18, cursor, 174, 34, [
      { values: pulseSeries.map((r) => Number(r.pulse)), color: [225, 29, 72] }
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

  if (cursor > 205) {
    doc.addPage()
    cursor = 20
  }

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(12)
  doc.text('Complete Recorded Readings', 14, cursor)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(100, 116, 139)
  doc.text('All saved measurements and notes for the selected report period.', 14, cursor + 5)

  autoTable(doc, {
    startY: cursor + 9,
    theme: 'striped',
    styles: { fontSize: 7.5, cellPadding: 2.1, overflow: 'linebreak' },
    head: [['Date', 'Time', 'BP', 'Pulse', 'Sugar', 'Sugar Type', 'Notes']],
    body: sorted.map((reading) => {
      const date = new Date(reading.reading_timestamp)
      return [
        format(date, 'd MMM yyyy'),
        format(date, 'h:mm a'),
        bpValue(reading),
        pulseValue(reading),
        sugarValue(reading),
        reading.sugar_type || '—',
        reading.notes?.trim() || '—'
      ]
    }),
    margin: { bottom: 18 },
    columnStyles: {
      0: { cellWidth: 23 },
      1: { cellWidth: 20 },
      2: { cellWidth: 22 },
      3: { cellWidth: 17 },
      4: { cellWidth: 20 },
      5: { cellWidth: 25 },
      6: { cellWidth: 'auto' }
    }
  })

  const pageCount = doc.getNumberOfPages()
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    doc.setPage(pageNumber)
    const pageHeight = doc.internal.pageSize.getHeight()
    const pageWidth = doc.internal.pageSize.getWidth()

    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.2)
    doc.line(14, pageHeight - 13, pageWidth - 14, pageHeight - 13)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.2)
    doc.setTextColor(100, 116, 139)
    doc.text(
      'User-recorded measurements for record keeping and discussion with a healthcare professional. No medical interpretation is applied.',
      14,
      pageHeight - 8
    )
    doc.text('Page ' + pageNumber + ' of ' + pageCount, pageWidth - 14, pageHeight - 8, { align: 'right' })
  }

  const filename = 'health-report-' + format(start, 'yyyy-MM-dd') + '-to-' + format(end, 'yyyy-MM-dd') + '.pdf'
  return { blob: doc.output('blob'), filename }
}
