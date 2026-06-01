-- Actual/planned power (watts) for Cardio Focus Mode logging.
-- Lets relative "% of opener" power targets resolve against the logged
-- benchmark (opener) result. All columns nullable — additive, no backfill.

ALTER TABLE "CardioSessionLog"
  ADD COLUMN "avgPower" INTEGER,
  ADD COLUMN "maxPower" INTEGER;

ALTER TABLE "CardioSegmentLog"
  ADD COLUMN "plannedPower" INTEGER,
  ADD COLUMN "actualAvgPower" INTEGER,
  ADD COLUMN "actualMaxPower" INTEGER;
