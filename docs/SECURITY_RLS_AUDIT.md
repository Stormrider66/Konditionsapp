# RLS (Row Level Security) Audit

**Purpose:** Protect against Lovable-style vulnerabilities where the Supabase anon key can be used to directly query tables via PostgREST.

**Reference:** CVE-2025-48757, [Lovable data leak](https://www.theregister.com/2026/02/27/lovable_app_vulnerabilities/)

## Architecture

- **Prisma** connects as database superuser → bypasses RLS (intentional; all app data access goes through authenticated API routes).
- **Supabase PostgREST** uses `anon` and `authenticated` roles → RLS applies.
- **RLS** is defence-in-depth: if an API bug or direct REST call occurs, RLS blocks unauthorized access.

## Policy Fix (20260306)

The original RLS migration (20260219) referenced `authUserId` in AthleteAccount, but the schema uses `userId`. This migration fixes that bug in Client, TrainingProgram, and AthleteSubscription policies.

## Tables by RLS Status

### ✅ Fully Covered (explicit policies)

| Table | Access Pattern |
|-------|----------------|
| User | Own row: `id = auth.uid()` OR `email = auth.jwt() ->> 'email'` |
| BusinessMember | `userId = auth.uid()` |
| Business | Via BusinessMember membership |
| AthleteAccount | `userId = auth.uid()` OR coach owns Client |
| BusinessApiKey, BusinessAiKeys | Business member |
| PartnerReferral, Tester, Location, BusinessFeature, Invitation | Business member |
| Organization, Team, TeamWorkoutBroadcast | userId / coachId = auth.uid() |
| ReferralCode, Referral, ReferralReward, TestTemplate | userId = auth.uid() |
| Client, Test, TrainingProgram, AthleteSubscription | Existing + fixed (userId not authUserId) |
| Subscription, IntegrationToken, UserApiKey | Existing |
| VisualReport, Report, TestStage, ThresholdCalculation | Client-scoped via helper |
| OAuthRequestToken, StravaActivity, GarminActivity, Concept2Result | Client-scoped |
| TrainingWeek, TrainingDay, Workout, WorkoutSegment | Via TrainingProgram |
| Exercise, ExerciseFavorite, WorkoutLog, SetLog, Message | userId / coachId / athleteId |
| AthleteProfile, DailyCheckIn, FieldTestSchedule, DailyMetrics | Client-scoped |
| TrainingLoad, WeeklySummary, MonthlySummary, ActivityHRZoneDistribution | Client-scoped |
| YearlySummary, TrainingProgramEngine, WorkoutModification | Client/Program-scoped |
| FieldTest, SelfReportedLactate, RaceCalendar, Race | Client/Test-scoped |
| CoachDocument, KnowledgeChunk, AIConversation, AIMessage | coachId = auth.uid() |
| AIGeneratedProgram, AIGeneratedWOD, VideoAnalysis | coachId = auth.uid() |
| BodyComposition, AudioJournal, MenstrualCycle, MenstrualDailyLog | Client-scoped |
| RaceResult, SportProfile, SportPerformance | Client-scoped |
| ProgressionTracking, OneRepMaxHistory, CrossTrainingSession | Client-scoped |
| InjuryAssessment | Client-scoped OR assessedById |
| RunningGaitAnalysis, SkiingTechniqueAnalysis, HyroxStationAnalysis | Via VideoAnalysis (coachId) |

### 🔒 Deny All (Prisma-only; no Supabase API access)

These tables have RLS enabled with `deny_anon` and `authenticated USING (false)` — no direct Supabase REST access. All access must go through Prisma/API.

- Equipment, LocationEquipment, LocationService, LocationStaff
- PhysioAssignment, TreatmentSession, RehabProgram, RehabExercise, RehabMilestone, RehabProgressLog
- TrainingRestriction, MovementScreen, AcuteInjuryReport
- CareTeamThread, CareTeamMessage, CareTeamParticipant
- StrengthTrainingSession, AIModel
- HybridWorkout, HybridWorkoutVersion, HybridMovement
- HybridWorkoutResult, HybridWorkoutAssignment, HybridWorkoutLog, HybridRoundLog
- StrengthSession, StrengthSessionAssignment, StrengthTemplate
- CardioSession, CardioSessionAssignment, CardioTemplate
- AgilityDrill, AgilityWorkout, AgilityWorkoutAssignment
- TimingGateSession, TimingGateResult
- CalendarEvent, CalendarEventChange, ExternalCalendarConnection
- BusinessApplication, BusinessJoinRequest, EnterpriseContract, PricingOverride
- ProgramGenerationSession, DeepResearchSession
- AIUsageBudget, AIUsageLog, LiveHRSession, SportTest
- CoachProfile, CoachRequest, CoachAgreement, CoachEarnings
- AuditLog, SystemError, EnterpriseContractChange
- KnowledgeSkill

## Helper Function

```sql
public.client_visible_to_auth(clientId text) → boolean
```

Returns true if the authenticated user (auth.uid()) can access the client's data:
- Coach: owns Client (Client.userId = auth.uid())
- Athlete: has AthleteAccount linking their User to this Client (aa.userId = auth.uid())

## Verification

Run the verification script to test that anon cannot access sensitive tables:

```bash
node scripts/verify-supabase-rls.js
```

## Maintenance

When adding new tables to the Prisma schema:

1. Add RLS: `ALTER TABLE "NewTable" ENABLE ROW LEVEL SECURITY;`
2. Add `deny_anon_access`: `CREATE POLICY "deny_anon_access" ON "NewTable" FOR ALL TO anon USING (false);`
3. Add `authenticated_access` with correct ownership (userId, clientId, businessId, etc.)
4. Update this audit document
