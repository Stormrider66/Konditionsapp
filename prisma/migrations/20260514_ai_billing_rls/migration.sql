ALTER TABLE "AIAllowanceAccount" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "AIAllowanceAccount"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "AIAllowanceAccount"
  FOR ALL TO authenticated
  USING (public.client_visible_to_auth("clientId"))
  WITH CHECK (public.client_visible_to_auth("clientId"));

ALTER TABLE "AITopUpPurchase" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "AITopUpPurchase"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "AITopUpPurchase"
  FOR ALL TO authenticated
  USING (public.client_visible_to_auth("clientId"))
  WITH CHECK (public.client_visible_to_auth("clientId"));

ALTER TABLE "AIProviderBillingImport" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "AIProviderBillingImport"
  FOR ALL TO anon, authenticated USING (false);
