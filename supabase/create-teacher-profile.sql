-- Create or repair the teacher profile after creating the teacher user in Supabase Auth.
-- Step 1: In Supabase Authentication > Users, create this user:
--   Email: teacher@example.com
--   Password: teacher123
-- Step 2: Paste this SQL into SQL Editor and click Run once.

insert into public.profiles (id, name, username, role, avatar, last_seen_at)
select id, 'Teacher', 'teacher', 'teacher', 'T', now()
from auth.users
where email = 'teacher@example.com'
on conflict (id) do update
set
  name = excluded.name,
  username = excluded.username,
  role = excluded.role,
  avatar = excluded.avatar,
  last_seen_at = excluded.last_seen_at;
