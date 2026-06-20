-- RLS coverage for monitoring, player notes, WHOOP, and team capture tables.

CREATE OR REPLACE FUNCTION public.team_staff_visible_to_auth(tid text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM "Team" t
     WHERE t.id = tid
       AND t."userId" = auth.uid()::text
  )
  OR EXISTS (
    SELECT 1
      FROM "TeamCoachAssignment" tca
     WHERE tca."teamId" = tid
       AND tca."userId" = auth.uid()::text
  );
$$;

ALTER TABLE "WhoopActivity" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "WhoopActivity";
DROP POLICY IF EXISTS "authenticated_select" ON "WhoopActivity";
CREATE POLICY "deny_anon_access" ON "WhoopActivity"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_select" ON "WhoopActivity"
  FOR SELECT TO authenticated
  USING (public.client_visible_to_auth("clientId"));

ALTER TABLE "WorkoutEvaluation" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "WorkoutEvaluation";
DROP POLICY IF EXISTS "authenticated_select" ON "WorkoutEvaluation";
CREATE POLICY "deny_anon_access" ON "WorkoutEvaluation"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_select" ON "WorkoutEvaluation"
  FOR SELECT TO authenticated
  USING (public.client_visible_to_auth("clientId"));

ALTER TABLE "WorkoutSensorCapture" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "WorkoutSensorCapture";
DROP POLICY IF EXISTS "authenticated_select" ON "WorkoutSensorCapture";
DROP POLICY IF EXISTS "authenticated_insert" ON "WorkoutSensorCapture";
DROP POLICY IF EXISTS "authenticated_update" ON "WorkoutSensorCapture";
CREATE POLICY "deny_anon_access" ON "WorkoutSensorCapture"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_select" ON "WorkoutSensorCapture"
  FOR SELECT TO authenticated
  USING (public.client_visible_to_auth("clientId"));
CREATE POLICY "authenticated_insert" ON "WorkoutSensorCapture"
  FOR INSERT TO authenticated
  WITH CHECK (public.client_visible_to_auth("clientId"));
CREATE POLICY "authenticated_update" ON "WorkoutSensorCapture"
  FOR UPDATE TO authenticated
  USING (public.client_visible_to_auth("clientId"))
  WITH CHECK (public.client_visible_to_auth("clientId"));

ALTER TABLE "PlayerStaffNote" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "PlayerStaffNote";
DROP POLICY IF EXISTS "authenticated_select" ON "PlayerStaffNote";
DROP POLICY IF EXISTS "authenticated_insert" ON "PlayerStaffNote";
DROP POLICY IF EXISTS "authenticated_update" ON "PlayerStaffNote";
DROP POLICY IF EXISTS "authenticated_delete" ON "PlayerStaffNote";
CREATE POLICY "deny_anon_access" ON "PlayerStaffNote"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_select" ON "PlayerStaffNote"
  FOR SELECT TO authenticated
  USING (
    "authorId" = auth.uid()::text
    OR EXISTS (
      SELECT 1
        FROM "Client" c
       WHERE c.id = "PlayerStaffNote"."clientId"
         AND (
           c."userId" = auth.uid()::text
           OR public.team_staff_visible_to_auth(c."teamId")
           OR (
             "PlayerStaffNote"."visibleToAthlete" = true
             AND EXISTS (
               SELECT 1
                 FROM "AthleteAccount" aa
                WHERE aa."clientId" = c.id
                  AND aa."userId" = auth.uid()::text
             )
           )
         )
    )
  );
CREATE POLICY "authenticated_insert" ON "PlayerStaffNote"
  FOR INSERT TO authenticated
  WITH CHECK (
    "authorId" = auth.uid()::text
    AND EXISTS (
      SELECT 1
        FROM "Client" c
       WHERE c.id = "PlayerStaffNote"."clientId"
         AND ("PlayerStaffNote"."teamId" IS NULL OR "PlayerStaffNote"."teamId" = c."teamId")
         AND (
           c."userId" = auth.uid()::text
           OR public.team_staff_visible_to_auth(c."teamId")
         )
    )
  );
