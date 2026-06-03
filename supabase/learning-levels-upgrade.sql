-- Learning levels upgrade.
-- Paste this into Supabase SQL Editor and click Run once.

do $$
begin
  create type learning_level as enum ('beginner', 'intermediate', 'advanced');
exception
  when duplicate_object then null;
end $$;

alter table public.profiles
  add column if not exists proficiency_level learning_level not null default 'beginner';

update public.profiles
set proficiency_level = 'beginner'
where proficiency_level is null;

create or replace function public.current_user_role()
returns user_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

drop policy if exists "Staff can update student learning levels" on public.profiles;

create policy "Staff can update student learning levels"
  on public.profiles for update
  using (
    role = 'student'
    and public.current_user_role() in ('teacher', 'admin')
  )
  with check (
    role = 'student'
    and public.current_user_role() in ('teacher', 'admin')
  );
