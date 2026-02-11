-- Admin System: role column, announcements table, admin policies

-- 1. Add role column to profiles
alter table public.profiles add column if not exists role text not null default 'user' check (role in ('user', 'admin'));

-- 2. Announcements table
create table if not exists public.announcements (
  id uuid default gen_random_uuid() primary key,
  admin_id uuid references public.profiles(id) on delete set null,
  title text not null check (char_length(title) <= 200),
  content text not null check (char_length(content) <= 2000),
  type text not null default 'info' check (type in ('info', 'warning', 'update', 'maintenance')),
  active boolean not null default true,
  created_at timestamptz default now(),
  expires_at timestamptz
);

-- 3. Admin audit log
create table if not exists public.admin_logs (
  id uuid default gen_random_uuid() primary key,
  admin_id uuid references public.profiles(id) on delete set null not null,
  action text not null,
  target_type text, -- 'user', 'elo', 'announcement', etc.
  target_id text,
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 4. User reports / support tickets
create table if not exists public.support_tickets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  subject text not null check (char_length(subject) <= 200),
  message text not null check (char_length(message) <= 2000),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  admin_response text check (char_length(admin_response) <= 2000),
  admin_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index if not exists idx_announcements_active on public.announcements(active, created_at desc);
create index if not exists idx_admin_logs_admin on public.admin_logs(admin_id, created_at desc);
create index if not exists idx_support_tickets_status on public.support_tickets(status, created_at desc);
create index if not exists idx_support_tickets_user on public.support_tickets(user_id);

-- RLS
alter table public.announcements enable row level security;
alter table public.admin_logs enable row level security;
alter table public.support_tickets enable row level security;

-- Announcements: everyone can read active, only admins can insert/update/delete
create policy "Anyone can read active announcements"
  on public.announcements for select
  using (active = true or exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

create policy "Admins can insert announcements"
  on public.announcements for insert
  with check (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

create policy "Admins can update announcements"
  on public.announcements for update
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

create policy "Admins can delete announcements"
  on public.announcements for delete
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- Admin logs: only admins can read/write
create policy "Admins can read admin logs"
  on public.admin_logs for select
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

create policy "Admins can insert admin logs"
  on public.admin_logs for insert
  with check (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- Support tickets: users can read/create own, admins can read/update all
create policy "Users can view own tickets"
  on public.support_tickets for select
  using (auth.uid() = user_id or exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

create policy "Users can create tickets"
  on public.support_tickets for insert
  with check (auth.uid() = user_id);

create policy "Admins can update tickets"
  on public.support_tickets for update
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- Trigger for support tickets updated_at
create trigger support_tickets_updated_at before update on public.support_tickets
  for each row execute procedure public.update_updated_at();

-- Grant admin to the specified user (run this after migration)
-- UPDATE public.profiles SET role = 'admin' WHERE id = (
--   SELECT id FROM auth.users WHERE email = 'sfscottfisher86@gmail.com'
-- );
