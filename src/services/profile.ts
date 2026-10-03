import { requireSupabase } from '../lib/supabase'
import type { UserProfile } from '../types'

export async function getProfile(): Promise<UserProfile | null> {
  const client = requireSupabase()
  const { data: auth } = await client.auth.getUser()
  if (!auth.user) return null

  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (error) throw new Error("Couldn't load your profile.")
  return data as UserProfile | null
}

export async function saveProfile(values: {
  name: string
  date_of_birth: string | null
  doctor_name: string | null
}) {
  const client = requireSupabase()
  const { data: auth } = await client.auth.getUser()
  if (!auth.user) throw new Error('Please sign in again.')

  const { error } = await client.from('profiles').upsert({
    user_id: auth.user.id,
    ...values,
    updated_at: new Date().toISOString()
  })

  if (error) throw new Error("Couldn't save your profile. Please try again.")
}
