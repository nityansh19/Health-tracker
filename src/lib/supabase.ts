import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const supabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey)

export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(supabaseUrl as string, supabasePublishableKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null

export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error('Health Tracker is not connected to Supabase yet.')
  }
  return supabase
}
