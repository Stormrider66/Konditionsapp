-- Add RLS coverage for shared team dashboard notes.

ALTER TABLE "TeamNote" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "TeamNote";
DROP POLICY IF EXISTS "authenticated_access" ON "TeamNote";

CREATE POLICY "deny_anon_access" ON "TeamNote"
  FOR ALL TO anon USING (false);

CREATE POLICY "authenticated_access" ON "TeamNote"
  FOR ALL TO authenticated
  USING (
    "authorId" = auth.uid()::text
    OR EXISTS (
      SELECT 1
        FROM "Team" t
       WHERE t.id = "TeamNote"."teamId"
         AND t."userId" = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1
        FROM "TeamCoachAssignment" tca
       WHERE tca."teamId" = "TeamNote"."teamId"
         AND tca."userId" = auth.uid()::text
    )
  )
  WITH CHECK (
    "authorId" = auth.uid()::text
    OR EXISTS (
      SELECT 1
        FROM "Team" t
       WHERE t.id = "TeamNote"."teamId"
         AND t."userId" = auth.uid()::text
    )
    OR EXISTS (
      SELECT 1
        FROM "TeamCoachAssignment" tca
       WHERE tca."teamId" = "TeamNote"."teamId"
         AND tca."userId" = auth.uid()::text
    )
  );
