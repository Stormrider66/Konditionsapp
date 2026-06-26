-- Garmin push for AI-generated WODs (Garmin Training API v2).
-- When a WOD is sent to the athlete's watch we store the Garmin workout id and
-- the push timestamp, so a re-push can replace the previous workout instead of
-- creating a duplicate. Both columns nullable — existing rows are unaffected.

ALTER TABLE "AIGeneratedWOD"
  ADD COLUMN "garminWorkoutId" TEXT,
  ADD COLUMN "garminPushedAt" TIMESTAMP(3);
