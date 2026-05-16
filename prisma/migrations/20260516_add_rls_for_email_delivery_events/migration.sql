ALTER TABLE "EmailDeliveryEvent" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_rest_access" ON "EmailDeliveryEvent"
  FOR ALL TO anon, authenticated USING (false);
