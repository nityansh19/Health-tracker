-- Health Tracker database schema
-- Run this file once in the Supabase SQL Editor.

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

create index if not exists health_readings_user_time_idx
  on public.health_readings (user_id, reading_timestamp desc);

alter table public.profiles enable row level security;
alter table public.health_readings enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can read own readings" on public.health_readings;
create policy "Users can read own readings"
  on public.health_readings for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create own readings" on public.health_readings;
create policy "Users can create own readings"
  on public.health_readings for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can edit own readings" on public.health_readings;
create policy "Users can edit own readings"
  on public.health_readings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own readings" on public.health_readings;
create policy "Users can delete own readings"
  on public.health_readings for delete
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

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists health_readings_set_updated_at on public.health_readings;
create trigger health_readings_set_updated_at
before update on public.health_readings
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
