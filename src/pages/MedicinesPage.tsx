import { useEffect, useState, type FormEvent } from 'react'
import { CheckCircle2, CircleOff, Pencil, Pill, Plus, Save, Trash2, X } from 'lucide-react'
import {
  createMedication,
  deleteMedication,
  listMedications,
  updateMedication
} from '../services/medications'
import type { Medication, MedicationInput, MedicationPurpose } from '../types'

const purposes: MedicationPurpose[] = ['Blood Pressure', 'Blood Sugar', 'Both', 'Other']

const emptyForm: MedicationInput = {
  name: '',
  purpose: 'Blood Pressure',
  dosage: '',
  schedule: '',
  notes: '',
  is_active: true
}

export default function MedicinesPage() {
  const [medicines, setMedicines] = useState<Medication[]>([])
  const [form, setForm] = useState<MedicationInput>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function loadMedicines() {
    setLoading(true)
    setError('')
    try {
      setMedicines(await listMedications())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load medicines.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMedicines()
  }, [])

  function updateForm<K extends keyof MedicationInput>(key: K, value: MedicationInput[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function startEdit(medicine: Medication) {
    setEditingId(medicine.id)
    setForm({
      name: medicine.name,
      purpose: medicine.purpose,
      dosage: medicine.dosage,
      schedule: medicine.schedule || '',
      notes: medicine.notes || '',
      is_active: medicine.is_active
    })
    setMessage('')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetForm() {
    setEditingId(null)
    setForm(emptyForm)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const name = form.name.trim()
    const dosage = form.dosage.trim()

    if (!name || !dosage) {
      setError('Medicine name and dosage are required.')
      return
    }

    const payload: MedicationInput = {
      ...form,
      name,
      dosage,
      schedule: form.schedule?.trim() || null,
      notes: form.notes?.trim() || null
    }

    setSaving(true)
    setError('')
    setMessage('')

    try {
      if (editingId) {
        await updateMedication(editingId, payload)
        setMessage('Medicine updated.')
      } else {
        await createMedication(payload)
        setMessage('Medicine added.')
      }
      resetForm()
      await loadMedicines()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save this medicine.")
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(medicine: Medication) {
    setError('')
    setMessage('')
    try {
      await updateMedication(medicine.id, {
        name: medicine.name,
        purpose: medicine.purpose,
        dosage: medicine.dosage,
        schedule: medicine.schedule,
        notes: medicine.notes,
        is_active: !medicine.is_active
      })
      setMessage(medicine.is_active ? 'Medicine marked as stopped.' : 'Medicine marked as active.')
      await loadMedicines()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update this medicine.")
    }
  }

  async function removeMedicine(medicine: Medication) {
    const confirmed = window.confirm(`Delete ${medicine.name} from the medicine list?`)
    if (!confirmed) return

    setError('')
    setMessage('')
    try {
      await deleteMedication(medicine.id)
      if (editingId === medicine.id) resetForm()
      setMessage('Medicine deleted.')
      await loadMedicines()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete this medicine.")
    }
  }

  const activeMedicines = medicines.filter((medicine) => medicine.is_active)
  const stoppedMedicines = medicines.filter((medicine) => !medicine.is_active)

  return (
    <div className="px-5 pb-5 pt-6">
      <header>
        <p className="text-sm font-semibold text-blue-700">Medication record</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Medicines</h1>
        <p className="mt-1 text-base leading-6 text-slate-600">
          Keep medicine names, dosage and instructions together so they are easy to remember and show your doctor.
        </p>
      </header>

      {error && (
        <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
      )}
      {message && (
        <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div>
      )}

      <form onSubmit={submit} className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{editingId ? 'Edit Medicine' : 'Add Medicine'}</h2>
            <p className="mt-1 text-sm text-slate-500">Copy the details exactly from the prescription or medicine label.</p>
          </div>
          <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
            <Pill size={23} />
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <Field label="Medicine name">
            <input
              value={form.name}
              onChange={(event) => updateForm('name', event.target.value)}
              className="h-14 w-full bg-transparent px-4 text-base outline-none"
              placeholder="e.g. medicine name"
              autoComplete="off"
            />
          </Field>

          <Field label="Used for">
            <select
              value={form.purpose}
              onChange={(event) => updateForm('purpose', event.target.value as MedicationPurpose)}
              className="h-14 w-full bg-transparent px-4 text-base outline-none"
            >
              {purposes.map((purpose) => (
                <option key={purpose} value={purpose}>{purpose}</option>
              ))}
            </select>
          </Field>

          <Field label="Dosage / strength">
            <input
              value={form.dosage}
              onChange={(event) => updateForm('dosage', event.target.value)}
              className="h-14 w-full bg-transparent px-4 text-base outline-none"
              placeholder="e.g. 5 mg or 1 tablet"
              autoComplete="off"
            />
          </Field>

          <Field label="When to take (optional)">
            <input
              value={form.schedule || ''}
              onChange={(event) => updateForm('schedule', event.target.value)}
              className="h-14 w-full bg-transparent px-4 text-base outline-none"
              placeholder="e.g. Morning after breakfast"
              autoComplete="off"
            />
          </Field>

          <Field label="Notes (optional)">
            <textarea
              value={form.notes || ''}
              onChange={(event) => updateForm('notes', event.target.value)}
              rows={3}
              className="w-full resize-none bg-transparent px-4 py-3 text-base outline-none"
              placeholder="Any prescription note you want to remember"
            />
          </Field>

          <label className="flex min-h-14 items-center justify-between rounded-2xl border border-slate-200 px-4">
            <div>
              <p className="font-bold text-slate-800">Currently taking</p>
              <p className="text-sm text-slate-500">Turn this off when the medicine is stopped.</p>
            </div>
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => updateForm('is_active', event.target.checked)}
              className="h-5 w-5 accent-blue-600"
            />
          </label>

          <div className="flex gap-3">
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 font-bold text-slate-700"
              >
                <X size={20} />
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 font-bold text-white disabled:opacity-60"
            >
              {editingId ? <Save size={20} /> : <Plus size={20} />}
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Medicine'}
            </button>
          </div>
        </div>
      </form>

      <section className="mt-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Current Medicines</h2>
            <p className="text-sm text-slate-500">{activeMedicines.length} active</p>
          </div>
        </div>

        {loading ? (
          <div className="mt-3 rounded-3xl bg-white p-7 text-center text-sm text-slate-500 shadow-card">Loading medicines…</div>
        ) : activeMedicines.length ? (
          <div className="mt-3 space-y-3">
            {activeMedicines.map((medicine) => (
              <MedicineCard
                key={medicine.id}
                medicine={medicine}
                onEdit={() => startEdit(medicine)}
                onToggle={() => toggleActive(medicine)}
                onDelete={() => removeMedicine(medicine)}
              />
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-card">
            <Pill className="mx-auto text-slate-300" size={30} />
            <p className="mt-3 font-bold text-slate-800">No active medicines added yet.</p>
            <p className="mt-1 text-sm text-slate-500">Add prescribed medicines above to keep them in one place.</p>
          </div>
        )}
      </section>

      {stoppedMedicines.length > 0 && (
        <section className="mt-5">
          <h2 className="text-lg font-bold text-slate-900">Stopped Medicines</h2>
          <p className="mt-1 text-sm text-slate-500">Kept here as a simple medication history.</p>
          <div className="mt-3 space-y-3 opacity-80">
            {stoppedMedicines.map((medicine) => (
              <MedicineCard
                key={medicine.id}
                medicine={medicine}
                onEdit={() => startEdit(medicine)}
                onToggle={() => toggleActive(medicine)}
                onDelete={() => removeMedicine(medicine)}
              />
            ))}
          </div>
        </section>
      )}

      <p className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
        Health Tracker only stores the medicine information you enter. It does not recommend medicines or doses. Follow your doctor or pharmacist's instructions.
      </p>
    </div>
  )
}

function MedicineCard({
  medicine,
  onEdit,
  onToggle,
  onDelete
}: {
  medicine: Medication
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words text-lg font-bold text-slate-900">{medicine.name}</h3>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{medicine.purpose}</span>
          </div>
          <p className="mt-2 text-base font-bold text-slate-800">{medicine.dosage}</p>
          {medicine.schedule && <p className="mt-1 text-sm text-slate-600">{medicine.schedule}</p>}
          {medicine.notes && <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm leading-5 text-slate-600">{medicine.notes}</p>}
        </div>
        <div className={`rounded-full px-2.5 py-1 text-xs font-bold ${medicine.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
          {medicine.is_active ? 'Active' : 'Stopped'}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">
        <button type="button" onClick={onEdit} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-slate-50 text-sm font-bold text-slate-700">
          <Pencil size={16} />
          Edit
        </button>
        <button type="button" onClick={onToggle} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-slate-50 text-sm font-bold text-slate-700">
          {medicine.is_active ? <CircleOff size={16} /> : <CheckCircle2 size={16} />}
          {medicine.is_active ? 'Stop' : 'Resume'}
        </button>
        <button type="button" onClick={onDelete} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-red-50 text-sm font-bold text-red-600">
          <Trash2 size={16} />
          Delete
        </button>
      </div>
    </article>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <div className="mt-2 overflow-hidden rounded-2xl border border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
        {children}
      </div>
    </label>
  )
}
