-- ════════════════════════════════════════════════════════════════════
-- Phase 4: Custom Access Token Hook
-- ════════════════════════════════════════════════════════════════════
--
-- Creates `public.custom_access_token_hook(event jsonb) returns jsonb`
-- so Supabase Auth can enrich the access-token JWT with application
-- claims (role, adminRole, primarySlug, memberBusinessSlugs,
-- selfAthleteClientId, dbUserId). Middleware then reads those claims
-- from the JWT instead of hitting the database on every request.
--
-- ⚠ MANUAL STEP REQUIRED after this migration is applied:
--    Supabase Dashboard → Authentication → Hooks → Send access token
--    → enable → point at `public.custom_access_token_hook`.
--    See docs/deployment/supabase-auth-hook.md for the walkthrough.
-- Until the hook is registered, the function is dormant — middleware
-- still falls back to DB lookups (feature-flagged with
-- USE_JWT_CLAIMS). So it is safe to apply this migration in
-- advance of the dashboard change.

-- ── Function ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  auth_user_id text;
  auth_email text;
  db_user_id text;
  db_role text;
  db_admin_role text;
  db_self_athlete_client_id text;
  primary_slug text;
  member_slugs text[];
  app_meta jsonb;
BEGIN
  claims := event->'claims';
  auth_user_id := event->>'user_id';

  -- Email fallback is needed for legacy users whose public."User".id
  -- drifted from auth.users.id. See scripts/sync-user-ids-with-supabase.ts
  -- for the eventual cleanup.
  SELECT email INTO auth_email FROM auth.users WHERE id = auth_user_id::uuid;

  SELECT u.id, u.role, u."adminRole", u."selfAthleteClientId"
    INTO db_user_id, db_role, db_admin_role, db_self_athlete_client_id
  FROM public."User" u
  WHERE u.id = auth_user_id
     OR (auth_email IS NOT NULL AND lower(u.email) = lower(auth_email))
  ORDER BY (u.id = auth_user_id) DESC
  LIMIT 1;

  IF db_user_id IS NOT NULL THEN
    SELECT b.slug
      INTO primary_slug
    FROM public."BusinessMember" bm
    JOIN public."Business" b ON b.id = bm."businessId"
    WHERE bm."userId" = db_user_id
      AND bm."isActive" = true
      AND b."isActive" = true
    ORDER BY bm."createdAt" ASC
    LIMIT 1;

    SELECT array_agg(b.slug ORDER BY bm."createdAt" ASC)
      INTO member_slugs
    FROM public."BusinessMember" bm
    JOIN public."Business" b ON b.id = bm."businessId"
    WHERE bm."userId" = db_user_id
      AND bm."isActive" = true
      AND b."isActive" = true;

    app_meta := COALESCE(claims->'app_metadata', '{}'::jsonb)
      || jsonb_build_object(
        'dbUserId', db_user_id,
        'role', db_role,
        'adminRole', db_admin_role,
        'selfAthleteClientId', db_self_athlete_client_id,
        'primarySlug', primary_slug,
        'memberBusinessSlugs', COALESCE(to_jsonb(member_slugs), '[]'::jsonb)
      );

    claims := claims || jsonb_build_object('app_metadata', app_meta);
  END IF;

  RETURN jsonb_build_object('claims', claims);
EXCEPTION
  WHEN OTHERS THEN
    -- Never block sign-in on a hook error. Log via the raise and
    -- return the original claims so the token is still issued.
    RAISE LOG 'custom_access_token_hook failed: %', SQLERRM;
    RETURN jsonb_build_object('claims', event->'claims');
END;
$$;

-- ── Permissions ─────────────────────────────────────────────────────
--
-- Per Supabase's auth-hooks guide: only `supabase_auth_admin` should
-- be able to execute this function; everyone else is revoked.

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM authenticated, anon, public;

-- Read access on the tables the function touches.
GRANT SELECT ON public."User" TO supabase_auth_admin;
GRANT SELECT ON public."Business" TO supabase_auth_admin;
GRANT SELECT ON public."BusinessMember" TO supabase_auth_admin;

-- RLS policies so the grants actually take effect (we enabled RLS on
-- all three tables earlier).
DROP POLICY IF EXISTS "auth_admin_read" ON public."User";
CREATE POLICY "auth_admin_read" ON public."User"
  FOR SELECT TO supabase_auth_admin USING (true);

DROP POLICY IF EXISTS "auth_admin_read" ON public."Business";
CREATE POLICY "auth_admin_read" ON public."Business"
  FOR SELECT TO supabase_auth_admin USING (true);

DROP POLICY IF EXISTS "auth_admin_read" ON public."BusinessMember";
CREATE POLICY "auth_admin_read" ON public."BusinessMember"
  FOR SELECT TO supabase_auth_admin USING (true);
