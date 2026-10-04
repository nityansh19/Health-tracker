-- One-time migration: add medicine tracking to an existing Health Tracker database.
-- Run this in the Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  purpose text not null,
  dosage text not null,
  schedule text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint medications_name_not_blank
    check (length(trim(name)) > 0),

  constraint medications_dosage_not_blank
    check (length(trim(dosage)) > 0),

  constraint medications_purpose
    check (purpose in ('Blood Pressure', 'Blood Sugar', 'Both', 'Other'))
);

create index if not exists medications_user_active_idx
  on public.medications (user_id, is_active, name);

alter table public.medications enable row level security;

drop policy if exists "Users can read own medicines" on public.medications;
create policy "Users can read own medicines"
  on public.medications for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create own medicines" on public.medications;
create policy "Users can create own medicines"
  on public.medications for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can edit own medicines" on public.medications;
create policy "Users can edit own medicines"
  on public.medications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own medicines" on public.medications;
create policy "Users can delete own medicines"
  on public.medications for delete
  using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists medications_set_updated_at on public.medications;
create trigger medications_set_updated_at
before update on public.medications
for each row execute function public.set_updated_at();
