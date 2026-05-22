ALTER TABLE "TeamEvent" ADD COLUMN "responsibleCoachId" TEXT;

CREATE INDEX "TeamEvent_responsibleCoachId_idx" ON "TeamEvent"("responsibleCoachId");

ALTER TABLE "TeamEvent"
  ADD CONSTRAINT "TeamEvent_responsibleCoachId_fkey"
  FOREIGN KEY ("responsibleCoachId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
