-- RLS coverage for the admin-only deleted user archive.
-- Prisma/service_role keeps server access; direct Supabase REST access is denied.

ALTER TABLE "DeletedUserDataArchive" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_rest_access" ON "DeletedUserDataArchive"
  FOR ALL TO anon, authenticated USING (false);
