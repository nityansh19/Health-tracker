import { requireSupabase } from '../lib/supabase'
import type { HealthReading, MeasurementFilter, ReadingInput } from '../types'

const RECENT_CACHE_KEY = 'health-tracker-recent-readings'

export interface ReadingQuery {
  measurement?: MeasurementFilter
  from?: Date
  to?: Date
  limit?: number
}

function applyMeasurement(query: any, measurement: MeasurementFilter = 'all') {
  if (measurement === 'bp') {
    return query.not('systolic', 'is', null).not('diastolic', 'is', null)
  }
  if (measurement === 'sugar') {
    return query.not('blood_sugar', 'is', null)
  }
  return query
}

export async function listReadings(filters: ReadingQuery = {}): Promise<HealthReading[]> {
  const client = requireSupabase()
  let query: any = client
    .from('health_readings')
    .select('*')
    .order('reading_timestamp', { ascending: false })

  query = applyMeasurement(query, filters.measurement)

  if (filters.from) query = query.gte('reading_timestamp', filters.from.toISOString())
  if (filters.to) query = query.lte('reading_timestamp', filters.to.toISOString())
  if (filters.limit) query = query.limit(filters.limit)

  const { data, error } = await query
  if (error) throw new Error("Couldn't load your readings.")
  return (data ?? []) as HealthReading[]
}

export async function listRecentReadings(limit = 5): Promise<{ readings: HealthReading[]; offline: boolean }> {
  try {
    const readings = await listReadings({ limit })
    localStorage.setItem(RECENT_CACHE_KEY, JSON.stringify(readings))
    return { readings, offline: false }
  } catch {
    const cached = localStorage.getItem(RECENT_CACHE_KEY)
    if (!cached) throw new Error("Couldn't load your readings.")
    try {
      const readings = JSON.parse(cached) as HealthReading[]
      return { readings: readings.slice(0, limit), offline: true }
    } catch {
      throw new Error("Couldn't load your readings.")
    }
  }
}

export async function getReading(id: string): Promise<HealthReading> {
  const client = requireSupabase()
  const { data, error } = await client.from('health_readings').select('*').eq('id', id).single()
  if (error || !data) throw new Error("Couldn't load this reading.")
  return data as HealthReading
}

export async function createReading(input: ReadingInput) {
  const client = requireSupabase()
  const { error } = await client.from('health_readings').insert(input)
  if (error) throw new Error("Couldn't save your reading. Please try again.")
}

export async function updateReading(id: string, input: ReadingInput) {
  const client = requireSupabase()
  const { error } = await client.from('health_readings').update(input).eq('id', id)
  if (error) throw new Error("Couldn't update your reading. Please try again.")
}

export async function deleteReading(id: string) {
  const client = requireSupabase()
  const { error } = await client.from('health_readings').delete().eq('id', id)
  if (error) throw new Error("Couldn't delete this reading. Please try again.")
}
