ALTER TABLE "TeamEvent"
  ADD COLUMN "assignedBroadcastId" TEXT,
  ADD COLUMN "assignedAt" TIMESTAMP(3);

CREATE INDEX "TeamEvent_assignedBroadcastId_idx" ON "TeamEvent"("assignedBroadcastId");
