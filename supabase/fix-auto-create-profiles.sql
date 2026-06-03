-- Automatically create a public profile whenever a new Supabase Auth user signs up.
-- This helps teachers see students registered from other devices.
-- Paste this into Supabase SQL Editor and click Run once.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_role text;
begin
  meta_role := coalesce(new.raw_user_meta_data->>'role', 'student');

  insert into public.profiles (
    id,
    name,
    username,
    role,
    avatar,
    last_seen_at
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'username', split_part(new.email, '@', 1), 'Student'),
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    case when meta_role in ('student', 'teacher', 'admin') then meta_role::public.user_role else 'student'::public.user_role end,
    coalesce(new.raw_user_meta_data->>'avatar', '⭐'),
    now()
  )
  on conflict (id) do update set
    name = excluded.name,
    username = excluded.username,
    role = excluded.role,
    avatar = excluded.avatar,
    last_seen_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;

create trigger on_auth_user_created_create_profile
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

insert into public.profiles (
  id,
  name,
  username,
  role,
  avatar,
  last_seen_at
)
select
  users.id,
  coalesce(users.raw_user_meta_data->>'name', users.raw_user_meta_data->>'username', split_part(users.email, '@', 1), 'Student'),
  coalesce(users.raw_user_meta_data->>'username', split_part(users.email, '@', 1)),
  case
    when coalesce(users.raw_user_meta_data->>'role', 'student') in ('student', 'teacher', 'admin')
      then (users.raw_user_meta_data->>'role')::public.user_role
    else 'student'::public.user_role
  end,
  coalesce(users.raw_user_meta_data->>'avatar', '⭐'),
  now()
from auth.users
left join public.profiles profiles on profiles.id = users.id
where profiles.id is null;

drop policy if exists "Staff can read student profiles" on public.profiles;

create policy "Staff can read student profiles" on public.profiles
  for select using (
    role = 'student'
    and public.current_user_role() in ('teacher', 'admin')
  );
