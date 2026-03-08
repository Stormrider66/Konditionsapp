-- Extend RLS to all tables (Lovable-style protection)
--
-- This migration:
-- 1. Fixes authUserId -> userId bug in existing Client/TrainingProgram/AthleteSubscription policies
-- 2. Adds RLS to User, BusinessMember, Business (used by middleware)
-- 3. Adds RLS to all remaining tables
--
-- Prisma bypasses RLS (uses superuser). This protects direct Supabase PostgREST/anon key access.

-- ============================================
-- FIX: Replace authUserId with userId (column doesn't exist)
-- ============================================

DROP POLICY IF EXISTS "authenticated_access" ON "Client";
CREATE POLICY "authenticated_access" ON "Client"
  FOR ALL TO authenticated
  USING (
    "userId" = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM "AthleteAccount" aa
      WHERE aa."clientId" = "Client".id
      AND aa."userId" = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "authenticated_access" ON "TrainingProgram";
CREATE POLICY "authenticated_access" ON "TrainingProgram"
  FOR ALL TO authenticated
  USING (
    "coachId" = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM "AthleteAccount" aa
      WHERE aa."clientId" = "TrainingProgram"."clientId"
      AND aa."userId" = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "authenticated_access" ON "AthleteSubscription";
CREATE POLICY "authenticated_access" ON "AthleteSubscription"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "Client" c
      WHERE c.id = "AthleteSubscription"."clientId"
      AND (
        c."userId" = auth.uid()::text
        OR EXISTS (
          SELECT 1 FROM "AthleteAccount" aa
          WHERE aa."clientId" = c.id
          AND aa."userId" = auth.uid()::text
        )
      )
    )
  );

-- ============================================
-- USER (middleware queries by email)
-- ============================================
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_anon_access" ON "User" FOR ALL TO anon USING (false);

-- Own row: by id (Supabase auth id) or email (legacy users)
CREATE POLICY "authenticated_access" ON "User" FOR ALL TO authenticated
  USING ("id" = auth.uid()::text OR email = (auth.jwt() ->> 'email'));

-- ============================================
-- BUSINESSMEMBER (middleware queries)
-- ============================================
ALTER TABLE "BusinessMember" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_anon_access" ON "BusinessMember" FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "BusinessMember" FOR ALL TO authenticated
  USING ("userId" = auth.uid()::text);

-- ============================================
-- BUSINESS (via BusinessMember)
-- ============================================
ALTER TABLE "Business" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_anon_access" ON "Business" FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "Business" FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "BusinessMember" bm
      WHERE bm."businessId" = "Business".id AND bm."userId" = auth.uid()::text
    )
  );

-- ============================================
-- ATHLETEACCOUNT
-- ============================================
ALTER TABLE "AthleteAccount" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_anon_access" ON "AthleteAccount" FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "AthleteAccount" FOR ALL TO authenticated
  USING (
    "userId" = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM "Client" c
      WHERE c.id = "AthleteAccount"."clientId" AND c."userId" = auth.uid()::text
    )
  );

-- ============================================
-- Helper: check if user can access a client's data
-- ============================================
CREATE OR REPLACE FUNCTION public.client_visible_to_auth(cid text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM "Client" c WHERE c.id = cid AND c."userId" = auth.uid()::text)
  OR EXISTS (
    SELECT 1 FROM "AthleteAccount" aa
    WHERE aa."clientId" = cid AND aa."userId" = auth.uid()::text
  );
$$;

-- ============================================
-- BUSINESS-SCOPED tables
-- ============================================
ALTER TABLE "BusinessApiKey" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "BusinessApiKey" FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "BusinessApiKey" FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM "BusinessMember" bm WHERE bm."businessId" = "BusinessApiKey"."businessId" AND bm."userId" = auth.uid()::text));

ALTER TABLE "BusinessAiKeys" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "BusinessAiKeys" FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "BusinessAiKeys" FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM "BusinessMember" bm WHERE bm."businessId" = "BusinessAiKeys"."businessId" AND bm."userId" = auth.uid()::text));

