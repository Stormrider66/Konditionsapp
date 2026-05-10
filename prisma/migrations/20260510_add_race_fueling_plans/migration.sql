-- Create race fueling plan tables for Tävlingsenergi.

CREATE TABLE "RaceFuelingPlan" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdById" TEXT,
    "testId" TEXT,
    "raceId" TEXT,
    "programId" TEXT,
    "sport" "SportType" NOT NULL,
    "name" TEXT,
    "distanceKm" DOUBLE PRECISION,
    "durationMinutes" DOUBLE PRECISION,
    "targetSpeedKmh" DOUBLE PRECISION,
    "targetPowerWatts" DOUBLE PRECISION,
    "targetPaceMinKm" DOUBLE PRECISION,
    "raceDate" TIMESTAMP(3),
    "estimatedCarbDemandGPerHour" DOUBLE PRECISION,
    "estimatedCarbDemandTotalG" DOUBLE PRECISION,
    "recommendedCarbsGPerHour" DOUBLE PRECISION,
    "recommendedCarbsTotalG" DOUBLE PRECISION,
    "confidence" TEXT NOT NULL DEFAULT 'LOW',
    "scenarios" JSONB,
    "assumptions" JSONB,
    "warnings" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "coachNotes" TEXT,
    "athleteNotes" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RaceFuelingPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkoutFuelingPrescription" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "planId" TEXT,
    "targetCarbsGPerHour" DOUBLE PRECISION NOT NULL,
    "targetCarbsTotalG" DOUBLE PRECISION,
    "hydrationMl" INTEGER,
    "sodiumMg" INTEGER,
    "productPlan" JSONB,
    "instructionsSv" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutFuelingPrescription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkoutFuelingLog" (
    "id" TEXT NOT NULL,
    "workoutLogId" TEXT NOT NULL,
    "actualCarbsGPerHour" DOUBLE PRECISION,
    "actualCarbsTotalG" DOUBLE PRECISION,
    "hydrationMl" INTEGER,
    "sodiumMg" INTEGER,
    "productsUsed" JSONB,
    "stomachRating" INTEGER,
    "energyRating" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutFuelingLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RaceFuelingPlan_clientId_raceDate_idx" ON "RaceFuelingPlan"("clientId", "raceDate");
CREATE INDEX "RaceFuelingPlan_clientId_status_idx" ON "RaceFuelingPlan"("clientId", "status");
CREATE INDEX "RaceFuelingPlan_testId_idx" ON "RaceFuelingPlan"("testId");
CREATE INDEX "RaceFuelingPlan_raceId_idx" ON "RaceFuelingPlan"("raceId");
CREATE INDEX "RaceFuelingPlan_programId_idx" ON "RaceFuelingPlan"("programId");
CREATE UNIQUE INDEX "WorkoutFuelingPrescription_workoutId_key" ON "WorkoutFuelingPrescription"("workoutId");
CREATE INDEX "WorkoutFuelingPrescription_planId_idx" ON "WorkoutFuelingPrescription"("planId");
CREATE UNIQUE INDEX "WorkoutFuelingLog_workoutLogId_key" ON "WorkoutFuelingLog"("workoutLogId");

ALTER TABLE "RaceFuelingPlan" ADD CONSTRAINT "RaceFuelingPlan_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RaceFuelingPlan" ADD CONSTRAINT "RaceFuelingPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RaceFuelingPlan" ADD CONSTRAINT "RaceFuelingPlan_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RaceFuelingPlan" ADD CONSTRAINT "RaceFuelingPlan_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RaceFuelingPlan" ADD CONSTRAINT "RaceFuelingPlan_programId_fkey" FOREIGN KEY ("programId") REFERENCES "TrainingProgram"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkoutFuelingPrescription" ADD CONSTRAINT "WorkoutFuelingPrescription_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkoutFuelingPrescription" ADD CONSTRAINT "WorkoutFuelingPrescription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "RaceFuelingPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkoutFuelingLog" ADD CONSTRAINT "WorkoutFuelingLog_workoutLogId_fkey" FOREIGN KEY ("workoutLogId") REFERENCES "WorkoutLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
