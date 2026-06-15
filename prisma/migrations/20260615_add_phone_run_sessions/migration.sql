-- Athlete-first Android phone GPS + BLE heart-rate run capture.

CREATE TYPE "PhoneRunSource" AS ENUM (
  'ANDROID_CHROME_PWA'
);

CREATE TABLE "PhoneRunSession" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "source" "PhoneRunSource" NOT NULL DEFAULT 'ANDROID_CHROME_PWA',
  "deviceName" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3) NOT NULL,
  "durationSec" INTEGER NOT NULL,
  "movingDurationSec" INTEGER,
  "distanceMeters" DOUBLE PRECISION NOT NULL,
  "avgPaceSecPerKm" INTEGER,
  "avgSpeedMps" DOUBLE PRECISION,
  "maxSpeedMps" DOUBLE PRECISION,
  "elevationGainMeters" DOUBLE PRECISION,
  "avgHeartRate" INTEGER,
  "maxHeartRate" INTEGER,
  "routePolyline" TEXT,
  "samples" JSONB NOT NULL,
  "summary" JSONB,
  "splits" JSONB,
  "rpe" INTEGER,
  "notes" TEXT,
  "trainingLoadId" TEXT,
  "dedupeKey" TEXT,
  "externalMatch" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PhoneRunSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PhoneRunSession_dedupeKey_key" ON "PhoneRunSession"("dedupeKey");
CREATE INDEX "PhoneRunSession_clientId_idx" ON "PhoneRunSession"("clientId");
CREATE INDEX "PhoneRunSession_clientId_startedAt_idx" ON "PhoneRunSession"("clientId", "startedAt");
CREATE INDEX "PhoneRunSession_trainingLoadId_idx" ON "PhoneRunSession"("trainingLoadId");

ALTER TABLE "PhoneRunSession"
  ADD CONSTRAINT "PhoneRunSession_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
