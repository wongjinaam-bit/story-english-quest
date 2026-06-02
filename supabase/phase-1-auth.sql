-- Phase 1: real student accounts and cloud progress.
-- Run this in Supabase SQL Editor after the original schema.sql.

alter table public.profiles
  add column if not exists username text,
  add column if not exists avatar text,
  add column if not exists last_seen_at timestamptz;

create unique index if not exists profiles_username_unique
  on public.profiles (lower(username))
  where username is not null;

create table if not exists public.student_app_state (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  progress jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.student_app_state enable row level security;

drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Teachers can read students" on public.profiles;
drop policy if exists "Admins can read all profiles" on public.profiles;

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Teachers can read students"
  on public.profiles for select
  using (
    role = 'student'
    and exists (
      select 1 from public.profiles teacher
      where teacher.id = auth.uid()
      and teacher.role in ('teacher', 'admin')
    )
  );

create policy "Admins can read all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles admin_profile
      where admin_profile.id = auth.uid()
      and admin_profile.role = 'admin'
    )
  );

drop policy if exists "Students can manage own app state" on public.student_app_state;
drop policy if exists "Teachers can read student app state" on public.student_app_state;

create policy "Students can manage own app state"
  on public.student_app_state for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

create policy "Teachers can read student app state"
  on public.student_app_state for select
  using (
    exists (
      select 1 from public.profiles staff
      where staff.id = auth.uid()
      and staff.role in ('teacher', 'admin')
    )
  );

-- Optional: create a teacher profile after creating the teacher user in Supabase Auth.
-- Replace the UUID with the teacher auth user id:
--
-- insert into public.profiles (id, name, username, role, avatar)
-- values ('00000000-0000-0000-0000-000000000000', 'Teacher', 'teacher', 'teacher', 'T')
-- on conflict (id) do update set role = 'teacher', name = excluded.name;