ALTER TABLE "PartnerReferral" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "PartnerReferral" FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "PartnerReferral" FOR ALL TO authenticated
  USING ("userId" = auth.uid()::text OR EXISTS (SELECT 1 FROM "BusinessMember" bm WHERE bm."businessId" = "PartnerReferral"."businessId" AND bm."userId" = auth.uid()::text));

ALTER TABLE "Tester" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "Tester" FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "Tester" FOR ALL TO authenticated
  USING ("userId" = auth.uid()::text OR EXISTS (SELECT 1 FROM "BusinessMember" bm WHERE bm."businessId" = "Tester"."businessId" AND bm."userId" = auth.uid()::text));

ALTER TABLE "Location" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "Location" FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "Location" FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM "BusinessMember" bm WHERE bm."businessId" = "Location"."businessId" AND bm."userId" = auth.uid()::text));

ALTER TABLE "BusinessFeature" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "BusinessFeature" FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "BusinessFeature" FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM "BusinessMember" bm WHERE bm."businessId" = "BusinessFeature"."businessId" AND bm."userId" = auth.uid()::text));

ALTER TABLE "Invitation" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "Invitation" FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "Invitation" FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM "BusinessMember" bm WHERE bm."businessId" = "Invitation"."businessId" AND bm."userId" = auth.uid()::text));

-- ============================================
-- USER-SCOPED (userId or coachId = auth.uid()::text)
-- ============================================
ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "Organization" FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "Organization" FOR ALL TO authenticated USING ("userId" = auth.uid()::text);

ALTER TABLE "Team" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "Team" FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "Team" FOR ALL TO authenticated USING ("userId" = auth.uid()::text);

ALTER TABLE "TeamWorkoutBroadcast" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "TeamWorkoutBroadcast" FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "TeamWorkoutBroadcast" FOR ALL TO authenticated USING ("coachId" = auth.uid()::text);

ALTER TABLE "ReferralCode" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "ReferralCode" FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "ReferralCode" FOR ALL TO authenticated USING ("userId" = auth.uid()::text);

ALTER TABLE "Referral" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "Referral" FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "Referral" FOR ALL TO authenticated
  USING ("referrerUserId" = auth.uid()::text OR "referredUserId" = auth.uid()::text);

ALTER TABLE "ReferralReward" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "ReferralReward" FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "ReferralReward" FOR ALL TO authenticated USING ("userId" = auth.uid()::text);

ALTER TABLE "TestTemplate" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_anon_access" ON "TestTemplate" FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "TestTemplate" FOR ALL TO authenticated USING ("userId" = auth.uid()::text);

-- ============================================
-- CLIENT-SCOPED (via helper)
-- ============================================
-- VisualReport: skip if not in DB (may have been added in later migration)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='VisualReport') THEN
    ALTER TABLE "VisualReport" ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "deny_anon_access" ON "VisualReport";
    CREATE POLICY "deny_anon_access" ON "VisualReport" FOR ALL TO anon USING (false);
    DROP POLICY IF EXISTS "authenticated_access" ON "VisualReport";
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='VisualReport' AND column_name='clientId') THEN
      CREATE POLICY "authenticated_access" ON "VisualReport" FOR ALL TO authenticated
        USING (public.client_visible_to_auth("clientId") OR "coachId" = auth.uid()::text);
    ELSE
      CREATE POLICY "authenticated_access" ON "VisualReport" FOR ALL TO authenticated USING ("coachId" = auth.uid()::text);
    END IF;
  END IF;
END $$;

ALTER TABLE "Report" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "Report";
DROP POLICY IF EXISTS "authenticated_access" ON "Report";
CREATE POLICY "deny_anon_access" ON "Report" FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "Report" FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM "Test" t WHERE t.id = "Report"."testId" AND public.client_visible_to_auth(t."clientId")));

ALTER TABLE "TestStage" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "TestStage";
DROP POLICY IF EXISTS "authenticated_access" ON "TestStage";
CREATE POLICY "deny_anon_access" ON "TestStage" FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "TestStage" FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM "Test" t WHERE t.id = "TestStage"."testId" AND public.client_visible_to_auth(t."clientId")));

