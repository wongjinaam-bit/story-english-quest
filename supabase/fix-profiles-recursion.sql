-- Fix infinite recursion in profiles RLS policies.
-- Paste this into Supabase SQL Editor and click Run once.

create or replace function public.current_user_role()
returns user_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Teachers can read students" on public.profiles;
drop policy if exists "Staff can read student profiles" on public.profiles;
drop policy if exists "Admins can read all profiles" on public.profiles;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Staff can read student profiles"
  on public.profiles for select
  using (
    role = 'student'
    and public.current_user_role() in ('teacher', 'admin')
  );

create policy "Admins can read all profiles"
  on public.profiles for select
  using (public.current_user_role() = 'admin');

drop policy if exists "Teachers can read student app state" on public.student_app_state;

create policy "Teachers can read student app state"
  on public.student_app_state for select
  using (public.current_user_role() in ('teacher', 'admin'));
