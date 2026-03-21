-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- Create profiles table that links to auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  plan_name text default 'free', -- free, starter, pro, vip
  plan_expires_at timestamp with time zone,
  total_messages int default 0,
  total_conversations int default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.profiles enable row level security;

-- RLS Policies for profiles
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Update conversations table to properly link to auth users
alter table public.conversations 
  drop column if exists user_id cascade,
  drop column if exists mlg_user_id cascade;

-- Ensure conversations has proper auth_user_id
alter table public.conversations 
  add column if not exists auth_user_id uuid references auth.users(id) on delete cascade;

alter table public.conversations enable row level security;

-- RLS Policies for conversations
create policy "conversations_select_own" on public.conversations for select using (auth.uid() = auth_user_id);
create policy "conversations_insert_own" on public.conversations for insert with check (auth.uid() = auth_user_id);
create policy "conversations_update_own" on public.conversations for update using (auth.uid() = auth_user_id);
create policy "conversations_delete_own" on public.conversations for delete using (auth.uid() = auth_user_id);

-- Update messages table to have proper RLS
alter table public.messages enable row level security;

-- RLS for messages: users can only see messages in their conversations
create policy "messages_select_own" on public.messages for select 
  using (
    conversation_id in (
      select id from conversations where auth_user_id = auth.uid()
    )
  );

create policy "messages_insert_own" on public.messages for insert 
  with check (
    conversation_id in (
      select id from conversations where auth_user_id = auth.uid()
    )
  );

create policy "messages_update_own" on public.messages for update 
  using (
    conversation_id in (
      select id from conversations where auth_user_id = auth.uid()
    )
  );

-- Update subscriptions table to link with profiles
alter table public.subscriptions 
  drop column if exists user_id cascade;

alter table public.subscriptions enable row level security;

-- RLS for subscriptions
create policy "subscriptions_select_own" on public.subscriptions for select using (auth.uid() = auth_user_id);
create policy "subscriptions_insert_own" on public.subscriptions for insert with check (auth.uid() = auth_user_id);
create policy "subscriptions_update_own" on public.subscriptions for update using (auth.uid() = auth_user_id);

-- Trigger to auto-create profile when user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, plan_name, created_at, updated_at)
  values (
    new.id,
    new.email,
    'free',
    now(),
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