CREATE POLICY "authenticated_update" ON "PlayerStaffNote"
  FOR UPDATE TO authenticated
  USING (
    "authorId" = auth.uid()::text
    OR EXISTS (
      SELECT 1
        FROM "Client" c
       WHERE c.id = "PlayerStaffNote"."clientId"
         AND (
           c."userId" = auth.uid()::text
           OR public.team_staff_visible_to_auth(c."teamId")
         )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
        FROM "Client" c
       WHERE c.id = "PlayerStaffNote"."clientId"
         AND ("PlayerStaffNote"."teamId" IS NULL OR "PlayerStaffNote"."teamId" = c."teamId")
         AND (
           c."userId" = auth.uid()::text
           OR public.team_staff_visible_to_auth(c."teamId")
         )
    )
  );
CREATE POLICY "authenticated_delete" ON "PlayerStaffNote"
  FOR DELETE TO authenticated
  USING (
    "authorId" = auth.uid()::text
    OR EXISTS (
      SELECT 1
        FROM "Client" c
       WHERE c.id = "PlayerStaffNote"."clientId"
         AND (
           c."userId" = auth.uid()::text
           OR public.team_staff_visible_to_auth(c."teamId")
         )
    )
  );

ALTER TABLE "TeamCaptureSession" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "TeamCaptureSession";
DROP POLICY IF EXISTS "authenticated_access" ON "TeamCaptureSession";
CREATE POLICY "deny_anon_access" ON "TeamCaptureSession"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "TeamCaptureSession"
  FOR ALL TO authenticated
  USING ("coachId" = auth.uid()::text OR public.team_staff_visible_to_auth("teamId"))
  WITH CHECK ("coachId" = auth.uid()::text OR public.team_staff_visible_to_auth("teamId"));

ALTER TABLE "TeamCaptureStation" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "TeamCaptureStation";
DROP POLICY IF EXISTS "authenticated_access" ON "TeamCaptureStation";
CREATE POLICY "deny_anon_access" ON "TeamCaptureStation"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "TeamCaptureStation"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM "TeamCaptureSession" s
       WHERE s.id = "TeamCaptureStation"."sessionId"
         AND (s."coachId" = auth.uid()::text OR public.team_staff_visible_to_auth(s."teamId"))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
        FROM "TeamCaptureSession" s
       WHERE s.id = "TeamCaptureStation"."sessionId"
         AND (s."coachId" = auth.uid()::text OR public.team_staff_visible_to_auth(s."teamId"))
    )
  );

ALTER TABLE "TeamCaptureReading" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "TeamCaptureReading";
DROP POLICY IF EXISTS "authenticated_access" ON "TeamCaptureReading";
CREATE POLICY "deny_anon_access" ON "TeamCaptureReading"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "TeamCaptureReading"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM "TeamCaptureSession" s
       WHERE s.id = "TeamCaptureReading"."sessionId"
         AND (s."coachId" = auth.uid()::text OR public.team_staff_visible_to_auth(s."teamId"))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
        FROM "TeamCaptureSession" s
       WHERE s.id = "TeamCaptureReading"."sessionId"
         AND (s."coachId" = auth.uid()::text OR public.team_staff_visible_to_auth(s."teamId"))
    )
  );

