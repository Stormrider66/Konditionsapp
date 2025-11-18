-- CreateEnum
CREATE TYPE "InclineUnit" AS ENUM ('PERCENT', 'DEGREES');

-- AlterTable
ALTER TABLE "AthleteProfile" ADD COLUMN     "norwegianPhase" INTEGER;

-- AlterTable
ALTER TABLE "InjuryAssessment" ADD COLUMN     "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Test" ADD COLUMN     "inclineUnit" "InclineUnit" NOT NULL DEFAULT 'PERCENT';

-- AlterTable
ALTER TABLE "Workout" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PLANNED';

-- CreateTable
CREATE TABLE "DailyCheckIn" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "hrv" DOUBLE PRECISION,
    "restingHR" DOUBLE PRECISION,
    "sleepQuality" INTEGER NOT NULL,
    "sleepHours" DOUBLE PRECISION,
    "soreness" INTEGER NOT NULL,
    "fatigue" INTEGER NOT NULL,
    "stress" INTEGER NOT NULL,
    "mood" INTEGER NOT NULL,
    "motivation" INTEGER NOT NULL,
    "readinessScore" INTEGER,
    "readinessDecision" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldTestSchedule" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "testType" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedDate" TIMESTAMP(3),
    "fieldTestId" TEXT,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "reminderDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldTestSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyCheckIn_clientId_date_idx" ON "DailyCheckIn"("clientId", "date");

-- CreateIndex
CREATE INDEX "DailyCheckIn_readinessScore_idx" ON "DailyCheckIn"("readinessScore");

-- CreateIndex
CREATE INDEX "DailyCheckIn_readinessDecision_idx" ON "DailyCheckIn"("readinessDecision");

-- CreateIndex
CREATE UNIQUE INDEX "DailyCheckIn_clientId_date_key" ON "DailyCheckIn"("clientId", "date");

-- CreateIndex
CREATE INDEX "FieldTestSchedule_clientId_scheduledDate_idx" ON "FieldTestSchedule"("clientId", "scheduledDate");

-- CreateIndex
CREATE INDEX "FieldTestSchedule_completed_scheduledDate_idx" ON "FieldTestSchedule"("completed", "scheduledDate");

-- CreateIndex
CREATE INDEX "FieldTestSchedule_clientId_completed_idx" ON "FieldTestSchedule"("clientId", "completed");

-- CreateIndex
CREATE INDEX "AthleteProfile_hasLactateMeter_hasHRVMonitor_idx" ON "AthleteProfile"("hasLactateMeter", "hasHRVMonitor");

-- CreateIndex
CREATE INDEX "AthleteProfile_vo2maxPercentile_idx" ON "AthleteProfile"("vo2maxPercentile");

-- CreateIndex
CREATE INDEX "AthleteProfile_norwegianPhase_idx" ON "AthleteProfile"("norwegianPhase");

-- CreateIndex
CREATE INDEX "CrossTrainingSession_clientId_modality_idx" ON "CrossTrainingSession"("clientId", "modality");

-- CreateIndex
CREATE INDEX "CrossTrainingSession_reason_injuryType_idx" ON "CrossTrainingSession"("reason", "injuryType");

-- CreateIndex
CREATE INDEX "DailyMetrics_clientId_readinessScore_idx" ON "DailyMetrics"("clientId", "readinessScore");

-- CreateIndex
CREATE INDEX "DailyMetrics_clientId_readinessLevel_idx" ON "DailyMetrics"("clientId", "readinessLevel");

-- CreateIndex
CREATE INDEX "DailyMetrics_date_readinessLevel_idx" ON "DailyMetrics"("date", "readinessLevel");

-- CreateIndex
CREATE INDEX "FieldTest_clientId_testType_date_idx" ON "FieldTest"("clientId", "testType", "date");

-- CreateIndex
CREATE INDEX "FieldTest_confidence_valid_idx" ON "FieldTest"("confidence", "valid");

-- CreateIndex
CREATE INDEX "InjuryAssessment_clientId_resolved_idx" ON "InjuryAssessment"("clientId", "resolved");

-- CreateIndex
CREATE INDEX "InjuryAssessment_injuryType_phase_idx" ON "InjuryAssessment"("injuryType", "phase");

-- CreateIndex
CREATE INDEX "InjuryAssessment_clientId_injuryType_resolved_idx" ON "InjuryAssessment"("clientId", "injuryType", "resolved");

-- CreateIndex
CREATE INDEX "SelfReportedLactate_validated_clientId_idx" ON "SelfReportedLactate"("validated", "clientId");

-- CreateIndex
CREATE INDEX "SelfReportedLactate_validatedBy_validatedAt_idx" ON "SelfReportedLactate"("validatedBy", "validatedAt");

-- CreateIndex
CREATE INDEX "StrengthTrainingSession_clientId_phase_idx" ON "StrengthTrainingSession"("clientId", "phase");

-- CreateIndex
CREATE INDEX "StrengthTrainingSession_runningPhase_priorityLevel_idx" ON "StrengthTrainingSession"("runningPhase", "priorityLevel");

-- CreateIndex
CREATE INDEX "ThresholdCalculation_method_confidence_idx" ON "ThresholdCalculation"("method", "confidence");

-- CreateIndex
CREATE INDEX "ThresholdCalculation_testDate_idx" ON "ThresholdCalculation"("testDate");

-- CreateIndex
CREATE INDEX "TrainingLoad_clientId_acwrZone_idx" ON "TrainingLoad"("clientId", "acwrZone");

-- CreateIndex
CREATE INDEX "TrainingLoad_clientId_injuryRisk_idx" ON "TrainingLoad"("clientId", "injuryRisk");

-- CreateIndex
CREATE INDEX "TrainingProgramEngine_methodology_status_idx" ON "TrainingProgramEngine"("methodology", "status");

-- CreateIndex
CREATE INDEX "TrainingProgramEngine_currentPhase_idx" ON "TrainingProgramEngine"("currentPhase");

-- CreateIndex
CREATE INDEX "Workout_status_idx" ON "Workout"("status");

-- CreateIndex
CREATE INDEX "WorkoutModification_workoutId_date_idx" ON "WorkoutModification"("workoutId", "date");

-- CreateIndex
CREATE INDEX "WorkoutModification_autoGenerated_decision_idx" ON "WorkoutModification"("autoGenerated", "decision");
