-- Server-owned team chat, push token, and drill-view tables.
-- App routes authorize access in TypeScript/Prisma; direct Supabase REST access
-- is denied while service-role Prisma access remains intact.

ALTER TABLE "DevicePushToken" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "DevicePushToken"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "TeamDrillView" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "TeamDrillView"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "Thread" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "Thread"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "ThreadMessage" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "ThreadMessage"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "ThreadParticipant" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "ThreadParticipant"
  FOR ALL TO anon, authenticated USING (false);
