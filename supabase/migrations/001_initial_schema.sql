-- Premium Game Platform - Initial Schema

-- 1. Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text default 'Player',
  avatar_url text,
  avatar_emoji text default '🎮',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Game Stats (per user per game)
create table if not exists public.game_stats (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  game_id text not null,
  played int default 0,
  won int default 0,
  lost int default 0,
  drawn int default 0,
  streak int default 0,
  best_streak int default 0,
  total_time_seconds int default 0,
  updated_at timestamptz default now(),
  unique(user_id, game_id)
);

-- 3. ELO Ratings (per user per game)
create table if not exists public.elo_ratings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  game_id text not null,
  rating int default 1200,
  peak_rating int default 1200,
  games_rated int default 0,
  updated_at timestamptz default now(),
  unique(user_id, game_id)
);

-- 4. Matches (game history)
create table if not exists public.matches (
  id uuid default gen_random_uuid() primary key,
  game_id text not null,
  player1_id uuid references public.profiles(id) on delete set null,
  player2_id uuid references public.profiles(id) on delete set null,
  ai_opponent text,
  winner_id uuid references public.profiles(id) on delete set null,
  result text not null, -- 'win', 'loss', 'draw'
  player1_elo_before int,
  player1_elo_after int,
  player2_elo_before int,
  player2_elo_after int,
  move_count int default 0,
  duration_seconds int default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 5. Rooms (multiplayer)
create table if not exists public.rooms (
  id uuid default gen_random_uuid() primary key,
  game_id text not null,
  host_id uuid references public.profiles(id) on delete cascade not null,
  guest_id uuid references public.profiles(id) on delete set null,
  invite_code text unique,
  status text default 'waiting' check (status in ('waiting', 'playing', 'finished')),
  game_state jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. Chat Messages
create table if not exists public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references public.rooms(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  message text not null,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_game_stats_user on public.game_stats(user_id);
create index if not exists idx_elo_ratings_user on public.elo_ratings(user_id);
create index if not exists idx_elo_ratings_game_rating on public.elo_ratings(game_id, rating desc);
create index if not exists idx_matches_player1 on public.matches(player1_id);
create index if not exists idx_matches_player2 on public.matches(player2_id);
create index if not exists idx_rooms_status on public.rooms(status) where status = 'waiting';
create index if not exists idx_rooms_invite_code on public.rooms(invite_code) where invite_code is not null;
create index if not exists idx_chat_room on public.chat_messages(room_id, created_at);

-- RLS Policies
alter table public.profiles enable row level security;
alter table public.game_stats enable row level security;
alter table public.elo_ratings enable row level security;
alter table public.matches enable row level security;
alter table public.rooms enable row level security;
alter table public.chat_messages enable row level security;

-- Profiles: anyone can read, users update own
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Game Stats: anyone can read, users modify own
create policy "Game stats are viewable by everyone" on public.game_stats for select using (true);
create policy "Users can insert own stats" on public.game_stats for insert with check (auth.uid() = user_id);
create policy "Users can update own stats" on public.game_stats for update using (auth.uid() = user_id);

-- ELO Ratings: anyone can read, users modify own
create policy "ELO ratings are viewable by everyone" on public.elo_ratings for select using (true);
create policy "Users can insert own elo" on public.elo_ratings for insert with check (auth.uid() = user_id);
create policy "Users can update own elo" on public.elo_ratings for update using (auth.uid() = user_id);

-- Matches: anyone can read, participants can insert
create policy "Matches are viewable by everyone" on public.matches for select using (true);
create policy "Participants can insert matches" on public.matches for insert with check (auth.uid() = player1_id or auth.uid() = player2_id);

-- Rooms: anyone can read, host creates, participants update
create policy "Rooms are viewable by everyone" on public.rooms for select using (true);
create policy "Host can create rooms" on public.rooms for insert with check (auth.uid() = host_id);
create policy "Participants can update rooms" on public.rooms for update using (auth.uid() = host_id or auth.uid() = guest_id);

-- Chat: room participants can read/write
create policy "Room participants can read chat" on public.chat_messages for select using (
  exists (select 1 from public.rooms where id = room_id and (host_id = auth.uid() or guest_id = auth.uid()))
);
create policy "Room participants can send chat" on public.chat_messages for insert with check (
  auth.uid() = user_id and
  exists (select 1 from public.rooms where id = room_id and (host_id = auth.uid() or guest_id = auth.uid()))
);

-- Trigger: Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', 'Player'));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Updated_at trigger function
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.update_updated_at();
create trigger game_stats_updated_at before update on public.game_stats for each row execute procedure public.update_updated_at();
create trigger elo_ratings_updated_at before update on public.elo_ratings for each row execute procedure public.update_updated_at();
create trigger rooms_updated_at before update on public.rooms for each row execute procedure public.update_updated_at();