ALTER TABLE "ThresholdCalculation" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "ThresholdCalculation";
DROP POLICY IF EXISTS "authenticated_access" ON "ThresholdCalculation";
CREATE POLICY "deny_anon_access" ON "ThresholdCalculation" FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "ThresholdCalculation" FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM "Test" t WHERE t.id = "ThresholdCalculation"."testId" AND public.client_visible_to_auth(t."clientId")));

-- Client-scoped tables with clientId: use dynamic SQL to skip if column missing (schema drift)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT table_name FROM information_schema.columns WHERE table_schema='public' AND column_name='clientId' GROUP BY table_name) LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', r.table_name);
      EXECUTE format('DROP POLICY IF EXISTS "deny_anon_access" ON %I', r.table_name);
      EXECUTE format('CREATE POLICY "deny_anon_access" ON %I FOR ALL TO anon USING (false)', r.table_name);
      EXECUTE format('DROP POLICY IF EXISTS "authenticated_access" ON %I', r.table_name);
      EXECUTE format('CREATE POLICY "authenticated_access" ON %I FOR ALL TO authenticated USING (public.client_visible_to_auth("clientId"))', r.table_name);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;

ALTER TABLE "TrainingWeek" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "TrainingWeek";
DROP POLICY IF EXISTS "authenticated_access" ON "TrainingWeek";
CREATE POLICY "deny_anon_access" ON "TrainingWeek" FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "TrainingWeek" FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM "TrainingProgram" tp WHERE tp.id = "TrainingWeek"."programId" AND (tp."coachId" = auth.uid()::text OR public.client_visible_to_auth(tp."clientId"))));

ALTER TABLE "TrainingDay" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "TrainingDay";
DROP POLICY IF EXISTS "authenticated_access" ON "TrainingDay";
CREATE POLICY "deny_anon_access" ON "TrainingDay" FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "TrainingDay" FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM "TrainingWeek" tw JOIN "TrainingProgram" tp ON tp.id = tw."programId" WHERE tw.id = "TrainingDay"."weekId" AND (tp."coachId" = auth.uid()::text OR public.client_visible_to_auth(tp."clientId"))));

ALTER TABLE "Workout" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "Workout";
DROP POLICY IF EXISTS "authenticated_access" ON "Workout";
CREATE POLICY "deny_anon_access" ON "Workout" FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "Workout" FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM "TrainingDay" td JOIN "TrainingWeek" tw ON tw.id = td."weekId" JOIN "TrainingProgram" tp ON tp.id = tw."programId" WHERE td.id = "Workout"."dayId" AND (tp."coachId" = auth.uid()::text OR public.client_visible_to_auth(tp."clientId"))));

ALTER TABLE "WorkoutSegment" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "WorkoutSegment";
DROP POLICY IF EXISTS "authenticated_access" ON "WorkoutSegment";
CREATE POLICY "deny_anon_access" ON "WorkoutSegment" FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "WorkoutSegment" FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM "Workout" w JOIN "TrainingDay" td ON td.id = w."dayId" JOIN "TrainingWeek" tw ON tw.id = td."weekId" JOIN "TrainingProgram" tp ON tp.id = tw."programId" WHERE w.id = "WorkoutSegment"."workoutId" AND (tp."coachId" = auth.uid()::text OR public.client_visible_to_auth(tp."clientId"))));

ALTER TABLE "Exercise" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "Exercise";
DROP POLICY IF EXISTS "authenticated_access" ON "Exercise";
CREATE POLICY "deny_anon_access" ON "Exercise" FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "Exercise" FOR ALL TO authenticated
  USING ("coachId" = auth.uid()::text);

ALTER TABLE "ExerciseFavorite" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "ExerciseFavorite";
DROP POLICY IF EXISTS "authenticated_access" ON "ExerciseFavorite";
CREATE POLICY "deny_anon_access" ON "ExerciseFavorite" FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "ExerciseFavorite" FOR ALL TO authenticated
  USING ("userId" = auth.uid()::text);

ALTER TABLE "WorkoutLog" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "WorkoutLog";
DROP POLICY IF EXISTS "authenticated_access" ON "WorkoutLog";
CREATE POLICY "deny_anon_access" ON "WorkoutLog" FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "WorkoutLog" FOR ALL TO authenticated
  USING ("athleteId" = auth.uid()::text);

