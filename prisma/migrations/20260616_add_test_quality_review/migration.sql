ALTER TABLE "Test"
  ADD COLUMN "qualityReviewStatus" TEXT NOT NULL DEFAULT 'CLEAR',
  ADD COLUMN "qualityWarnings" JSONB,
  ADD COLUMN "qualityReviewedBy" TEXT,
  ADD COLUMN "qualityReviewedAt" TIMESTAMP(3),
  ADD COLUMN "qualityReviewNote" TEXT;

CREATE INDEX "Test_qualityReviewStatus_clientId_idx" ON "Test"("qualityReviewStatus", "clientId");
