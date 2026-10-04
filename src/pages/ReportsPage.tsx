import { useEffect, useMemo, useState } from 'react'
import { Download, FileSpreadsheet, Share2 } from 'lucide-react'
import { format } from 'date-fns'
import { BloodPressureChart, BloodSugarChart } from '../components/TrendChart'
import { formatPeriod, rollingWeek } from '../lib/date'
import { getProfile } from '../services/profile'
import { listReadings } from '../services/readings'
import type { HealthReading, SugarType, UserProfile } from '../types'
import {
  delta,
  deltaText,
  groupReadingsByDay,
  summarizeBp,
  summarizePulse,
  summarizeSugar
} from '../utils/stats'

const sugarTypes: SugarType[] = ['Fasting', 'Before Meal', 'After Meal', 'Random']

export default function ReportsPage() {
  const [offset, setOffset] = useState(0)
  const [readings, setReadings] = useState<HealthReading[]>([])
  const [previousReadings, setPreviousReadings] = useState<HealthReading[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [shareMessage, setShareMessage] = useState('')

  const period = useMemo(() => rollingWeek(offset), [offset])
  const previousPeriod = useMemo(() => rollingWeek(offset + 1), [offset])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    setShareMessage('')

    Promise.all([
      listReadings({ from: period.start, to: period.end }),
      listReadings({ from: previousPeriod.start, to: previousPeriod.end }),
      getProfile().catch(() => null)
    ])
      .then(([current, previous, userProfile]) => {
        if (!active) return
        setReadings(current)
        setPreviousReadings(previous)
        setProfile(userProfile)
      })
      .catch((err) => active && setError(err instanceof Error ? err.message : "Couldn't load this report."))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [period.start.getTime(), period.end.getTime(), previousPeriod.start.getTime(), previousPeriod.end.getTime()])

  const bp = summarizeBp(readings)
  const pulse = summarizePulse(readings)
  const sugar = summarizeSugar(readings)
  const previousBp = summarizeBp(previousReadings)
  const previousPulse = summarizePulse(previousReadings)
  const previousSugar = summarizeSugar(previousReadings)
  const grouped = groupReadingsByDay(readings)

  const sortedReadings = useMemo(
    () =>
      [...readings].sort(
        (a, b) => new Date(a.reading_timestamp).getTime() - new Date(b.reading_timestamp).getTime()
      ),
    [readings]
  )
  const daysTracked = Object.keys(grouped).length
  const totalMeasurements = bp.count + pulse.count + sugar.count
  const notesCount = readings.filter((reading) => Boolean(reading.notes?.trim())).length
  const firstReading = sortedReadings[0] ?? null
  const latestReading = sortedReadings[sortedReadings.length - 1] ?? null
  const sugarTypeCounts = sugarTypes.map((type) => ({
    type,
    count: readings.filter((reading) => reading.blood_sugar != null && reading.sugar_type === type).length
  }))
  const untypedSugarCount = readings.filter(
    (reading) => reading.blood_sugar != null && !reading.sugar_type
  ).length

  async function makePdf() {
    const { generateWeeklyReportPdf } = await import('../utils/pdf')
    return generateWeeklyReportPdf({
      readings,
      previousReadings,
      patientName: profile?.name,
      doctorName: profile?.doctor_name,
      start: period.start,
      end: period.end
    })
  }

  async function downloadPdf() {
    setExporting(true)
    try {
      const { blob, filename } = await makePdf()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  async function downloadCsv() {
    const { downloadReadingsCsv } = await import('../utils/csv')
    downloadReadingsCsv(readings, period.start, period.end)
  }

  async function sharePdf() {
    setExporting(true)
    try {
      const { blob, filename } = await makePdf()
      const file = new File([blob], filename, { type: 'application/pdf' })
      const nav = navigator as Navigator & {
        canShare?: (data?: ShareData) => boolean
      }

      if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
        try {
          await nav.share({
            title: 'Weekly Health Report',
            text: 'Health Tracker weekly report',
            files: [file]
          })
          setShareMessage('Report shared.')
          return
        } catch (shareError) {
          if ((shareError as DOMException)?.name === 'AbortError') return
        }
      }

      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      setShareMessage('Sharing is not available here, so the PDF was downloaded instead.')
    } finally {
      setExporting(false)
    }
  }

  const historyOptions = [0, 1, 2, 3].map((value) => {
    const range = rollingWeek(value)
    return {
      value,
      label: value === 0 ? 'This Week' : format(range.start, 'd MMM') + ' – ' + format(range.end, 'd MMM')
    }
  })

  return (
    <div className="px-5 pb-5 pt-6">
      <header>
        <p className="text-sm font-semibold text-blue-700">Doctor-friendly summary</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Weekly Report</h1>
        <p className="mt-1 text-base text-slate-600">{formatPeriod(period.start, period.end)}</p>
        {(profile?.name || profile?.doctor_name) && (
          <p className="mt-2 text-sm text-slate-500">
            {profile?.name ? `Patient: ${profile.name}` : ''}
            {profile?.name && profile?.doctor_name ? ' • ' : ''}
            {profile?.doctor_name ? `Doctor: ${profile.doctor_name}` : ''}
          </p>
        )}
      </header>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {historyOptions.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setOffset(item.value)}
            className={
              'min-h-11 shrink-0 rounded-2xl px-4 text-sm font-bold ' +
              (offset === item.value ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-700')
            }
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

      {loading ? (
        <div className="mt-5 rounded-3xl bg-white p-8 text-center text-slate-500 shadow-card">Building report…</div>
      ) : !readings.length ? (
        <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-card">
          <p className="font-bold text-slate-800">No readings were recorded during this week.</p>
          <p className="mt-1 text-sm text-slate-500">Statistics are only calculated from saved measurements.</p>
        </div>
      ) : (
        <>
          <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Week at a glance</p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">Tracking Overview</h2>
              <p className="mt-1 text-sm text-slate-500">
                A quick view of how much data was recorded during this report period.
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <OverviewItem label="Saved entries" value={String(readings.length)} />
              <OverviewItem label="Days tracked" value={daysTracked + ' / 7'} />
              <OverviewItem label="Measurements" value={String(totalMeasurements)} />
              <OverviewItem label="Entries with notes" value={String(notesCount)} />
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                <span>
                  <strong className="text-slate-800">First:</strong>{' '}
                  {firstReading ? format(new Date(firstReading.reading_timestamp), 'EEE, d MMM • h:mm a') : '—'}
                </span>
                <span>
                  <strong className="text-slate-800">Latest:</strong>{' '}
                  {latestReading ? format(new Date(latestReading.reading_timestamp), 'EEE, d MMM • h:mm a') : '—'}
                </span>
              </div>
            </div>
          </section>

          <ReportSummaryCard
            title="Blood Pressure"
            unit="mmHg"
            count={bp.count}
            average={bp.count ? bp.averageSystolic + ' / ' + bp.averageDiastolic : '—'}
            highest={bp.highest ? bp.highest.systolic + ' / ' + bp.highest.diastolic : '—'}
            lowest={bp.lowest ? bp.lowest.systolic + ' / ' + bp.lowest.diastolic : '—'}
            latest={bp.latest ? bp.latest.systolic + ' / ' + bp.latest.diastolic : '—'}
          >
            <BloodPressureChart readings={readings} />
          </ReportSummaryCard>

          <ReportSummaryCard
            title="Pulse"
            unit="bpm"
            count={pulse.count}
            average={pulse.count ? String(pulse.average) : '—'}
            highest={pulse.highest ? String(pulse.highest.pulse) : '—'}
            lowest={pulse.lowest ? String(pulse.lowest.pulse) : '—'}
            latest={pulse.latest ? String(pulse.latest.pulse) : '—'}
          >
            <p className="rounded-2xl bg-rose-50 p-4 text-sm font-medium text-rose-700">
              Pulse readings are recorded in beats per minute and included in the downloadable report.
            </p>
          </ReportSummaryCard>

          <ReportSummaryCard
            title="Blood Sugar"
            unit="mg/dL"
            count={sugar.count}
            average={sugar.count ? String(sugar.average) : '—'}
            highest={sugar.highest ? String(sugar.highest.blood_sugar) : '—'}
            lowest={sugar.lowest ? String(sugar.lowest.blood_sugar) : '—'}
            latest={sugar.latest ? String(sugar.latest.blood_sugar) : '—'}
          >
            <BloodSugarChart readings={readings} />
          </ReportSummaryCard>

          {sugar.count > 0 && (
            <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
              <h2 className="text-lg font-bold text-slate-900">Blood Sugar Timing</h2>
              <p className="mt-1 text-sm text-slate-500">
                Shows the context selected when each sugar reading was recorded.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {sugarTypeCounts.map((item) => (
                  <OverviewItem key={item.type} label={item.type} value={String(item.count)} />
                ))}
                {untypedSugarCount > 0 && <OverviewItem label="Not specified" value={String(untypedSugarCount)} />}
              </div>
            </section>
          )}

          {(bp.count > 0 || pulse.count > 0 || sugar.count > 0) && (
            <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
              <h2 className="text-lg font-bold text-slate-900">Compared With Previous 7 Days</h2>
              <p className="mt-1 text-sm text-slate-500">Numerical change only. No medical interpretation is applied.</p>

              <div className="mt-4 space-y-3">
                {bp.count > 0 && previousBp.count > 0 && (
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="font-bold text-slate-800">Blood Pressure Average</p>
                    <p className="mt-1 text-sm text-slate-600">
                      This period: {bp.averageSystolic} / {bp.averageDiastolic} • Previous: {previousBp.averageSystolic} / {previousBp.averageDiastolic}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-sm font-semibold text-slate-700">
                      <span>Systolic {deltaText(delta(bp.averageSystolic, previousBp.averageSystolic))}</span>
                      <span>Diastolic {deltaText(delta(bp.averageDiastolic, previousBp.averageDiastolic))}</span>
                    </div>
                  </div>
                )}

                {pulse.count > 0 && previousPulse.count > 0 && (
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="font-bold text-slate-800">Pulse Average</p>
                    <p className="mt-1 text-sm text-slate-600">
                      This period: {pulse.average} bpm • Previous: {previousPulse.average} bpm
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-700">
                      {deltaText(delta(pulse.average, previousPulse.average), 'bpm')}
                    </p>
                  </div>
                )}

                {sugar.count > 0 && previousSugar.count > 0 && (
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="font-bold text-slate-800">Blood Sugar Average</p>
                    <p className="mt-1 text-sm text-slate-600">
                      This period: {sugar.average} mg/dL • Previous: {previousSugar.average} mg/dL
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-700">
                      {deltaText(delta(sugar.average, previousSugar.average), 'mg/dL')}
                    </p>
                  </div>
                )}

                {previousBp.count === 0 && previousPulse.count === 0 && previousSugar.count === 0 && (
                  <p className="text-sm text-slate-500">No previous-period readings are available for comparison.</p>
                )}
              </div>
            </section>
          )}

          <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="text-lg font-bold text-slate-900">Daily Readings</h2>
            <p className="mt-1 text-sm text-slate-500">Complete day-by-day record, including saved notes.</p>
            <div className="mt-4 space-y-5">
              {Object.entries(grouped).map(([day, dayReadings]) => (
                <div key={day}>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                    {new Date(day + 'T12:00:00').toLocaleDateString(undefined, {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'short'
                    })}
                  </h3>
                  <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200">
                    {dayReadings.map((reading, index) => (
                      <div key={reading.id} className={'p-3 ' + (index ? 'border-t border-slate-100' : '')}>
                        <p className="text-sm font-bold text-slate-500">
                          {new Date(reading.reading_timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-slate-800">
                          {reading.systolic != null && reading.diastolic != null && (
                            <span>BP: {reading.systolic} / {reading.diastolic}</span>
                          )}
                          {reading.pulse != null && <span>Pulse: {reading.pulse} bpm</span>}
                          {reading.blood_sugar != null && <span>Sugar: {reading.blood_sugar} mg/dL</span>}
                          {reading.sugar_type && <span className="font-medium text-slate-600">{reading.sugar_type}</span>}
                        </div>
                        {reading.notes?.trim() && (
                          <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm leading-5 text-amber-900">
                            <strong>Note:</strong> {reading.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={downloadPdf}
              disabled={exporting}
              className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-white px-3 font-bold text-blue-700 disabled:opacity-60"
            >
              <Download size={20} />
              {exporting ? 'Preparing…' : 'Download PDF'}
            </button>
            <button
              type="button"
              onClick={sharePdf}
              disabled={exporting}
              className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-3 font-bold text-white disabled:opacity-60"
            >
              <Share2 size={20} />
              Share Report
            </button>
            <button
              type="button"
              onClick={downloadCsv}
              className="col-span-2 flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
            >
              <FileSpreadsheet size={19} />
              Download CSV Backup
            </button>
          </section>

          {shareMessage && <p className="mt-3 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700" role="status">{shareMessage}</p>}

          <p className="mt-4 px-2 text-center text-xs leading-5 text-slate-500">
            This report contains user-recorded measurements and is intended for record keeping and discussion with a healthcare professional.
          </p>
        </>
      )}
    </div>
  )
}

function ReportSummaryCard({
  title,
  unit,
  count,
  average,
  highest,
  lowest,
  latest,
  children
}: {
  title: string
  unit: string
  count: number
  average: string
  highest: string
  lowest: string
  latest: string
  children: React.ReactNode
}) {
  return (
    <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500">{count} reading{count === 1 ? '' : 's'}</p>
        </div>
        <span className="text-xs font-bold text-slate-400">{unit}</span>
      </div>

      {count ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <SummaryItem label="Average" value={average} />
            <SummaryItem label="Latest" value={latest} />
            <SummaryItem label="Highest Recorded" value={highest} />
            <SummaryItem label="Lowest Recorded" value={lowest} />
          </div>
          <div className="mt-5">{children}</div>
        </>
      ) : (
        <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-medium text-slate-500">
          No readings were recorded for this measurement.
        </p>
      )}
    </section>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
    </div>
  )
}

function OverviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
    </div>
  )
}
