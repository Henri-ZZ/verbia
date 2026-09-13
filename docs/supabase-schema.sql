-- Verbia — Supabase schema (paste into the Supabase SQL editor)
-- Creates the identity-facing tables used by the gateway and the extension:
--   profiles      -> one row per auth user; the API owns billing/plan fields.
--   quota_usage   -> per-user daily counts consumed by the generation RPC
--                    (only enforced when the gateway runs with ENFORCE_QUOTA=1).
--
-- NOT "run once": every statement is idempotent (create-or-replace / if not
-- exists), so re-run this whole file whenever it changes. The gateway calls the
-- functions defined here by name, and a function that was never created fails
-- at runtime as a plain 404 that the gateway is designed to swallow — drafts
-- keep working while usage stops being recorded. Section 2 in particular must
-- exist before ENFORCE_QUOTA=1 means anything.

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

-- Safe to run on projects that already have the original profiles table.
alter table public.profiles add column if not exists billing_provider text;
alter table public.profiles add column if not exists billing_environment text;
alter table public.profiles add column if not exists billing_customer_id text;
alter table public.profiles add column if not exists billing_subscription_id text;
alter table public.profiles add column if not exists subscription_status text;
alter table public.profiles add column if not exists current_period_end timestamptz;
alter table public.profiles add column if not exists billing_event_at timestamptz;

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

-- Billing fields are server-managed. Authenticated users may read their row,
-- but cannot promote their own plan through the REST API.
drop policy if exists "profiles_update_own" on public.profiles;

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

-- Backfill users created before this trigger was installed. Safe to rerun.
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do update set email = excluded.email;

-- ---------------------------------------------------------------------------
-- 2. quota_usage + plan/quota RPCs (check before, record after success)
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

-- Legacy compatibility RPC. Keep this while an older deployed Worker may
-- still call it during rollout. New Workers use consume_generation_quota.
-- Called with the user's own Bearer token. Increments the
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

-- Legacy hot path, kept while older deployed Workers still call it. The current
-- Worker uses check_generation_quota + record_generation_quota below, so that a
-- failed call does not spend the daily counter.
create or replace function public.consume_generation_quota(
  p_free_limit integer default 10,
  p_premium_limit integer default 0
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_period text := to_char(now() at time zone 'utc', 'YYYY-MM-DD');
  v_plan text := 'free';
  v_limit integer;
  v_count integer := 0;
  v_has_billing boolean := false;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;

  select coalesce(p.plan, 'free'), p.billing_provider is not null
  into v_plan, v_has_billing
  from public.profiles p
  where p.id = v_user_id;
  v_plan := coalesce(v_plan, 'free');
  v_has_billing := coalesce(v_has_billing, false);

  -- Paid subscriptions are stored per provider. This also expires a
  -- canceling subscription safely if its final webhook arrives late. A
  -- profile with no billing provider can still represent a manual grant.
  if v_plan = 'premium' and v_has_billing and not exists (
    select 1 from public.billing_subscriptions s
    where s.user_id = v_user_id
      and (
        s.status = 'active'
        or (s.status = 'canceling' and (s.current_period_end is null or s.current_period_end > now()))
      )
  ) then
    v_plan := 'free';
  end if;

  v_limit := case when v_plan = 'premium'
    then greatest(coalesce(p_premium_limit, 0), 0)
    else greatest(coalesce(p_free_limit, 0), 0)
  end;

  -- A zero limit means unlimited and intentionally does not grow the daily
  -- counter, preserving the previous gateway behavior.
  if v_limit = 0 then
    return jsonb_build_object('plan', v_plan, 'remaining', -1);
  end if;

  insert into public.quota_usage (user_id, period, count)
  values (v_user_id, v_period, 1)
  on conflict (user_id, period)
  do update set count = public.quota_usage.count + 1
  returning count into v_count;

  if v_count > v_limit then
    raise exception 'QUOTA_EXCEEDED' using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'plan', v_plan,
    'remaining', greatest(v_limit - v_count, 0)
  );
end;
$$;

revoke execute on function public.consume_generation_quota(integer,integer) from public, anon;
grant execute on function public.consume_generation_quota(integer,integer) to authenticated;

