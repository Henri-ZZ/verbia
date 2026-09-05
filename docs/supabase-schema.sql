-- Verbia — Supabase schema (run once in the Supabase SQL editor)
-- Creates the identity-facing tables used by the gateway and the extension:
--   profiles      -> one row per auth user; plan/customer_id are reserved for
--                    future paid tiers.
--   quota_usage   -> per-user daily counts consumed via the consume_quota RPC
--                    (only enforced when the gateway runs with ENFORCE_QUOTA=1).

-- ---------------------------------------------------------------------------
-- 1. profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  plan text not null default 'free' check (plan in ('free', 'premium')),
  customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create a profile whenever a user signs up through any provider.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 2. quota_usage + consume_quota RPC
-- ---------------------------------------------------------------------------
create table if not exists public.quota_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  period text not null,               -- 'YYYY-MM-DD' in UTC
  count integer not null default 0 check (count >= 0),
  primary key (user_id, period)
);

alter table public.quota_usage enable row level security;

drop policy if exists "quota_select_own" on public.quota_usage;
create policy "quota_select_own"
  on public.quota_usage for select
  using (auth.uid() = user_id);

-- Called by the api gateway with the user's own Bearer token. Increments the
-- counter for today and returns the remaining count (or -1 = unlimited).
-- Exceeding p_limit raises QUOTA_EXCEEDED so the gateway can reply 429.
create or replace function public.consume_quota(p_limit integer default 0)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period text := to_char(now() at time zone 'utc', 'YYYY-MM-DD');
  v_count  integer;
begin
  if auth.uid() is null then
    return 0;
  end if;

  insert into public.quota_usage (user_id, period, count)
  values (auth.uid(), v_period, 1)
  on conflict (user_id, period)
  do update set count = public.quota_usage.count + 1
  returning count into v_count;

  if p_limit > 0 and v_count > p_limit then
    raise exception 'QUOTA_EXCEEDED' using errcode = 'P0001';
  end if;

  return case when p_limit > 0 then greatest(p_limit - v_count, 0) else -1 end;
end;
$$;

-- Only signed-in users may consume quota; anon/global execution is denied.
revoke execute on function public.consume_quota(integer) from public, anon;
grant execute on function public.consume_quota(integer) to authenticated;
