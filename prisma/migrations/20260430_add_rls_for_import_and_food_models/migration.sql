-- Ensure recently added server-managed tables are covered by RLS.
-- These tables are accessed through app routes/scripts, not directly through
-- Supabase REST, so authenticated/anon REST access is denied.

ALTER TABLE "ExerciseNameAlias" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "ExerciseNameAlias"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "Food" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "Food"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "FoodScanCorrection" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "FoodScanCorrection"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "ImportAttempt" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "ImportAttempt"
  FOR ALL TO anon, authenticated USING (false);
