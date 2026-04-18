-- Add mean/peak time metrics to SetLog for per-rep timing data from
-- velocity-based training devices (e.g. GymAware, PUSH band, Vitruve).

ALTER TABLE "SetLog"
  ADD COLUMN IF NOT EXISTS "meanTime" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "peakTime" DOUBLE PRECISION;
