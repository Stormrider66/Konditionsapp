-- Athlete-first free Bluetooth erg session capture.

CREATE TYPE "QuickErgMachineType" AS ENUM (
  'CONCEPT2_ROW',
  'CONCEPT2_SKIERG',
  'CONCEPT2_BIKEERG',
  'WATTBIKE',
  'ASSAULT_BIKE',
  'FTMS_BIKE',
  'FTMS_AIRBIKE',
  'UNKNOWN'
);

CREATE TYPE "QuickErgSource" AS ENUM (
  'BLUETOOTH_FTMS',
  'BLUETOOTH_PM5',
  'BLUETOOTH_CPS',
  'MANUAL_IMPORT'
);

CREATE TABLE "QuickErgSession" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "machineType" "QuickErgMachineType" NOT NULL,
  "machineKind" TEXT,
  "source" "QuickErgSource" NOT NULL DEFAULT 'BLUETOOTH_FTMS',
  "deviceName" TEXT,
  "deviceId" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3) NOT NULL,
  "durationSec" INTEGER NOT NULL,
  "distanceMeters" DOUBLE PRECISION,
  "calories" INTEGER,
  "avgPower" INTEGER,
  "maxPower" INTEGER,
  "normalizedPower" INTEGER,
  "avgHeartRate" INTEGER,
  "maxHeartRate" INTEGER,
  "avgCadence" DOUBLE PRECISION,
  "maxCadence" DOUBLE PRECISION,
  "avgStrokeRate" DOUBLE PRECISION,
  "maxStrokeRate" DOUBLE PRECISION,
  "avgPace500m" INTEGER,
  "rpe" INTEGER,
  "notes" TEXT,
  "samples" JSONB NOT NULL,
  "summary" JSONB,
  "bestEfforts" JSONB,
  "detectedIntervals" JSONB,
  "trainingLoadId" TEXT,
  "dedupeKey" TEXT,
  "externalMatch" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "QuickErgSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QuickErgSession_dedupeKey_key" ON "QuickErgSession"("dedupeKey");
CREATE INDEX "QuickErgSession_clientId_idx" ON "QuickErgSession"("clientId");
CREATE INDEX "QuickErgSession_clientId_startedAt_idx" ON "QuickErgSession"("clientId", "startedAt");
CREATE INDEX "QuickErgSession_machineType_idx" ON "QuickErgSession"("machineType");
CREATE INDEX "QuickErgSession_trainingLoadId_idx" ON "QuickErgSession"("trainingLoadId");

ALTER TABLE "QuickErgSession"
  ADD CONSTRAINT "QuickErgSession_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