ALTER TABLE "TeamCaptureParticipant" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "TeamCaptureParticipant";
DROP POLICY IF EXISTS "authenticated_select" ON "TeamCaptureParticipant";
DROP POLICY IF EXISTS "authenticated_insert" ON "TeamCaptureParticipant";
DROP POLICY IF EXISTS "authenticated_update" ON "TeamCaptureParticipant";
DROP POLICY IF EXISTS "authenticated_delete" ON "TeamCaptureParticipant";
CREATE POLICY "deny_anon_access" ON "TeamCaptureParticipant"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_select" ON "TeamCaptureParticipant"
  FOR SELECT TO authenticated
  USING (
    public.client_visible_to_auth("clientId")
    OR EXISTS (
      SELECT 1
        FROM "TeamCaptureSession" s
       WHERE s.id = "TeamCaptureParticipant"."sessionId"
         AND (s."coachId" = auth.uid()::text OR public.team_staff_visible_to_auth(s."teamId"))
    )
  );
CREATE POLICY "authenticated_insert" ON "TeamCaptureParticipant"
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
        FROM "TeamCaptureSession" s
       WHERE s.id = "TeamCaptureParticipant"."sessionId"
         AND (s."coachId" = auth.uid()::text OR public.team_staff_visible_to_auth(s."teamId"))
    )
  );
CREATE POLICY "authenticated_update" ON "TeamCaptureParticipant"
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM "TeamCaptureSession" s
       WHERE s.id = "TeamCaptureParticipant"."sessionId"
         AND (s."coachId" = auth.uid()::text OR public.team_staff_visible_to_auth(s."teamId"))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
        FROM "TeamCaptureSession" s
       WHERE s.id = "TeamCaptureParticipant"."sessionId"
         AND (s."coachId" = auth.uid()::text OR public.team_staff_visible_to_auth(s."teamId"))
    )
  );
CREATE POLICY "authenticated_delete" ON "TeamCaptureParticipant"
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM "TeamCaptureSession" s
       WHERE s.id = "TeamCaptureParticipant"."sessionId"
         AND (s."coachId" = auth.uid()::text OR public.team_staff_visible_to_auth(s."teamId"))
    )
  );

ALTER TABLE "TeamCaptureSegment" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "TeamCaptureSegment";
DROP POLICY IF EXISTS "authenticated_select" ON "TeamCaptureSegment";
DROP POLICY IF EXISTS "authenticated_insert" ON "TeamCaptureSegment";
DROP POLICY IF EXISTS "authenticated_update" ON "TeamCaptureSegment";
DROP POLICY IF EXISTS "authenticated_delete" ON "TeamCaptureSegment";
CREATE POLICY "deny_anon_access" ON "TeamCaptureSegment"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_select" ON "TeamCaptureSegment"
  FOR SELECT TO authenticated
  USING (
    public.client_visible_to_auth("clientId")
    OR EXISTS (
      SELECT 1
        FROM "TeamCaptureSession" s
       WHERE s.id = "TeamCaptureSegment"."sessionId"
         AND (s."coachId" = auth.uid()::text OR public.team_staff_visible_to_auth(s."teamId"))
    )
  );
CREATE POLICY "authenticated_insert" ON "TeamCaptureSegment"
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
        FROM "TeamCaptureSession" s
       WHERE s.id = "TeamCaptureSegment"."sessionId"
         AND (s."coachId" = auth.uid()::text OR public.team_staff_visible_to_auth(s."teamId"))
    )
  );
CREATE POLICY "authenticated_update" ON "TeamCaptureSegment"
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM "TeamCaptureSession" s
       WHERE s.id = "TeamCaptureSegment"."sessionId"
         AND (s."coachId" = auth.uid()::text OR public.team_staff_visible_to_auth(s."teamId"))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
        FROM "TeamCaptureSession" s
       WHERE s.id = "TeamCaptureSegment"."sessionId"
         AND (s."coachId" = auth.uid()::text OR public.team_staff_visible_to_auth(s."teamId"))
    )
  );
CREATE POLICY "authenticated_delete" ON "TeamCaptureSegment"
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM "TeamCaptureSession" s
       WHERE s.id = "TeamCaptureSegment"."sessionId"
         AND (s."coachId" = auth.uid()::text OR public.team_staff_visible_to_auth(s."teamId"))
    )
  );
