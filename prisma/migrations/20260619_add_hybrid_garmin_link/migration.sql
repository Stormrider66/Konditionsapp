ALTER TABLE "HybridWorkoutLog"
  ADD COLUMN "trainingLoadId" TEXT,
  ADD COLUMN "garminActivityId" TEXT;

CREATE UNIQUE INDEX "HybridWorkoutLog_garminActivityId_key"
  ON "HybridWorkoutLog"("garminActivityId");

CREATE INDEX "HybridWorkoutLog_trainingLoadId_idx"
  ON "HybridWorkoutLog"("trainingLoadId");

ALTER TABLE "HybridWorkoutLog"
  ADD CONSTRAINT "HybridWorkoutLog_garminActivityId_fkey"
  FOREIGN KEY ("garminActivityId") REFERENCES "GarminActivity"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
