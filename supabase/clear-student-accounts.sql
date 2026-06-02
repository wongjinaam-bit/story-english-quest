-- Clear all student accounts and student progress.
-- This keeps teacher/admin accounts.
-- Paste this into Supabase SQL Editor and click Run once.

delete from public.student_app_state
where student_id in (
  select id from public.profiles where role = 'student'
);

delete from public.profiles
where role = 'student';

delete from auth.users
where email like '%@story-english-quest.local'
   or raw_user_meta_data->>'role' = 'student';