-- Read-only pre-flight check for the current Worker: "may this user start
-- another generation right now?" Writes nothing. Returns the effective plan and
-- remaining = limit - used; remaining = -1 means unlimited. It can go negative
-- when concurrent requests slip past the check — the next check refuses them,
-- which is an accepted approximation for a one-press-per-request product.
create or replace function public.check_generation_quota(
  p_free_limit integer default 10,
  p_premium_limit integer default 0
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_period text := to_char(now() at time zone 'utc', 'YYYY-MM-DD');
  v_plan text := 'free';
  v_limit integer;
  v_used integer := 0;
  v_has_billing boolean := false;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;

  select coalesce(p.plan, 'free'), p.billing_provider is not null
  into v_plan, v_has_billing
  from public.profiles p
  where p.id = v_user_id;
  v_plan := coalesce(v_plan, 'free');
  v_has_billing := coalesce(v_has_billing, false);

  -- Same effective-plan rule as consume_generation_quota above.
  if v_plan = 'premium' and v_has_billing and not exists (
    select 1 from public.billing_subscriptions s
    where s.user_id = v_user_id
      and (
        s.status = 'active'
        or (s.status = 'canceling' and (s.current_period_end is null or s.current_period_end > now()))
      )
  ) then
    v_plan := 'free';
  end if;

  v_limit := case when v_plan = 'premium'
    then greatest(coalesce(p_premium_limit, 0), 0)
    else greatest(coalesce(p_free_limit, 0), 0)
  end;
  if v_limit = 0 then
    return jsonb_build_object('plan', v_plan, 'remaining', -1);
  end if;

  select count into v_used
  from public.quota_usage
  where user_id = v_user_id and period = v_period;

  return jsonb_build_object('plan', v_plan, 'remaining', v_limit - coalesce(v_used, 0));
end;
$$;

revoke execute on function public.check_generation_quota(integer,integer) from public, anon;
grant execute on function public.check_generation_quota(integer,integer) to authenticated;

-- Records one generation that produced a usable result. Deliberately
-- unconditional: whether the new count exceeds the limit is decided by the next
-- check_generation_quota, not here, so a success that raced past the limit is
-- still counted instead of failing after the work was already done. Failed
-- calls simply never reach this function — that is what keeps them free.
create or replace function public.record_generation_quota()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_period text := to_char(now() at time zone 'utc', 'YYYY-MM-DD');
  v_count integer := 0;
begin
  if v_user_id is null then
    return 0;
  end if;

  insert into public.quota_usage (user_id, period, count)
  values (v_user_id, v_period, 1)
  on conflict (user_id, period)
  do update set count = public.quota_usage.count + 1
  returning count into v_count;

  return v_count;
end;
$$;

revoke execute on function public.record_generation_quota() from public, anon;
grant execute on function public.record_generation_quota() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. provider-neutral billing state + idempotent webhook application
-- ---------------------------------------------------------------------------
create table if not exists public.billing_subscriptions (
  provider text not null,
  environment text not null,
  subscription_id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  customer_id text,
  status text not null,
  current_period_end timestamptz,
  event_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (provider, environment, subscription_id)
);

create index if not exists billing_subscriptions_user_idx
  on public.billing_subscriptions (user_id, status);
alter table public.billing_subscriptions enable row level security;
revoke all on table public.billing_subscriptions from anon, authenticated;

create table if not exists public.billing_events (
  provider text not null,
  delivery_id text not null,
  event_id text not null,
  event_type text not null,
  environment text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  event_at timestamptz not null,
  received_at timestamptz not null default now(),
  primary key (provider, delivery_id)
);

create index if not exists billing_events_user_received_idx
  on public.billing_events (user_id, received_at desc);
alter table public.billing_events enable row level security;
revoke all on table public.billing_events from anon, authenticated;

create or replace function public.apply_billing_event(
  p_provider text,
  p_environment text,
  p_delivery_id text,
  p_event_id text,
  p_event_type text,
  p_event_at timestamptz,
  p_user_id uuid,
  p_customer_id text,
  p_subscription_id text,
  p_plan text,
  p_status text,
  p_current_period_end timestamptz
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted integer;
begin
  if p_plan is not null and p_plan not in ('free', 'premium') then
    raise exception 'INVALID_PLAN' using errcode = '22023';
  end if;

  insert into public.billing_events (provider, delivery_id, event_id, event_type, environment, user_id, event_at)
  values (p_provider, p_delivery_id, p_event_id, p_event_type, p_environment, p_user_id, p_event_at)
  on conflict (provider, delivery_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then return false; end if;

  -- Refund notifications are retained for audit but do not implicitly cancel
  -- a subscription. Only subscription lifecycle events change entitlement.
  if p_plan is not null and p_status is not null then
    insert into public.billing_subscriptions (
      provider, environment, subscription_id, user_id, customer_id,
      status, current_period_end, event_at
    ) values (
      p_provider, p_environment, p_subscription_id, p_user_id, p_customer_id,
      p_status, p_current_period_end, p_event_at
    )
    on conflict (provider, environment, subscription_id) do update
    set user_id = excluded.user_id,
        customer_id = excluded.customer_id,
        status = excluded.status,
        current_period_end = excluded.current_period_end,
        event_at = excluded.event_at,
        updated_at = now()
    where excluded.event_at >= public.billing_subscriptions.event_at;

    update public.profiles
    set billing_provider = p_provider,
        billing_environment = p_environment,
        billing_customer_id = p_customer_id,
        customer_id = coalesce(customer_id, p_customer_id),
        billing_subscription_id = p_subscription_id,
        subscription_status = p_status,
        current_period_end = p_current_period_end,
        billing_event_at = p_event_at,
        updated_at = now()
    where id = p_user_id
      and (billing_event_at is null or p_event_at >= billing_event_at);

    update public.profiles
    set plan = case when exists (
          select 1 from public.billing_subscriptions s
          where s.user_id = p_user_id
            and (
              s.status = 'active'
              or (s.status = 'canceling' and (s.current_period_end is null or s.current_period_end > now()))
            )
        ) then 'premium' else 'free' end,
        updated_at = now()
    where id = p_user_id;
  end if;
  return true;
end;
$$;

revoke execute on function public.apply_billing_event(text,text,text,text,text,timestamptz,uuid,text,text,text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.apply_billing_event(text,text,text,text,text,timestamptz,uuid,text,text,text,text,timestamptz) to service_role;

-- ---------------------------------------------------------------------------
-- 4. contact feedback
-- ---------------------------------------------------------------------------
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  submitter_hash text not null,
  source text not null check (source in ('website', 'popup', 'settings', 'uninstall')),
  category text not null check (category in ('bug', 'suggestion', 'experience', 'uninstall', 'other')),
  reason text,
  message text not null default '' check (char_length(message) <= 2000),
  contact_email text,
  allow_contact boolean not null default false,
  locale text not null default 'en' check (locale in ('en', 'zh')),
  extension_version text,
  browser text,
  status text not null default 'new' check (status in ('new', 'reviewing', 'resolved', 'archived')),
  created_at timestamptz not null default now()
);

create index if not exists feedback_created_at_idx on public.feedback (created_at desc);
create index if not exists feedback_submitter_rate_idx on public.feedback (submitter_hash, created_at desc);
alter table public.feedback enable row level security;

-- Feedback is written only by the API's service role. No client can read,
-- insert, update, or delete rows through the public Data API.
revoke all on table public.feedback from anon, authenticated;

create or replace function public.submit_feedback(
  p_user_id uuid,
  p_submitter_hash text,
  p_source text,
  p_category text,
  p_reason text,
  p_message text,
  p_contact_email text,
  p_allow_contact boolean,
  p_locale text,
  p_extension_version text,
  p_browser text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if (select count(*) from public.feedback where submitter_hash = p_submitter_hash and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'FEEDBACK_RATE_LIMITED' using errcode = 'P0001';
  end if;
  insert into public.feedback (user_id, submitter_hash, source, category, reason, message, contact_email, allow_contact, locale, extension_version, browser)
  values (p_user_id, p_submitter_hash, p_source, p_category, nullif(p_reason, ''), p_message, case when p_allow_contact then nullif(p_contact_email, '') end, p_allow_contact, p_locale, nullif(p_extension_version, ''), nullif(p_browser, ''))
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.submit_feedback(uuid,text,text,text,text,text,text,boolean,text,text,text) from public, anon, authenticated;
grant execute on function public.submit_feedback(uuid,text,text,text,text,text,text,boolean,text,text,text) to service_role;
