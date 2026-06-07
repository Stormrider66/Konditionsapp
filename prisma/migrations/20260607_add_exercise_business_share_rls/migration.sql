-- Exercise business shares are server-managed through app routes/scripts.
-- Deny direct Supabase REST access while keeping Prisma/server access intact.

ALTER TABLE "ExerciseBusinessShare" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_rest_access" ON "ExerciseBusinessShare"
  FOR ALL TO anon, authenticated USING (false);
