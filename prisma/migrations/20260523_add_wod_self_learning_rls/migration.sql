-- RLS coverage for self-learning Dagens pass tables.
-- Prisma/service_role still bypasses RLS; these policies protect direct
-- Supabase REST/Data API access with anon or authenticated JWTs.

ALTER TABLE "WODPreferenceProfile" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "WODPreferenceProfile"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_select" ON "WODPreferenceProfile"
  FOR SELECT TO authenticated
  USING (public.client_visible_to_auth("clientId"));
CREATE POLICY "authenticated_insert" ON "WODPreferenceProfile"
  FOR INSERT TO authenticated
  WITH CHECK (public.client_visible_to_auth("clientId"));
CREATE POLICY "authenticated_update" ON "WODPreferenceProfile"
  FOR UPDATE TO authenticated
  USING (public.client_visible_to_auth("clientId"))
  WITH CHECK (public.client_visible_to_auth("clientId"));
CREATE POLICY "authenticated_delete" ON "WODPreferenceProfile"
  FOR DELETE TO authenticated
  USING (public.client_visible_to_auth("clientId"));

ALTER TABLE "WODGlobalLearningAggregate" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "WODGlobalLearningAggregate"
  FOR ALL TO anon, authenticated USING (false);
