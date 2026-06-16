ALTER TABLE "CoachAlert"
  ADD COLUMN "dismissedBy" TEXT,
  ADD COLUMN "resolvedBy" TEXT,
  ADD COLUMN "actionedBy" TEXT,
  ADD COLUMN "snoozedAt" TIMESTAMP(3),
  ADD COLUMN "snoozedUntil" TIMESTAMP(3),
  ADD COLUMN "snoozedBy" TEXT,
  ADD COLUMN "resolutionOutcome" TEXT,
  ADD COLUMN "followUpAt" TIMESTAMP(3);

CREATE INDEX "CoachAlert_coachId_status_snoozedUntil_idx" ON "CoachAlert"("coachId", "status", "snoozedUntil");
