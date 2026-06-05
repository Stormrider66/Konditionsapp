-- RLS coverage for the external athlete-access grant tokens.
-- These rows (including the token hash) are created, validated, and revoked
-- exclusively server-side via Prisma (service_role bypasses RLS). There is no
-- Supabase-client/REST access to this table, so deny anon + authenticated
-- entirely.

ALTER TABLE "AthleteExternalAccess" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_rest_access" ON "AthleteExternalAccess"
  FOR ALL TO anon, authenticated USING (false);
