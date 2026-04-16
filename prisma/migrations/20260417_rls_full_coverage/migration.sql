-- ════════════════════════════════════════════════════════════════════
-- Phase 2: RLS full coverage
-- ════════════════════════════════════════════════════════════════════
--
-- Enables Row Level Security on the 90 remaining tables identified by
-- scripts/audit-rls-coverage.ts. Prisma connects as the DB owner role
-- (BYPASSRLS) so application queries continue to work; this migration is
-- a defence-in-depth layer against accidental data exposure through the
-- Supabase REST API using anon or authenticated JWTs.
--
-- Policy groups:
--
--   A. userId           → row.userId = auth.uid()
--   B. coachId          → row.coachId = auth.uid()            (User.id FK)
--   C. athleteId/clientId
--                       → row.X lives on a Client whose userId = auth.uid()
--                         OR the user has an AthleteAccount on that client
--   D. businessId       → row.businessId has an active BusinessMember
--                         row for auth.uid()
--   E. createdById / authorId
--                       → row.X = auth.uid()
--   F. NONE (deny-all)  → no authenticated policy, only anon deny
--                         (Prisma/service_role bypasses RLS)
--
-- After this migration the expected audit output is `Uncovered: 0`.

-- ════════════════════════════════════════════════════════════════════
-- Group A — userId
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE "AuthEvent" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "AuthEvent"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "AuthEvent"
  FOR ALL TO authenticated
  USING ("userId" = auth.uid()::text);

ALTER TABLE "BroadcastNotification" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "BroadcastNotification"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "BroadcastNotification"
  FOR ALL TO authenticated
  USING ("userId" = auth.uid()::text);

ALTER TABLE "CommunityLike" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "CommunityLike"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "CommunityLike"
  FOR ALL TO authenticated
  USING ("userId" = auth.uid()::text);

ALTER TABLE "DashboardPreference" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "DashboardPreference"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "DashboardPreference"
  FOR ALL TO authenticated
  USING ("userId" = auth.uid()::text);

ALTER TABLE "HiddenExercise" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "HiddenExercise"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "HiddenExercise"
  FOR ALL TO authenticated
  USING ("userId" = auth.uid()::text);

ALTER TABLE "SupportTicket" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "SupportTicket"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "SupportTicket"
  FOR ALL TO authenticated
  USING ("userId" = auth.uid()::text);

ALTER TABLE "TeamCoachAssignment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "TeamCoachAssignment"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "TeamCoachAssignment"
  FOR ALL TO authenticated
  USING ("userId" = auth.uid()::text);

ALTER TABLE "UserCalendarPreference" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "UserCalendarPreference"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "UserCalendarPreference"
  FOR ALL TO authenticated
  USING ("userId" = auth.uid()::text);

ALTER TABLE "WorkoutTemplateFavorite" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "WorkoutTemplateFavorite"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "WorkoutTemplateFavorite"
  FOR ALL TO authenticated
  USING ("userId" = auth.uid()::text);

-- ════════════════════════════════════════════════════════════════════
-- Group B — coachId (FK to User.id; may be nullable)
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE "AIPrediction" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "AIPrediction"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "AIPrediction"
  FOR ALL TO authenticated
  USING ("coachId" = auth.uid()::text);

ALTER TABLE "CoachDashboardTemplate" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "CoachDashboardTemplate"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "CoachDashboardTemplate"
  FOR ALL TO authenticated
  USING ("coachId" = auth.uid()::text);

ALTER TABLE "CoachDecision" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "CoachDecision"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "CoachDecision"
  FOR ALL TO authenticated
  USING ("coachId" = auth.uid()::text);

ALTER TABLE "CustomTestResult" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "CustomTestResult"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "CustomTestResult"
  FOR ALL TO authenticated
  USING ("coachId" = auth.uid()::text);

ALTER TABLE "GroupClass" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "GroupClass"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "GroupClass"
  FOR ALL TO authenticated
  USING ("coachId" = auth.uid()::text);

ALTER TABLE "GroupClassSchedule" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "GroupClassSchedule"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "GroupClassSchedule"
  FOR ALL TO authenticated
  USING ("coachId" = auth.uid()::text);

ALTER TABLE "HockeyPhysicalTest" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "HockeyPhysicalTest"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "HockeyPhysicalTest"
  FOR ALL TO authenticated
  USING ("coachId" = auth.uid()::text);

ALTER TABLE "IntervalSession" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "IntervalSession"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "IntervalSession"
  FOR ALL TO authenticated
  USING ("coachId" = auth.uid()::text);

ALTER TABLE "IntervalSessionTemplate" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "IntervalSessionTemplate"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "IntervalSessionTemplate"
  FOR ALL TO authenticated
  USING ("coachId" = auth.uid()::text);

