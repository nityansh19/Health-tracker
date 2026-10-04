export type SugarType = 'Fasting' | 'Before Meal' | 'After Meal' | 'Random'

export interface HealthReading {
  id: string
  user_id: string
  systolic: number | null
  diastolic: number | null
  pulse: number | null
  blood_sugar: number | null
  sugar_type: SugarType | null
  notes: string | null
  reading_timestamp: string
  created_at: string
  updated_at: string
}

export interface ReadingInput {
  systolic: number | null
  diastolic: number | null
  pulse: number | null
  blood_sugar: number | null
  sugar_type: SugarType | null
  notes: string | null
  reading_timestamp: string
}

export interface UserProfile {
  user_id: string
  name: string
  date_of_birth: string | null
  doctor_name: string | null
  updated_at: string
}

export type MeasurementFilter = 'all' | 'bp' | 'sugar' | 'pulse'
