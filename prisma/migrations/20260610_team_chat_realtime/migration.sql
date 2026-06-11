-- Team chat Realtime wiring (design: docs/TEAM_CHAT_DESIGN.md, slice 2).
--
-- 1. Trigger: broadcast ThreadMessage changes to the private Realtime topic
--    `thread:{threadId}` via realtime.broadcast_changes().
-- 2. can_access_thread(): SQL mirror of lib/chat/membership.ts — keep the two
--    in sync when roster rules change. Authorizes Realtime subscriptions only;
--    REST reads/writes authorize in TypeScript.
-- 3. RLS policy on realtime.messages so only thread members can subscribe to
--    private `thread:%` topics.
--
-- Identity: policies resolve the app user via the `dbUserId` claim injected by
-- public.custom_access_token_hook — NOT auth.uid(), because legacy User.id
-- values drifted from auth.users.id (see 20260418_custom_access_token_hook).
-- If the hook is unregistered, the claim is absent and subscriptions fail
-- closed; clients fall back to polling.
--
-- Apply manually (dev):
--   export $(grep -E '^DIRECT_DATABASE_URL=' .env.local | xargs) && \
--     npx prisma db execute --file prisma/migrations/20260610_team_chat_realtime/migration.sql --url "$DIRECT_DATABASE_URL"

-- ── 1. Broadcast trigger ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.thread_message_broadcast()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM realtime.broadcast_changes(
    'thread:' || NEW."threadId", -- topic
    TG_OP,                       -- event
    TG_OP,                       -- operation
    TG_TABLE_NAME,
    TG_TABLE_SCHEMA,
    NEW,
    OLD
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS thread_message_broadcast ON public."ThreadMessage";
CREATE TRIGGER thread_message_broadcast
AFTER INSERT OR UPDATE ON public."ThreadMessage"
FOR EACH ROW EXECUTE FUNCTION public.thread_message_broadcast();

-- ── 2. Membership mirror ────────────────────────────────────────────

-- Mirrors getThreadForUser/getTeamChannelAccess in lib/chat/membership.ts:
--   a) non-TEAM_CHANNEL threads only: active explicit participant
--      (TEAM_CHANNEL must NOT honor participant rows — they are lazily
--      created and never deactivated, so a stale row would let removed
--      roster members keep access forever)
--   b) TEAM_CHANNEL: team owner
--   c) TEAM_CHANNEL: assistant coach (TeamCoachAssignment)
--   d) TEAM_CHANNEL: rostered athlete (Client.teamId + AthleteAccount)
--   e) TEAM_CHANNEL: business-wide staff (active OWNER/ADMIN/COACH member of a
--      business the team owner is also an active member of — the SQL
--      approximation of getAccessibleTeamWhere's businessOwnerIds path)
CREATE OR REPLACE FUNCTION public.can_access_thread(p_thread_id text, p_user_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p_user_id IS NOT NULL AND (
    EXISTS (
      SELECT 1
      FROM public."ThreadParticipant" tp
      JOIN public."Thread" pt ON pt.id = tp."threadId"
      WHERE tp."threadId" = p_thread_id
        AND tp."userId" = p_user_id
        AND tp."isActive"
        AND pt.type <> 'TEAM_CHANNEL'::public."ThreadType"
    )
    OR EXISTS (
      SELECT 1
      FROM public."Thread" t
      JOIN public."Team" tm ON tm.id = t."teamId"
      WHERE t.id = p_thread_id
        AND t.type = 'TEAM_CHANNEL'::public."ThreadType"
        AND (
          tm."userId" = p_user_id
          OR EXISTS (
            SELECT 1 FROM public."TeamCoachAssignment" tca
            WHERE tca."teamId" = tm.id AND tca."userId" = p_user_id
          )
          OR EXISTS (
            SELECT 1
            FROM public."Client" c
            JOIN public."AthleteAccount" aa ON aa."clientId" = c.id
            WHERE c."teamId" = tm.id AND aa."userId" = p_user_id
          )
          OR EXISTS (
            SELECT 1
            FROM public."BusinessMember" me
            JOIN public."BusinessMember" owner ON owner."businessId" = me."businessId"
            WHERE me."userId" = p_user_id
              AND me."isActive"
              AND me.role IN ('OWNER', 'ADMIN', 'COACH')
              AND owner."userId" = tm."userId"
              AND owner."isActive"
          )
        )
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_access_thread(text, text) TO authenticated;

-- ── 3. Realtime subscription authorization ──────────────────────────

-- Private-channel reads on topic `thread:{threadId}`. Clients never publish
-- directly (writes go through the REST API), so no INSERT policy.
DROP POLICY IF EXISTS "thread_members_read" ON realtime.messages;
CREATE POLICY "thread_members_read" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    realtime.topic() LIKE 'thread:%'
    AND public.can_access_thread(
      replace(realtime.topic(), 'thread:', ''),
      auth.jwt() -> 'app_metadata' ->> 'dbUserId'
    )
  );