ALTER TABLE "MVAModel" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "MVAModel"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "MVAModel"
  FOR ALL TO authenticated
  USING ("coachId" = auth.uid()::text);

ALTER TABLE "TrainingPeriodOutcome" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "TrainingPeriodOutcome"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "TrainingPeriodOutcome"
  FOR ALL TO authenticated
  USING ("coachId" = auth.uid()::text);

ALTER TABLE "VoiceWorkoutSession" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "VoiceWorkoutSession"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "VoiceWorkoutSession"
  FOR ALL TO authenticated
  USING ("coachId" = auth.uid()::text);

ALTER TABLE "WorkoutTemplate" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "WorkoutTemplate"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "WorkoutTemplate"
  FOR ALL TO authenticated
  USING ("coachId" = auth.uid()::text);

-- ════════════════════════════════════════════════════════════════════
-- Group C — athleteId / clientId (FK to Client.id)
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE "AdHocWorkout" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "AdHocWorkout"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "AdHocWorkout"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Client" c
      WHERE c.id = "AdHocWorkout"."athleteId"
        AND (c."userId" = auth.uid()::text
             OR EXISTS (SELECT 1 FROM "AthleteAccount" aa
                        WHERE aa."clientId" = c.id
                          AND aa."userId" = auth.uid()::text))
    )
  );

ALTER TABLE "AgilityWorkoutResult" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "AgilityWorkoutResult"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "AgilityWorkoutResult"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Client" c
      WHERE c.id = "AgilityWorkoutResult"."athleteId"
        AND (c."userId" = auth.uid()::text
             OR EXISTS (SELECT 1 FROM "AthleteAccount" aa
                        WHERE aa."clientId" = c.id
                          AND aa."userId" = auth.uid()::text))
    )
  );

ALTER TABLE "AthletePatternMatch" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "AthletePatternMatch"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "AthletePatternMatch"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Client" c
      WHERE c.id = "AthletePatternMatch"."athleteId"
        AND (c."userId" = auth.uid()::text
             OR EXISTS (SELECT 1 FROM "AthleteAccount" aa
                        WHERE aa."clientId" = c.id
                          AND aa."userId" = auth.uid()::text))
    )
  );

ALTER TABLE "BenchmarkComparison" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "BenchmarkComparison"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "BenchmarkComparison"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Client" c
      WHERE c.id = "BenchmarkComparison"."athleteId"
        AND (c."userId" = auth.uid()::text
             OR EXISTS (SELECT 1 FROM "AthleteAccount" aa
                        WHERE aa."clientId" = c.id
                          AND aa."userId" = auth.uid()::text))
    )
  );

ALTER TABLE "CardioSessionLog" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "CardioSessionLog"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "CardioSessionLog"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Client" c
      WHERE c.id = "CardioSessionLog"."athleteId"
        AND (c."userId" = auth.uid()::text
             OR EXISTS (SELECT 1 FROM "AthleteAccount" aa
                        WHERE aa."clientId" = c.id
                          AND aa."userId" = auth.uid()::text))
    )
  );

ALTER TABLE "DataMoatConsent" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "DataMoatConsent"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "DataMoatConsent"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Client" c
      WHERE c.id = "DataMoatConsent"."athleteId"
        AND (c."userId" = auth.uid()::text
             OR EXISTS (SELECT 1 FROM "AthleteAccount" aa
                        WHERE aa."clientId" = c.id
                          AND aa."userId" = auth.uid()::text))
    )
  );

ALTER TABLE "ExerciseEffectiveness" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "ExerciseEffectiveness"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "ExerciseEffectiveness"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Client" c
      WHERE c.id = "ExerciseEffectiveness"."athleteId"
        AND (c."userId" = auth.uid()::text
             OR EXISTS (SELECT 1 FROM "AthleteAccount" aa
                        WHERE aa."clientId" = c.id
                          AND aa."userId" = auth.uid()::text))
    )
  );

-- MVAAthleteScore: athleteId is Client.id by convention (no explicit FK but
-- analytics consumers treat it as such).
ALTER TABLE "MVAAthleteScore" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "MVAAthleteScore"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "MVAAthleteScore"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Client" c
      WHERE c.id = "MVAAthleteScore"."athleteId"
        AND (c."userId" = auth.uid()::text
             OR EXISTS (SELECT 1 FROM "AthleteAccount" aa
                        WHERE aa."clientId" = c.id
                          AND aa."userId" = auth.uid()::text))
    )
  );

ALTER TABLE "TestPredictiveValidation" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "TestPredictiveValidation"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "TestPredictiveValidation"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Client" c
      WHERE c.id = "TestPredictiveValidation"."athleteId"
        AND (c."userId" = auth.uid()::text
             OR EXISTS (SELECT 1 FROM "AthleteAccount" aa
                        WHERE aa."clientId" = c.id
                          AND aa."userId" = auth.uid()::text))
    )
  );