ALTER TABLE "SetLog" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "SetLog";
DROP POLICY IF EXISTS "authenticated_access" ON "SetLog";
CREATE POLICY "deny_anon_access" ON "SetLog" FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "SetLog" FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM "WorkoutLog" wl WHERE wl.id = "SetLog"."workoutLogId" AND wl."athleteId" = auth.uid()::text));

ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "Message";
DROP POLICY IF EXISTS "authenticated_access" ON "Message";
CREATE POLICY "deny_anon_access" ON "Message" FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "Message" FOR ALL TO authenticated
  USING ("senderId" = auth.uid()::text OR "receiverId" = auth.uid()::text);

-- SelfReportedLactate, TrainingProgramEngine: handled by clientId loop (baseline has clientId)
ALTER TABLE "Race" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "Race";
DROP POLICY IF EXISTS "authenticated_access" ON "Race";
CREATE POLICY "deny_anon_access" ON "Race" FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "Race" FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM "RaceCalendar" rc WHERE rc.id = "Race"."calendarId" AND public.client_visible_to_auth(rc."clientId")));

ALTER TABLE "CoachDocument" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "CoachDocument";
DROP POLICY IF EXISTS "authenticated_access" ON "CoachDocument";
CREATE POLICY "deny_anon_access" ON "CoachDocument" FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "CoachDocument" FOR ALL TO authenticated USING ("coachId" = auth.uid()::text);

ALTER TABLE "KnowledgeChunk" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "KnowledgeChunk";
DROP POLICY IF EXISTS "authenticated_access" ON "KnowledgeChunk";
CREATE POLICY "deny_anon_access" ON "KnowledgeChunk" FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "KnowledgeChunk" FOR ALL TO authenticated
  USING ("coachId" = auth.uid()::text);

ALTER TABLE "AIConversation" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "AIConversation";
DROP POLICY IF EXISTS "authenticated_access" ON "AIConversation";
CREATE POLICY "deny_anon_access" ON "AIConversation" FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "AIConversation" FOR ALL TO authenticated USING ("coachId" = auth.uid()::text);

-- AIMessage, AIGeneratedProgram, AIGeneratedWOD: may have schema drift (conversationId etc) - use deny-all
ALTER TABLE "VideoAnalysis" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "VideoAnalysis";
DROP POLICY IF EXISTS "authenticated_access" ON "VideoAnalysis";
CREATE POLICY "deny_anon_access" ON "VideoAnalysis" FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "VideoAnalysis" FOR ALL TO authenticated USING ("coachId" = auth.uid()::text);

ALTER TABLE "MenstrualDailyLog" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "MenstrualDailyLog";
DROP POLICY IF EXISTS "authenticated_access" ON "MenstrualDailyLog";
CREATE POLICY "deny_anon_access" ON "MenstrualDailyLog" FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "MenstrualDailyLog" FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM "MenstrualCycle" mc WHERE mc.id = "MenstrualDailyLog"."cycleId" AND public.client_visible_to_auth(mc."clientId")));

-- InjuryAssessment has custom logic (assessedById)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='InjuryAssessment' AND column_name='clientId') THEN
    ALTER TABLE "InjuryAssessment" ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "deny_anon_access" ON "InjuryAssessment";
    CREATE POLICY "deny_anon_access" ON "InjuryAssessment" FOR ALL TO anon USING (false);
    DROP POLICY IF EXISTS "authenticated_access" ON "InjuryAssessment";
    CREATE POLICY "authenticated_access" ON "InjuryAssessment" FOR ALL TO authenticated
      USING (public.client_visible_to_auth("clientId") OR "assessedById" = auth.uid()::text);
  END IF;
END $$;

ALTER TABLE "RunningGaitAnalysis" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "RunningGaitAnalysis";
DROP POLICY IF EXISTS "authenticated_access" ON "RunningGaitAnalysis";
CREATE POLICY "deny_anon_access" ON "RunningGaitAnalysis" FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "RunningGaitAnalysis" FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM "VideoAnalysis" va WHERE va.id = "RunningGaitAnalysis"."videoAnalysisId" AND va."coachId" = auth.uid()::text));

