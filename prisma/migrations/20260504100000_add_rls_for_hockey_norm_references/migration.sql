-- Protect coach/team-editable hockey norm references from direct REST access.
-- Prisma/service_role still bypasses RLS for application-owned server paths.
ALTER TABLE "HockeyNormReference" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_anon_access" ON "HockeyNormReference"
  FOR ALL TO anon USING (false);

CREATE POLICY "authenticated_access" ON "HockeyNormReference"
  FOR ALL TO authenticated
  USING ("coachId" = auth.uid()::text)
  WITH CHECK ("coachId" = auth.uid()::text);
