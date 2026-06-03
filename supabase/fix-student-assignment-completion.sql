-- Allow students to mark their own assigned tasks as completed.
-- Paste this into Supabase SQL Editor and click Run once.

alter table public.app_assignments enable row level security;

drop policy if exists "Students can complete own app assignments" on public.app_assignments;

create policy "Students can complete own app assignments"
  on public.app_assignments for update
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);
