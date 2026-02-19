-- Row Level Security Policies
--
-- These protect against direct Supabase REST API access using the public anon key.
-- Prisma connects as the database superuser, so application queries bypass RLS.
-- This is a defence-in-depth layer: if application code has a bug, RLS prevents
-- data leakage through the Supabase REST API.

-- ============================================
-- 1. Test table
-- ============================================
ALTER TABLE "Test" ENABLE ROW LEVEL SECURITY;

-- Block anonymous access entirely
CREATE POLICY "deny_anon_access" ON "Test"
  FOR ALL
  TO anon
  USING (false);

-- Authenticated users can only access their own tests or tests of clients they own
CREATE POLICY "authenticated_access" ON "Test"
  FOR ALL
  TO authenticated
  USING (
    "userId" = auth.uid()
    OR EXISTS (
      SELECT 1 FROM "Client" c
      WHERE c.id = "Test"."clientId"
      AND c."userId" = auth.uid()
    )
  );

-- ============================================
-- 2. Client table
-- ============================================
ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_anon_access" ON "Client"
  FOR ALL
  TO anon
  USING (false);

-- Coach owns client, or athlete accessing own record via AthleteAccount
CREATE POLICY "authenticated_access" ON "Client"
  FOR ALL
  TO authenticated
  USING (
    "userId" = auth.uid()
    OR EXISTS (
      SELECT 1 FROM "AthleteAccount" aa
      WHERE aa."clientId" = "Client".id
      AND aa."authUserId" = auth.uid()
    )
  );

-- ============================================
-- 3. TrainingProgram table
-- ============================================
ALTER TABLE "TrainingProgram" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_anon_access" ON "TrainingProgram"
  FOR ALL
  TO anon
  USING (false);

-- Coach who created the program, or athlete whose client record matches
CREATE POLICY "authenticated_access" ON "TrainingProgram"
  FOR ALL
  TO authenticated
  USING (
    "coachId" = auth.uid()
    OR EXISTS (
      SELECT 1 FROM "AthleteAccount" aa
      WHERE aa."clientId" = "TrainingProgram"."clientId"
      AND aa."authUserId" = auth.uid()
    )
  );

-- ============================================
-- 4. AthleteSubscription table
-- ============================================
ALTER TABLE "AthleteSubscription" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_anon_access" ON "AthleteSubscription"
  FOR ALL
  TO anon
  USING (false);

-- Athlete (via client ownership) or coach who owns the client
CREATE POLICY "authenticated_access" ON "AthleteSubscription"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Client" c
      WHERE c.id = "AthleteSubscription"."clientId"
      AND (
        c."userId" = auth.uid()
        OR EXISTS (
          SELECT 1 FROM "AthleteAccount" aa
          WHERE aa."clientId" = c.id
          AND aa."authUserId" = auth.uid()
        )
      )
    )
  );

-- ============================================
-- 5. Subscription table (coach subscriptions)
-- ============================================
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_anon_access" ON "Subscription"
  FOR ALL
  TO anon
  USING (false);

-- Own subscription only
CREATE POLICY "authenticated_access" ON "Subscription"
  FOR ALL
  TO authenticated
  USING ("userId" = auth.uid());

-- ============================================
-- 6. IntegrationToken table (OAuth tokens)
-- ============================================
ALTER TABLE "IntegrationToken" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_anon_access" ON "IntegrationToken"
  FOR ALL
  TO anon
  USING (false);

-- Coach who owns the client
CREATE POLICY "authenticated_access" ON "IntegrationToken"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Client" c
      WHERE c.id = "IntegrationToken"."clientId"
      AND c."userId" = auth.uid()
    )
  );

-- ============================================
-- 7. UserApiKey table
-- ============================================
ALTER TABLE "UserApiKey" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_anon_access" ON "UserApiKey"
  FOR ALL
  TO anon
  USING (false);

-- Own record only
CREATE POLICY "authenticated_access" ON "UserApiKey"
  FOR ALL
  TO authenticated
  USING ("userId" = auth.uid());
