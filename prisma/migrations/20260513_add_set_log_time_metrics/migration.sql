-- Persist manually logged per-set timing metrics from strength workouts.
-- These sit next to the existing manual VBT speed/power fields on SetLog.

ALTER TABLE "SetLog"
  ADD COLUMN IF NOT EXISTS "meanTime" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "peakTime" DOUBLE PRECISION;
