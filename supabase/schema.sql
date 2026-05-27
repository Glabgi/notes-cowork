-- Notes Cowork — Supabase schema
-- Apply in: Supabase Studio → SQL Editor → paste → Run

-- ===================== PROFILES =====================
-- Extends auth.users with public profile data
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar_id text default 'fox',
  created_at timestamptz default now()
);

-- Auto-create profile row on signup, taking username from raw_user_meta_data
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, avatar_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_id', 'fox')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===================== POMODORO SESSIONS =====================
create table if not exists public.pomodoro_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  duration_minutes int not null,
  phase text not null default 'focus',
  room_slug text,
  completed_at timestamptz default now()
);

create index if not exists pomodoro_user_completed_idx
  on public.pomodoro_sessions (user_id, completed_at desc);

-- ===================== TASKS =====================
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  completed boolean default false,
  is_public boolean default false,
  tag text default 'work',
  pomodoro_count int default 0,
  estimated_pomodoros int,
  order_index int default 0,
  created_at timestamptz default now(),
  completed_at timestamptz
);

create index if not exists tasks_user_idx on public.tasks (user_id, order_index);

-- ===================== DAILY STATS (derived/cached) =====================
create table if not exists public.daily_stats (
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  focus_minutes int default 0,
  pomodoro_count int default 0,
  tasks_completed int default 0,
  primary key (user_id, date)
);

-- ===================== ROW LEVEL SECURITY =====================
alter table public.profiles          enable row level security;
alter table public.pomodoro_sessions enable row level security;
alter table public.tasks             enable row level security;
alter table public.daily_stats       enable row level security;

-- Profiles: anyone can read public profile, only owner can write
drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles for select using (true);
drop policy if exists "profiles_write_own" on public.profiles;
create policy "profiles_write_own" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);

-- Sessions: only owner
drop policy if exists "sessions_owner" on public.pomodoro_sessions;
create policy "sessions_owner" on public.pomodoro_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Tasks: owner full, public tasks readable by all
drop policy if exists "tasks_owner" on public.tasks;
create policy "tasks_owner" on public.tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "tasks_public_read" on public.tasks;
create policy "tasks_public_read" on public.tasks for select using (is_public = true);

-- Daily stats: only owner
drop policy if exists "stats_owner" on public.daily_stats;
create policy "stats_owner" on public.daily_stats for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ===================== HELPER: increment_pomodoro =====================
-- RPC that records a session AND updates daily_stats in one transaction
create or replace function public.record_pomodoro(_minutes int, _phase text default 'focus', _room text default null)
returns void as $$
begin
  insert into public.pomodoro_sessions (user_id, duration_minutes, phase, room_slug)
  values (auth.uid(), _minutes, _phase, _room);

  insert into public.daily_stats (user_id, date, focus_minutes, pomodoro_count)
  values (auth.uid(), current_date, case when _phase = 'focus' then _minutes else 0 end, case when _phase = 'focus' then 1 else 0 end)
  on conflict (user_id, date) do update
    set focus_minutes  = public.daily_stats.focus_minutes + excluded.focus_minutes,
        pomodoro_count = public.daily_stats.pomodoro_count + excluded.pomodoro_count;
end;
$$ language plpgsql security definer;

grant execute on function public.record_pomodoro(int, text, text) to authenticated;
