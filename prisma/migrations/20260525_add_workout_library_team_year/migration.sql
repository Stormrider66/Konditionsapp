-- Add optional team/year metadata to all coach workout libraries.
ALTER TABLE "CardioSession" ADD COLUMN "teamId" TEXT;
ALTER TABLE "CardioSession" ADD COLUMN "trainingYear" INTEGER;

ALTER TABLE "StrengthSession" ADD COLUMN "teamId" TEXT;
ALTER TABLE "StrengthSession" ADD COLUMN "trainingYear" INTEGER;

ALTER TABLE "AgilityWorkout" ADD COLUMN "teamId" TEXT;
ALTER TABLE "AgilityWorkout" ADD COLUMN "trainingYear" INTEGER;

ALTER TABLE "HybridWorkout" ADD COLUMN "teamId" TEXT;
ALTER TABLE "HybridWorkout" ADD COLUMN "trainingYear" INTEGER;

CREATE INDEX "CardioSession_teamId_idx" ON "CardioSession"("teamId");
CREATE INDEX "CardioSession_trainingYear_idx" ON "CardioSession"("trainingYear");
CREATE INDEX "CardioSession_teamId_trainingYear_idx" ON "CardioSession"("teamId", "trainingYear");

CREATE INDEX "StrengthSession_teamId_idx" ON "StrengthSession"("teamId");
CREATE INDEX "StrengthSession_trainingYear_idx" ON "StrengthSession"("trainingYear");
CREATE INDEX "StrengthSession_teamId_trainingYear_idx" ON "StrengthSession"("teamId", "trainingYear");

CREATE INDEX "AgilityWorkout_teamId_idx" ON "AgilityWorkout"("teamId");
CREATE INDEX "AgilityWorkout_trainingYear_idx" ON "AgilityWorkout"("trainingYear");
CREATE INDEX "AgilityWorkout_teamId_trainingYear_idx" ON "AgilityWorkout"("teamId", "trainingYear");

CREATE INDEX "HybridWorkout_teamId_idx" ON "HybridWorkout"("teamId");
CREATE INDEX "HybridWorkout_trainingYear_idx" ON "HybridWorkout"("trainingYear");
CREATE INDEX "HybridWorkout_teamId_trainingYear_idx" ON "HybridWorkout"("teamId", "trainingYear");

ALTER TABLE "CardioSession"
  ADD CONSTRAINT "CardioSession_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StrengthSession"
  ADD CONSTRAINT "StrengthSession_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AgilityWorkout"
  ADD CONSTRAINT "AgilityWorkout_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "HybridWorkout"
  ADD CONSTRAINT "HybridWorkout_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
