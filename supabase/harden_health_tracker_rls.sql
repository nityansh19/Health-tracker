-- Security hardening applied to the connected production Supabase project.
-- Keeps Data API grants minimal and optimizes RLS auth checks.

alter function public.set_updated_at() set search_path = '';

revoke execute on function public.handle_new_user() from public, anon, authenticated;

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
