ALTER TABLE "TeamEvent"
  ADD COLUMN "contentStatus" TEXT NOT NULL DEFAULT 'PLANNED',
  ADD COLUMN "contentOwner" TEXT,
  ADD COLUMN "linkedWorkoutType" TEXT,
  ADD COLUMN "linkedWorkoutId" TEXT,
  ADD COLUMN "linkedWorkoutName" TEXT;

CREATE INDEX "TeamEvent_teamId_contentStatus_idx" ON "TeamEvent"("teamId", "contentStatus");
