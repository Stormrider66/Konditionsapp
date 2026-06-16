-- RLS coverage for athlete-owned live capture sessions.

ALTER TABLE "QuickErgSession" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "QuickErgSession";
DROP POLICY IF EXISTS "authenticated_access" ON "QuickErgSession";
CREATE POLICY "deny_anon_access" ON "QuickErgSession"
  FOR ALL TO anon
  USING (false);
CREATE POLICY "authenticated_access" ON "QuickErgSession"
  FOR ALL TO authenticated
  USING (public.client_visible_to_auth("clientId"));

ALTER TABLE "PhoneRunSession" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "PhoneRunSession";
DROP POLICY IF EXISTS "authenticated_access" ON "PhoneRunSession";
CREATE POLICY "deny_anon_access" ON "PhoneRunSession"
  FOR ALL TO anon
  USING (false);
CREATE POLICY "authenticated_access" ON "PhoneRunSession"
  FOR ALL TO authenticated
  USING (public.client_visible_to_auth("clientId"));
