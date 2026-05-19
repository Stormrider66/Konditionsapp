-- Add RLS coverage for athlete block-plan tables.

ALTER TABLE "AthletePlan" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "AthletePlan";
DROP POLICY IF EXISTS "authenticated_access" ON "AthletePlan";
CREATE POLICY "deny_anon_access" ON "AthletePlan"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "AthletePlan"
  FOR ALL TO authenticated
  USING (
    "coachId" = auth.uid()::text
    OR public.client_visible_to_auth("clientId")
  )
  WITH CHECK (
    "coachId" = auth.uid()::text
    OR public.client_visible_to_auth("clientId")
  );

ALTER TABLE "AthletePlanBlock" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "AthletePlanBlock";
DROP POLICY IF EXISTS "authenticated_access" ON "AthletePlanBlock";
CREATE POLICY "deny_anon_access" ON "AthletePlanBlock"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "AthletePlanBlock"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM "AthletePlan" p
       WHERE p.id = "AthletePlanBlock"."planId"
         AND (
           p."coachId" = auth.uid()::text
           OR public.client_visible_to_auth(p."clientId")
         )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
        FROM "AthletePlan" p
       WHERE p.id = "AthletePlanBlock"."planId"
         AND (
           p."coachId" = auth.uid()::text
           OR public.client_visible_to_auth(p."clientId")
         )
    )
  );