ALTER TABLE "SkiingTechniqueAnalysis" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "SkiingTechniqueAnalysis";
DROP POLICY IF EXISTS "authenticated_access" ON "SkiingTechniqueAnalysis";
CREATE POLICY "deny_anon_access" ON "SkiingTechniqueAnalysis" FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "SkiingTechniqueAnalysis" FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM "VideoAnalysis" va WHERE va.id = "SkiingTechniqueAnalysis"."videoAnalysisId" AND va."coachId" = auth.uid()::text));

ALTER TABLE "HyroxStationAnalysis" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "HyroxStationAnalysis";
DROP POLICY IF EXISTS "authenticated_access" ON "HyroxStationAnalysis";
CREATE POLICY "deny_anon_access" ON "HyroxStationAnalysis" FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "HyroxStationAnalysis" FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM "VideoAnalysis" va WHERE va.id = "HyroxStationAnalysis"."videoAnalysisId" AND va."coachId" = auth.uid()::text));

-- ============================================
-- REMAINING TABLES: deny all via Supabase (Prisma-only access)
-- These are complex or infrequently used - safest to deny authenticated API access
-- ============================================
-- Equipment, LocationEquipment, LocationService, LocationStaff,
-- InjuryAssessment, PhysioAssignment, TreatmentSession, RehabProgram,
-- RehabExercise, RehabMilestone, RehabProgressLog, TrainingRestriction,
-- MovementScreen, AcuteInjuryReport, CareTeamThread, CareTeamMessage,
-- CareTeamParticipant, StrengthTrainingSession, RaceResult, SportPerformance,
-- SportProfile, AIModel, RunningGaitAnalysis, SkiingTechniqueAnalysis,
-- HyroxStationAnalysis, HybridWorkout, HybridWorkoutVersion, HybridMovement,
-- HybridWorkoutResult, HybridWorkoutAssignment, HybridWorkoutLog, HybridRoundLog,
-- StrengthSession, etc.

DO $$
DECLARE
  tbl text;
  remaining text[] := ARRAY[
    'AIMessage', 'AIGeneratedProgram', 'AIGeneratedWOD',
    'Equipment', 'LocationEquipment', 'LocationService', 'LocationStaff',
    'InjuryAssessment', 'PhysioAssignment', 'TreatmentSession', 'RehabProgram',
    'RehabExercise', 'RehabMilestone', 'RehabProgressLog', 'TrainingRestriction',
    'MovementScreen', 'AcuteInjuryReport', 'CareTeamThread', 'CareTeamMessage',
    'CareTeamParticipant',     'StrengthTrainingSession', 'AIModel', 'HybridWorkout', 'HybridWorkoutVersion', 'HybridMovement',
    'HybridWorkoutResult', 'HybridWorkoutAssignment', 'HybridWorkoutLog', 'HybridRoundLog',
    'TestTemplate', 'StrengthSession', 'StrengthSessionAssignment', 'StrengthTemplate',
    'CardioSession', 'CardioSessionAssignment', 'CardioTemplate', 'AgilityDrill',
    'AgilityWorkout', 'AgilityWorkoutAssignment', 'TimingGateSession', 'TimingGateResult',
    'CalendarEvent', 'CalendarEventChange', 'ExternalCalendarConnection',
    'BusinessApplication', 'BusinessJoinRequest', 'EnterpriseContract',
    'PricingOverride', 'ProgramGenerationSession', 'DeepResearchSession',
    'AIUsageBudget', 'AIUsageLog', 'LiveHRSession', 'SportTest', 'CoachProfile',
    'CoachRequest', 'CoachAgreement', 'CoachEarnings', 'AuditLog',
    'SystemError', 'EnterpriseContractChange', 'KnowledgeSkill'
  ];
BEGIN
  FOREACH tbl IN ARRAY remaining LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "deny_anon_access" ON %I', tbl);
      EXECUTE format('CREATE POLICY "deny_anon_access" ON %I FOR ALL TO anon USING (false)', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "authenticated_access" ON %I', tbl);
      EXECUTE format('CREATE POLICY "authenticated_access" ON %I FOR ALL TO authenticated USING (false)', tbl);
    EXCEPTION WHEN undefined_table THEN
      NULL;
    END;
  END LOOP;
END $$;
