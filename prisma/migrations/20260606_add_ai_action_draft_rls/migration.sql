-- Add RLS coverage for AI action drafts.

ALTER TABLE "AIActionDraft" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "AIActionDraft";
DROP POLICY IF EXISTS "authenticated_access" ON "AIActionDraft";
CREATE POLICY "deny_anon_access" ON "AIActionDraft"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "AIActionDraft"
  FOR ALL TO authenticated
  USING (
    (select auth.uid()) IS NOT NULL
    AND "actorUserId" = (select auth.uid())::text
  )
  WITH CHECK (
    (select auth.uid()) IS NOT NULL
    AND "actorUserId" = (select auth.uid())::text
  );
