-- Add RLS coverage for team block-plan tables after TeamPlan tables exist.

ALTER TABLE "TeamPlan" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "TeamPlan";
DROP POLICY IF EXISTS "authenticated_access" ON "TeamPlan";
CREATE POLICY "deny_anon_access" ON "TeamPlan"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "TeamPlan"
  FOR ALL TO authenticated
  USING (
    "coachId" = auth.uid()::text
    OR EXISTS (
      SELECT 1
        FROM "Team" t
       WHERE t.id = "TeamPlan"."teamId"
         AND t."userId" = auth.uid()::text
    )
  )
  WITH CHECK (
    "coachId" = auth.uid()::text
    OR EXISTS (
      SELECT 1
        FROM "Team" t
       WHERE t.id = "TeamPlan"."teamId"
         AND t."userId" = auth.uid()::text
    )
  );

ALTER TABLE "TeamPlanBlock" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "TeamPlanBlock";
DROP POLICY IF EXISTS "authenticated_access" ON "TeamPlanBlock";
CREATE POLICY "deny_anon_access" ON "TeamPlanBlock"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "TeamPlanBlock"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM "TeamPlan" p
        JOIN "Team" t ON t.id = p."teamId"
       WHERE p.id = "TeamPlanBlock"."planId"
         AND (
           p."coachId" = auth.uid()::text
           OR t."userId" = auth.uid()::text
         )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
        FROM "TeamPlan" p
        JOIN "Team" t ON t.id = p."teamId"
       WHERE p.id = "TeamPlanBlock"."planId"
         AND (
           p."coachId" = auth.uid()::text
           OR t."userId" = auth.uid()::text
         )
    )
  );
