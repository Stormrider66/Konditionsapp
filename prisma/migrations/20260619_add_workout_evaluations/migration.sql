-- Unified workout evaluations and future native sensor captures.
CREATE TABLE "WorkoutEvaluation" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "dedupeKey" TEXT NOT NULL,
  "sourceLinks" JSONB NOT NULL,
  "summary" JSONB NOT NULL,
  "timelinePreview" JSONB NOT NULL,
  "segmentEvaluations" JSONB NOT NULL,
  "zoneSummary" JSONB NOT NULL,
  "fatigueSummary" JSONB NOT NULL,
  "readinessContext" JSONB,
  "confidence" TEXT NOT NULL,
  "primarySource" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkoutEvaluation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkoutEvaluation_dedupeKey_key"
  ON "WorkoutEvaluation"("dedupeKey");
CREATE INDEX "WorkoutEvaluation_clientId_startedAt_idx"
  ON "WorkoutEvaluation"("clientId", "startedAt");
CREATE INDEX "WorkoutEvaluation_clientId_confidence_idx"
  ON "WorkoutEvaluation"("clientId", "confidence");
CREATE INDEX "WorkoutEvaluation_primarySource_idx"
  ON "WorkoutEvaluation"("primarySource");

ALTER TABLE "WorkoutEvaluation"
  ADD CONSTRAINT "WorkoutEvaluation_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WorkoutSensorCapture" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3) NOT NULL,
  "devices" JSONB NOT NULL,
  "samples" JSONB NOT NULL,
  "summary" JSONB,
  "plannedWorkoutId" TEXT,
  "calendarEventId" TEXT,
  "rpe" INTEGER,
  "notes" TEXT,
  "workoutEvaluationId" TEXT,
  "dedupeKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkoutSensorCapture_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkoutSensorCapture_dedupeKey_key"
  ON "WorkoutSensorCapture"("dedupeKey");
CREATE INDEX "WorkoutSensorCapture_clientId_startedAt_idx"
  ON "WorkoutSensorCapture"("clientId", "startedAt");
CREATE INDEX "WorkoutSensorCapture_source_idx"
  ON "WorkoutSensorCapture"("source");
CREATE INDEX "WorkoutSensorCapture_workoutEvaluationId_idx"
  ON "WorkoutSensorCapture"("workoutEvaluationId");

ALTER TABLE "WorkoutSensorCapture"
  ADD CONSTRAINT "WorkoutSensorCapture_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
