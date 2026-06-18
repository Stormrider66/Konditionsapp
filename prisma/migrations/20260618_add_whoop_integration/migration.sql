-- Add WHOOP as a first-class wearable integration.
ALTER TYPE "IntegrationType" ADD VALUE IF NOT EXISTS 'WHOOP';

CREATE TABLE IF NOT EXISTS "WhoopActivity" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "whoopWorkoutId" TEXT NOT NULL,
  "whoopV1Id" INTEGER,
  "externalUserId" TEXT,
  "name" TEXT,
  "type" TEXT NOT NULL,
  "sportId" INTEGER,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3),
  "timezoneOffset" TEXT,
  "distance" DOUBLE PRECISION,
  "duration" INTEGER,
  "elevationGain" DOUBLE PRECISION,
  "averageHeartrate" DOUBLE PRECISION,
  "maxHeartrate" DOUBLE PRECISION,
  "strain" DOUBLE PRECISION,
  "kilojoules" DOUBLE PRECISION,
  "percentRecorded" DOUBLE PRECISION,
  "scoreState" TEXT,
  "mappedType" TEXT,
  "mappedIntensity" TEXT,
  "hrZoneMilli" JSONB,
  "raw" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WhoopActivity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WhoopActivity_whoopWorkoutId_key" ON "WhoopActivity"("whoopWorkoutId");
CREATE INDEX IF NOT EXISTS "WhoopActivity_clientId_idx" ON "WhoopActivity"("clientId");
CREATE INDEX IF NOT EXISTS "WhoopActivity_startDate_idx" ON "WhoopActivity"("startDate");
CREATE INDEX IF NOT EXISTS "WhoopActivity_type_idx" ON "WhoopActivity"("type");
CREATE INDEX IF NOT EXISTS "WhoopActivity_mappedType_idx" ON "WhoopActivity"("mappedType");

ALTER TABLE "WhoopActivity"
  ADD CONSTRAINT "WhoopActivity_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
