-- Social System: Friendships + Direct Messages

-- 1. Friendships table
create table if not exists public.friendships (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  friend_id uuid references public.profiles(id) on delete cascade not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, friend_id)
);

-- 2. Direct Messages table
create table if not exists public.direct_messages (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  receiver_id uuid references public.profiles(id) on delete cascade not null,
  content text not null check (char_length(content) <= 500),
  message_type text not null default 'text' check (message_type in ('text', 'challenge')),
  metadata jsonb default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz default now()
);

-- 3. Add online_at to profiles for presence tracking
alter table public.profiles add column if not exists online_at timestamptz;

-- 4. Unique display names (case-insensitive)
create unique index if not exists idx_profiles_display_name_unique on public.profiles(lower(display_name));

-- Indexes
create index if not exists idx_friendships_user on public.friendships(user_id);
create index if not exists idx_friendships_friend on public.friendships(friend_id);
create index if not exists idx_friendships_status on public.friendships(status);
create index if not exists idx_profiles_display_name on public.profiles(display_name);
create index if not exists idx_dm_conversation on public.direct_messages(
  least(sender_id, receiver_id),
  greatest(sender_id, receiver_id),
  created_at desc
);
create index if not exists idx_dm_receiver_unread on public.direct_messages(receiver_id) where read_at is null;

-- RLS
alter table public.friendships enable row level security;
alter table public.direct_messages enable row level security;

-- Friendships RLS: users can see their own friendships
create policy "Users can view own friendships"
  on public.friendships for select
  using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "Users can send friend requests"
  on public.friendships for insert
  with check (auth.uid() = user_id);

create policy "Participants can update friendships"
  on public.friendships for update
  using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "Participants can delete friendships"
  on public.friendships for delete
  using (auth.uid() = user_id or auth.uid() = friend_id);

-- Direct Messages RLS: sender and receiver can read
create policy "Sender and receiver can read messages"
  on public.direct_messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can send messages"
  on public.direct_messages for insert
  with check (auth.uid() = sender_id);

create policy "Receiver can mark messages as read"
  on public.direct_messages for update
  using (auth.uid() = receiver_id);

-- Triggers
create trigger friendships_updated_at before update on public.friendships
  for each row execute procedure public.update_updated_at();

-- Enable realtime for direct_messages
alter publication supabase_realtime add table public.direct_messages;
