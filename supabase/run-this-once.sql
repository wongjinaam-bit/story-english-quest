-- Story English Quest - Supabase setup
-- Paste this whole file into Supabase SQL Editor and click Run once.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('student', 'teacher', 'admin');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'skill_type') then
    create type skill_type as enum ('listen', 'speak', 'read', 'write');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  username text,
  role user_role not null default 'student',
  avatar text,
  class_id uuid,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  teacher_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists username text,
  add column if not exists avatar text,
  add column if not exists last_seen_at timestamptz,
  add column if not exists class_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_class_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_class_id_fkey foreign key (class_id) references public.classes(id);
  end if;
end $$;

create unique index if not exists profiles_username_unique
  on public.profiles (lower(username))
  where username is not null;

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  topic text not null,
  level int not null default 1,
  cover_image text,
  sentence_pattern text,
  order_index int not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.story_sentences (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  english_text text not null,
  chinese_text text not null,
  image_url text,
  audio_text text,
  order_index int not null default 0
);

create table if not exists public.words (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  word text not null,
  meaning text not null,
  part_of_speech text not null,
  example_sentence text,
  example_translation text,
  image_url text,
  topic text,
  level text
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  skill skill_type not null,
  question_type text not null,
  prompt text not null,
  correct_answer text not null,
  options jsonb not null default '[]',
  image_url text,
  audio_text text
);

create table if not exists public.speaking_tasks (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  task_type text not null,
  prompt_text text not null,
  target_text text not null,
  image_url text
);

create table if not exists public.student_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  story_completed boolean not null default false,
  vocabulary_completed boolean not null default false,
  listen_completed boolean not null default false,
  speak_completed boolean not null default false,
  read_completed boolean not null default false,
  write_completed boolean not null default false,
  completed_at timestamptz,
  unique(student_id, lesson_id)
);

create table if not exists public.student_answers (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  question_id uuid references public.questions(id) on delete set null,
  skill skill_type not null,
  answer text,
  is_correct boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.review_items (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  item_type text not null,
  item_id uuid,
  skill skill_type not null,
  label text not null,
  wrong_count int not null default 0,
  correct_count int not null default 0,
  next_review_date date,
  status text not null default 'active'
);

create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  icon text,
  condition_type text
);

create table if not exists public.student_badges (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique(student_id, badge_id)
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete cascade,
  skill skill_type,
  due_date date,
  status text not null default 'assigned',
  created_at timestamptz not null default now()
);

create table if not exists public.student_app_state (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  progress jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.lessons enable row level security;
alter table public.story_sentences enable row level security;
alter table public.words enable row level security;
alter table public.questions enable row level security;
alter table public.speaking_tasks enable row level security;
alter table public.student_progress enable row level security;
alter table public.student_answers enable row level security;
alter table public.review_items enable row level security;
alter table public.badges enable row level security;
alter table public.student_badges enable row level security;
alter table public.assignments enable row level security;
alter table public.student_app_state enable row level security;

drop policy if exists "Published lessons are readable" on public.lessons;
drop policy if exists "Published story sentences are readable" on public.story_sentences;
drop policy if exists "Published words are readable" on public.words;
drop policy if exists "Published questions are readable" on public.questions;
drop policy if exists "Published speaking tasks are readable" on public.speaking_tasks;
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Teachers can read students" on public.profiles;
drop policy if exists "Staff can read student profiles" on public.profiles;
drop policy if exists "Admins can read all profiles" on public.profiles;
drop policy if exists "Students can manage own progress" on public.student_progress;
drop policy if exists "Students can manage own answers" on public.student_answers;
drop policy if exists "Students can manage own reviews" on public.review_items;
drop policy if exists "Students can read own badges" on public.student_badges;
drop policy if exists "Students can manage own app state" on public.student_app_state;
drop policy if exists "Teachers can read student app state" on public.student_app_state;

create policy "Published lessons are readable" on public.lessons
  for select using (is_published = true);

create policy "Published story sentences are readable" on public.story_sentences
  for select using (
    exists (
      select 1 from public.lessons
      where lessons.id = story_sentences.lesson_id
      and lessons.is_published = true
    )
  );

create policy "Published words are readable" on public.words
  for select using (
    exists (
      select 1 from public.lessons
      where lessons.id = words.lesson_id
      and lessons.is_published = true
    )
  );

create policy "Published questions are readable" on public.questions
  for select using (
    exists (
      select 1 from public.lessons
      where lessons.id = questions.lesson_id
      and lessons.is_published = true
    )
  );

create policy "Published speaking tasks are readable" on public.speaking_tasks
  for select using (
    exists (
      select 1 from public.lessons
      where lessons.id = speaking_tasks.lesson_id
      and lessons.is_published = true
    )
  );

create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.current_user_role()
returns user_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

create policy "Staff can read student profiles" on public.profiles
  for select using (
    role = 'student'
    and public.current_user_role() in ('teacher', 'admin')
  );

create policy "Admins can read all profiles" on public.profiles
  for select using (public.current_user_role() = 'admin');

create policy "Students can manage own progress" on public.student_progress
  for all using (auth.uid() = student_id);

create policy "Students can manage own answers" on public.student_answers
  for all using (auth.uid() = student_id);

create policy "Students can manage own reviews" on public.review_items
  for all using (auth.uid() = student_id);

create policy "Students can read own badges" on public.student_badges
  for select using (auth.uid() = student_id);

create policy "Students can manage own app state" on public.student_app_state
  for all using (auth.uid() = student_id) with check (auth.uid() = student_id);

create policy "Teachers can read student app state" on public.student_app_state
  for select using (public.current_user_role() in ('teacher', 'admin'));
