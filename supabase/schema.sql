-- Health Tracker database schema
-- Run this file once in the Supabase SQL Editor for a fresh setup.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  date_of_birth date,
  doctor_name text,
  updated_at timestamptz not null default now()
);

create table if not exists public.health_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  systolic integer,
  diastolic integer,
  blood_sugar numeric(7,1),
  sugar_type text,
  notes text,
  reading_timestamp timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint health_readings_at_least_one_measurement
    check (
      (systolic is not null and diastolic is not null)
      or blood_sugar is not null
    ),

  constraint health_readings_bp_pair
    check (
      (systolic is null and diastolic is null)
      or (systolic is not null and diastolic is not null)
    ),

  constraint health_readings_positive_values
    check (
      (systolic is null or systolic > 0)
      and (diastolic is null or diastolic > 0)
      and (blood_sugar is null or blood_sugar > 0)
    ),

  constraint health_readings_sugar_type
    check (
      sugar_type is null
      or sugar_type in ('Fasting', 'Before Meal', 'After Meal', 'Random')
    )
);

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

create index if not exists health_readings_user_time_idx
  on public.health_readings (user_id, reading_timestamp desc);

create index if not exists medications_user_active_idx
  on public.medications (user_id, is_active, name);

alter table public.profiles enable row level security;
alter table public.health_readings enable row level security;
alter table public.medications enable row level security;

revoke all on table public.profiles from anon, authenticated, service_role;
grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.profiles to service_role;

revoke all on table public.health_readings from anon, authenticated, service_role;
grant select, insert, update, delete on table public.health_readings to authenticated;
grant select, insert, update, delete on table public.health_readings to service_role;

revoke all on table public.medications from anon, authenticated, service_role;
grant select, insert, update, delete on table public.medications to authenticated;
grant select, insert, update, delete on table public.medications to service_role;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can read own readings" on public.health_readings;
create policy "Users can read own readings"
  on public.health_readings for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own readings" on public.health_readings;
create policy "Users can create own readings"
  on public.health_readings for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can edit own readings" on public.health_readings;
create policy "Users can edit own readings"
  on public.health_readings for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own readings" on public.health_readings;
create policy "Users can delete own readings"
  on public.health_readings for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own medicines" on public.medications;
create policy "Users can read own medicines"
  on public.medications for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own medicines" on public.medications;
create policy "Users can create own medicines"
  on public.medications for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can edit own medicines" on public.medications;
create policy "Users can edit own medicines"
  on public.medications for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own medicines" on public.medications;
create policy "Users can delete own medicines"
  on public.medications for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists health_readings_set_updated_at on public.health_readings;
create trigger health_readings_set_updated_at
before update on public.health_readings
for each row execute function public.set_updated_at();

drop trigger if exists medications_set_updated_at on public.medications;
create trigger medications_set_updated_at
before update on public.medications
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