ALTER TABLE "CompetitionEntry" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "CompetitionEntry"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "CompetitionEntry"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Client" c
      WHERE c.id = "CompetitionEntry"."clientId"
        AND (c."userId" = auth.uid()::text
             OR EXISTS (SELECT 1 FROM "AthleteAccount" aa
                        WHERE aa."clientId" = c.id
                          AND aa."userId" = auth.uid()::text))
    )
  );

ALTER TABLE "DailyMetricsProcessingJob" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "DailyMetricsProcessingJob"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "DailyMetricsProcessingJob"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Client" c
      WHERE c.id = "DailyMetricsProcessingJob"."clientId"
        AND (c."userId" = auth.uid()::text
             OR EXISTS (SELECT 1 FROM "AthleteAccount" aa
                        WHERE aa."clientId" = c.id
                          AND aa."userId" = auth.uid()::text))
    )
  );

ALTER TABLE "GroupClassBooking" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "GroupClassBooking"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "GroupClassBooking"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Client" c
      WHERE c.id = "GroupClassBooking"."clientId"
        AND (c."userId" = auth.uid()::text
             OR EXISTS (SELECT 1 FROM "AthleteAccount" aa
                        WHERE aa."clientId" = c.id
                          AND aa."userId" = auth.uid()::text))
    )
  );

ALTER TABLE "GymSyncedBooking" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "GymSyncedBooking"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "GymSyncedBooking"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Client" c
      WHERE c.id = "GymSyncedBooking"."clientId"
        AND (c."userId" = auth.uid()::text
             OR EXISTS (SELECT 1 FROM "AthleteAccount" aa
                        WHERE aa."clientId" = c.id
                          AND aa."userId" = auth.uid()::text))
    )
  );

ALTER TABLE "IntervalSessionParticipant" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "IntervalSessionParticipant"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "IntervalSessionParticipant"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Client" c
      WHERE c.id = "IntervalSessionParticipant"."clientId"
        AND (c."userId" = auth.uid()::text
             OR EXISTS (SELECT 1 FROM "AthleteAccount" aa
                        WHERE aa."clientId" = c.id
                          AND aa."userId" = auth.uid()::text))
    )
  );

ALTER TABLE "LiveVoiceCoachingSession" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "LiveVoiceCoachingSession"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "LiveVoiceCoachingSession"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Client" c
      WHERE c.id = "LiveVoiceCoachingSession"."clientId"
        AND (c."userId" = auth.uid()::text
             OR EXISTS (SELECT 1 FROM "AthleteAccount" aa
                        WHERE aa."clientId" = c.id
                          AND aa."userId" = auth.uid()::text))
    )
  );

ALTER TABLE "NutritionWrapped" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "NutritionWrapped"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "NutritionWrapped"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Client" c
      WHERE c.id = "NutritionWrapped"."clientId"
        AND (c."userId" = auth.uid()::text
             OR EXISTS (SELECT 1 FROM "AthleteAccount" aa
                        WHERE aa."clientId" = c.id
                          AND aa."userId" = auth.uid()::text))
    )
  );

ALTER TABLE "SharedAchievement" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "SharedAchievement"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "SharedAchievement"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Client" c
      WHERE c.id = "SharedAchievement"."clientId"
        AND (c."userId" = auth.uid()::text
             OR EXISTS (SELECT 1 FROM "AthleteAccount" aa
                        WHERE aa."clientId" = c.id
                          AND aa."userId" = auth.uid()::text))
    )
  );

-- ════════════════════════════════════════════════════════════════════
-- Group D — businessId (via BusinessMember)
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE "BusinessCalendarSettings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "BusinessCalendarSettings"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "BusinessCalendarSettings"
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM "BusinessMember" bm
            WHERE bm."businessId" = "BusinessCalendarSettings"."businessId"
              AND bm."userId" = auth.uid()::text
              AND bm."isActive" = true)
  );

ALTER TABLE "CoachTask" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "CoachTask"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "CoachTask"
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM "BusinessMember" bm
            WHERE bm."businessId" = "CoachTask"."businessId"
              AND bm."userId" = auth.uid()::text
              AND bm."isActive" = true)
  );

ALTER TABLE "CommunityPost" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "CommunityPost"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "CommunityPost"
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM "BusinessMember" bm
            WHERE bm."businessId" = "CommunityPost"."businessId"
              AND bm."userId" = auth.uid()::text
              AND bm."isActive" = true)
  );

ALTER TABLE "Competition" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "Competition"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "Competition"
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM "BusinessMember" bm
            WHERE bm."businessId" = "Competition"."businessId"
              AND bm."userId" = auth.uid()::text
              AND bm."isActive" = true)
  );

