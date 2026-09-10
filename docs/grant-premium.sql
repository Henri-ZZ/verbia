-- ===========================================================================
-- Verbia — manual Premium grant (1 year)
--
-- Grants a single account Premium for one year, then it reverts to free
-- automatically. Run in the Supabase SQL editor (project pthfyoejvlcwxboskrjr)
-- as the service/postgres role; RLS is bypassed there, which is intended —
-- clients must never be able to promote their own plan.
--
-- WHY THIS SHAPE
-- Two independent checks decide entitlement, and they must agree:
--
--   1. public.consume_generation_quota  (the gateway's quota RPC, actually
--      enforced on every Generate call) honors plan = 'premium' in two ways:
--        * billing_provider IS NULL  -> treated as a permanent manual grant;
--        * billing_provider is set   -> only while a row in
--          public.billing_subscriptions exists with status 'active', or
--          status 'canceling' and current_period_end in the future.
--
--   2. readAccountPlan() in services/api/src/app.ts (drives the usage /
--      plan shown in the extension and on the website) reads
--      profiles.plan + profiles.subscription_status + current_period_end,
--      and downgrades to free when subscription_status = 'canceling' and
--      current_period_end has passed.
--
-- Setting billing_provider + a 'canceling' subscription whose
-- current_period_end is one year out satisfies BOTH checks and expires
-- cleanly. 'canceling' is never surfaced in the UI (the UI only shows the
-- plan), so it reads simply as "Premium until <date>".
--
-- TO GRANT PERMANENTLY INSTEAD: set billing_provider = NULL on the profile
-- (plan = 'premium' with no provider is a never-expiring manual grant).
--
-- IDEMPOTENT: subscription_id is deterministic, so re-running just pushes the
-- expiry out to "one year from now". A later real billing webhook with an
-- event_at >= billing_event_at will overwrite this manual grant, as intended.
-- ===========================================================================

do $$
declare
  v_user_id         uuid        := '43840515-53fe-4ae4-9684-e03daa25b838';
  v_provider        text        := 'manual';
  v_environment     text        := 'manual';
  v_subscription_id text        := 'manual-grant-43840515-53fe-4ae4-9684-e03daa25b838';
  v_period_end      timestamptz := now() + interval '1 year';
begin
  -- The account must exist: profiles.id references auth.users(id).
  if not exists (select 1 from auth.users u where u.id = v_user_id) then
    raise exception 'No auth.users row for %', v_user_id;
  end if;

  -- 1) Entitlement flags on the profile (read by readAccountPlan).
  insert into public.profiles (
    id, plan, billing_provider, billing_environment,
    billing_subscription_id, subscription_status,
    current_period_end, billing_event_at, updated_at
  ) values (
    v_user_id, 'premium', v_provider, v_environment,
    v_subscription_id, 'canceling',
    v_period_end, now(), now()
  )
  on conflict (id) do update set
    plan                    = 'premium',
    billing_provider        = v_provider,
    billing_environment     = v_environment,
    billing_subscription_id = v_subscription_id,
    subscription_status     = 'canceling',
    current_period_end      = v_period_end,
    billing_event_at        = now(),
    updated_at              = now();

  -- 2) Subscription row required by consume_generation_quota whenever a
  --    billing provider is present. 'canceling' + a future period end means
  --    "Premium until that date, then stop counting".
  insert into public.billing_subscriptions (
    provider, environment, subscription_id, user_id,
    status, current_period_end, event_at, updated_at
  ) values (
    v_provider, v_environment, v_subscription_id, v_user_id,
    'canceling', v_period_end, now(), now()
  )
  on conflict (provider, environment, subscription_id) do update set
    user_id            = excluded.user_id,
    status             = 'canceling',
    current_period_end = v_period_end,
    event_at           = now(),
    updated_at         = now();
end $$;

-- Verification: expect plan = premium, subscription_status = canceling,
-- current_period_end ~ one year out, live_subscriptions = 1.
select
  p.id,
  p.plan,
  p.subscription_status,
  p.current_period_end,
  (select count(*) from public.billing_subscriptions s
    where s.user_id = p.id and s.status in ('active', 'canceling')) as live_subscriptions
from public.profiles p
where p.id = '43840515-53fe-4ae4-9684-e03daa25b838';
