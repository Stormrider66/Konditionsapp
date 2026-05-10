-- Add RLS coverage for race fueling tables.

ALTER TABLE "RaceFuelingPlan" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "RaceFuelingPlan";
DROP POLICY IF EXISTS "authenticated_access" ON "RaceFuelingPlan";
CREATE POLICY "deny_anon_access" ON "RaceFuelingPlan"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "RaceFuelingPlan"
  FOR ALL TO authenticated
  USING (public.client_visible_to_auth("clientId"));

ALTER TABLE "WorkoutFuelingPrescription" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "WorkoutFuelingPrescription";
DROP POLICY IF EXISTS "authenticated_access" ON "WorkoutFuelingPrescription";
CREATE POLICY "deny_anon_access" ON "WorkoutFuelingPrescription"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "WorkoutFuelingPrescription"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM "Workout" w
        JOIN "TrainingDay" td ON td.id = w."dayId"
        JOIN "TrainingWeek" tw ON tw.id = td."weekId"
        JOIN "TrainingProgram" tp ON tp.id = tw."programId"
       WHERE w.id = "WorkoutFuelingPrescription"."workoutId"
         AND (
           tp."coachId" = auth.uid()::text
           OR public.client_visible_to_auth(tp."clientId")
         )
    )
  );

ALTER TABLE "WorkoutFuelingLog" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_anon_access" ON "WorkoutFuelingLog";
DROP POLICY IF EXISTS "authenticated_access" ON "WorkoutFuelingLog";
CREATE POLICY "deny_anon_access" ON "WorkoutFuelingLog"
  FOR ALL TO anon USING (false);
CREATE POLICY "authenticated_access" ON "WorkoutFuelingLog"
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM "WorkoutLog" wl
       WHERE wl.id = "WorkoutFuelingLog"."workoutLogId"
         AND wl."athleteId" = auth.uid()::text
    )
  );