ALTER TABLE "CustomTestProtocol" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "CustomTestProtocol"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "CustomTestProtocol"
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM "BusinessMember" bm
            WHERE bm."businessId" = "CustomTestProtocol"."businessId"
              AND bm."userId" = auth.uid()::text
              AND bm."isActive" = true)
  );

ALTER TABLE "GymPlatformConnection" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "GymPlatformConnection"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "GymPlatformConnection"
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM "BusinessMember" bm
            WHERE bm."businessId" = "GymPlatformConnection"."businessId"
              AND bm."userId" = auth.uid()::text
              AND bm."isActive" = true)
  );

ALTER TABLE "SocialMediaAccount" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "SocialMediaAccount"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "SocialMediaAccount"
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM "BusinessMember" bm
            WHERE bm."businessId" = "SocialMediaAccount"."businessId"
              AND bm."userId" = auth.uid()::text
              AND bm."isActive" = true)
  );

ALTER TABLE "SocialPost" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "SocialPost"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "SocialPost"
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM "BusinessMember" bm
            WHERE bm."businessId" = "SocialPost"."businessId"
              AND bm."userId" = auth.uid()::text
              AND bm."isActive" = true)
  );

ALTER TABLE "TeamDrill" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "TeamDrill"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "TeamDrill"
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM "BusinessMember" bm
            WHERE bm."businessId" = "TeamDrill"."businessId"
              AND bm."userId" = auth.uid()::text
              AND bm."isActive" = true)
  );

-- ════════════════════════════════════════════════════════════════════
-- Group E — createdById / authorId
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE "TeamEvent" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "TeamEvent"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "TeamEvent"
  FOR ALL TO authenticated
  USING ("createdById" = auth.uid()::text);

ALTER TABLE "CommunityComment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "CommunityComment"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "CommunityComment"
  FOR ALL TO authenticated
  USING ("authorId" = auth.uid()::text);

-- ════════════════════════════════════════════════════════════════════
-- Group F — NONE (deny-all; only accessed via Prisma / service_role)
-- ════════════════════════════════════════════════════════════════════
--
-- For these 40 tables no ownership column was identifiable. The safe
-- default is to deny all REST API access (anon AND authenticated) and
-- rely on the BYPASSRLS privilege of the Prisma connection role for
-- normal application traffic. If any of these tables later needs direct
-- REST access, add a targeted authenticated policy in a follow-up.

ALTER TABLE "AIFeedbackLoop" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "AIFeedbackLoop"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "AIModelVersion" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "AIModelVersion"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "AIPromptTemplate" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "AIPromptTemplate"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "AccuracySnapshot" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "AccuracySnapshot"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "ActivityHRZoneDistribution" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "ActivityHRZoneDistribution"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "AgentEvent" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "AgentEvent"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "AgilityWorkoutDrill" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "AgilityWorkoutDrill"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "AthleteCoachPermission" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "AthleteCoachPermission"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "AthleteCohort" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "AthleteCohort"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "CardioSegmentLog" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "CardioSegmentLog"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "CoachReview" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "CoachReview"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "DeepResearchProgress" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "DeepResearchProgress"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "ErgometerBenchmark" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "ErgometerBenchmark"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "ExerciseOutcomePattern" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "ExerciseOutcomePattern"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "FeatureRequest" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "FeatureRequest"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "FounderBrief" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "FounderBrief"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "GymSyncedClass" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "GymSyncedClass"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "HabitLog" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "HabitLog"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "IntervalLactate" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "IntervalLactate"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "IntervalLap" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "IntervalLap"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "LiveHRReading" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "LiveHRReading"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "LiveVoiceTranscript" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "LiveVoiceTranscript"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "ManagedAgentSession" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "ManagedAgentSession"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "MealFoodItem" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "MealFoodItem"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "OperatorAgentJob" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "OperatorAgentJob"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "OperatorAgentRun" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "OperatorAgentRun"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "PerformancePattern" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "PerformancePattern"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "PlatformConfig" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "PlatformConfig"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "PredictionValidation" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "PredictionValidation"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "PricingTier" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "PricingTier"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "ProgramGenerationProgress" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "ProgramGenerationProgress"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "SlackThreadContext" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "SlackThreadContext"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "SocialPostPublish" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "SocialPostPublish"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "SportTestBenchmark" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "SportTestBenchmark"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "StripeWebhookEvent" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "StripeWebhookEvent"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "SystemMetric" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "SystemMetric"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "TrainingFingerprint" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "TrainingFingerprint"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "VBTMeasurement" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "VBTMeasurement"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "WeeklyReport" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "WeeklyReport"
  FOR ALL TO anon, authenticated USING (false);

ALTER TABLE "WorkoutModification" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_rest_access" ON "WorkoutModification"
  FOR ALL TO anon, authenticated USING (false);
