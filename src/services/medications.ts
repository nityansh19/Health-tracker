import { requireSupabase } from '../lib/supabase'
import type { Medication, MedicationInput } from '../types'

export async function listMedications(options: { activeOnly?: boolean } = {}): Promise<Medication[]> {
  const client = requireSupabase()
  let query = client
    .from('medications')
    .select('*')
    .order('is_active', { ascending: false })
    .order('name', { ascending: true })

  if (options.activeOnly) query = query.eq('is_active', true)

  const { data, error } = await query
  if (error) {
    if (error.code === '42P01') {
      throw new Error('Medicine storage needs a one-time database setup before it can be used.')
    }
    throw new Error("Couldn't load medicines.")
  }

  return (data ?? []) as Medication[]
}

export async function createMedication(input: MedicationInput) {
  const client = requireSupabase()
  const { data: auth } = await client.auth.getUser()
  if (!auth.user) throw new Error('Please sign in again.')

  const { error } = await client.from('medications').insert({
    user_id: auth.user.id,
    ...input
  })

  if (error) {
    if (error.code === '42P01') {
      throw new Error('Medicine storage needs a one-time database setup before it can be used.')
    }
    throw new Error("Couldn't save this medicine. Please try again.")
  }
}

export async function updateMedication(id: string, input: MedicationInput) {
  const client = requireSupabase()
  const { data: auth } = await client.auth.getUser()
  if (!auth.user) throw new Error('Please sign in again.')

  const { error } = await client
    .from('medications')
    .update(input)
    .eq('id', id)
    .eq('user_id', auth.user.id)

  if (error) throw new Error("Couldn't update this medicine. Please try again.")
}

export async function deleteMedication(id: string) {
  const client = requireSupabase()
  const { data: auth } = await client.auth.getUser()
  if (!auth.user) throw new Error('Please sign in again.')

  const { error } = await client
    .from('medications')
    .delete()
    .eq('id', id)
    .eq('user_id', auth.user.id)

  if (error) throw new Error("Couldn't delete this medicine. Please try again.")
}
