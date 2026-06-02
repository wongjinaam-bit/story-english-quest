-- Allow every student app session, including local/demo mode, to read published courses.
-- Paste this into Supabase SQL Editor and click Run once.

alter table public.course_drafts enable row level security;

drop policy if exists "Anyone can read published course drafts" on public.course_drafts;

create policy "Anyone can read published course drafts"
  on public.course_drafts for select
  using (status = 'published');
