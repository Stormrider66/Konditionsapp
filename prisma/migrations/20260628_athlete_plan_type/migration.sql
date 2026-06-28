-- Add a category to individual athlete plans so the team Plan page can separate
-- special/performance programs from injury-recovery / return-to-play plans.
CREATE TYPE "AthletePlanType" AS ENUM ('SPECIAL_PROGRAM', 'INJURY_RECOVERY', 'RETURN_TO_PLAY', 'PERFORMANCE');

ALTER TABLE "AthletePlan"
  ADD COLUMN "planType" "AthletePlanType" NOT NULL DEFAULT 'SPECIAL_PROGRAM';
