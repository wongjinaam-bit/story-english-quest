-- Teacher tools upgrade: assignments and editable course drafts.
-- Paste into Supabase SQL Editor and click Run once.

create table if not exists public.app_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id text not null,
  skill text not null default 'all',
  due_date date,
  note text,
  status text not null default 'assigned',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.course_drafts (
  id text primary key,
  title text not null,
  topic text not null,
  level int not null default 1,
  cover text not null default '📘',
  pattern text not null default 'I see a ____.',
  status text not null default 'draft',
  content jsonb not null default '{}',
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.app_assignments enable row level security;
alter table public.course_drafts enable row level security;

drop policy if exists "Students can read own app assignments" on public.app_assignments;
drop policy if exists "Teachers can manage app assignments" on public.app_assignments;
drop policy if exists "Staff can manage course drafts" on public.course_drafts;
drop policy if exists "Authenticated users can read course drafts" on public.course_drafts;

create policy "Students can read own app assignments"
  on public.app_assignments for select
  using (auth.uid() = student_id);

create policy "Teachers can manage app assignments"
  on public.app_assignments for all
  using (public.current_user_role() in ('teacher', 'admin'))
  with check (public.current_user_role() in ('teacher', 'admin'));

create policy "Staff can manage course drafts"
  on public.course_drafts for all
  using (public.current_user_role() in ('teacher', 'admin'))
  with check (public.current_user_role() in ('teacher', 'admin'));

create policy "Authenticated users can read course drafts"
  on public.course_drafts for select
  using (auth.role() = 'authenticated');
