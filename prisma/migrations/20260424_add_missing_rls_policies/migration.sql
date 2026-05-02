-- Add RLS coverage for models introduced after the full-coverage audit.
-- Prisma/service_role still bypasses RLS; these policies protect direct
-- Supabase REST/Data API access with anon or authenticated JWTs.

ALTER TABLE "FoodScanCorrection" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "FoodScanCorrection"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_select" ON "FoodScanCorrection"
  FOR SELECT TO authenticated
  USING (public.client_visible_to_auth("clientId"));
CREATE POLICY "authenticated_insert" ON "FoodScanCorrection"
  FOR INSERT TO authenticated
  WITH CHECK (public.client_visible_to_auth("clientId"));
CREATE POLICY "authenticated_update" ON "FoodScanCorrection"
  FOR UPDATE TO authenticated
  USING (public.client_visible_to_auth("clientId"))
  WITH CHECK (public.client_visible_to_auth("clientId"));
CREATE POLICY "authenticated_delete" ON "FoodScanCorrection"
  FOR DELETE TO authenticated
  USING (public.client_visible_to_auth("clientId"));

ALTER TABLE "ImportAttempt" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "ImportAttempt"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_select" ON "ImportAttempt"
  FOR SELECT TO authenticated
  USING (
    "userId" = auth.uid()::text
    OR "coachId" = auth.uid()::text
    OR public.client_visible_to_auth("athleteClientId")
  );
CREATE POLICY "authenticated_insert" ON "ImportAttempt"
  FOR INSERT TO authenticated
  WITH CHECK (
    "userId" = auth.uid()::text
    OR "coachId" = auth.uid()::text
    OR public.client_visible_to_auth("athleteClientId")
  );
CREATE POLICY "authenticated_update" ON "ImportAttempt"
  FOR UPDATE TO authenticated
  USING (
    "userId" = auth.uid()::text
    OR "coachId" = auth.uid()::text
    OR public.client_visible_to_auth("athleteClientId")
  )
  WITH CHECK (
    "userId" = auth.uid()::text
    OR "coachId" = auth.uid()::text
    OR public.client_visible_to_auth("athleteClientId")
  );
CREATE POLICY "authenticated_delete" ON "ImportAttempt"
  FOR DELETE TO authenticated
  USING (
    "userId" = auth.uid()::text
    OR "coachId" = auth.uid()::text
    OR public.client_visible_to_auth("athleteClientId")
  );

ALTER TABLE "ExerciseNameAlias" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "ExerciseNameAlias"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_select" ON "ExerciseNameAlias"
  FOR SELECT TO authenticated
  USING ("coachId" IS NULL OR "coachId" = auth.uid()::text);
CREATE POLICY "authenticated_insert" ON "ExerciseNameAlias"
  FOR INSERT TO authenticated
  WITH CHECK ("coachId" = auth.uid()::text);
CREATE POLICY "authenticated_update" ON "ExerciseNameAlias"
  FOR UPDATE TO authenticated
  USING ("coachId" = auth.uid()::text)
  WITH CHECK ("coachId" = auth.uid()::text);
CREATE POLICY "authenticated_delete" ON "ExerciseNameAlias"
  FOR DELETE TO authenticated
  USING ("coachId" = auth.uid()::text);
