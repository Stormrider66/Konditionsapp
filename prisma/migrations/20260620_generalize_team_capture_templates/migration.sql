-- Generalize team capture sessions from one fixed hybrid template to
-- builder-driven station templates with flexible equipment keys.

ALTER TYPE "TeamCaptureMachineType" ADD VALUE IF NOT EXISTS 'SKIERG';
ALTER TYPE "TeamCaptureMachineType" ADD VALUE IF NOT EXISTS 'WATTBIKE';
ALTER TYPE "TeamCaptureMachineType" ADD VALUE IF NOT EXISTS 'ASSAULT_BIKE';
ALTER TYPE "TeamCaptureMachineType" ADD VALUE IF NOT EXISTS 'ECHO_BIKE';
ALTER TYPE "TeamCaptureMachineType" ADD VALUE IF NOT EXISTS 'AIR_BIKE';

ALTER TABLE "TeamCaptureSession"
  ADD COLUMN "templateSource" TEXT,
  ADD COLUMN "templateSummary" JSONB;

ALTER TABLE "TeamCaptureStation"
  ADD COLUMN "stationIndex" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "equipmentKey" TEXT,
  ADD COLUMN "captureMethod" TEXT NOT NULL DEFAULT 'BLUETOOTH_STATION',
  ADD COLUMN "targetMetric" TEXT;

ALTER TABLE "TeamCaptureReading"
  ADD COLUMN "equipmentKey" TEXT;

ALTER TABLE "TeamCaptureSegment"
  ADD COLUMN "stationIndex" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "equipmentKey" TEXT,
  ADD COLUMN "captureMethod" TEXT NOT NULL DEFAULT 'BLUETOOTH_STATION',
  ADD COLUMN "targetDurationSec" INTEGER,
  ADD COLUMN "targetPower" INTEGER;

UPDATE "TeamCaptureStation"
SET "equipmentKey" = CASE
  WHEN "machineType" = 'BIKEERG' THEN 'BIKE_ERG'
  WHEN "machineType" = 'ROWER' THEN 'ROW'
  WHEN "machineType" = 'RUN' THEN 'RUN'
  WHEN "machineType" = 'REST' THEN 'REST'
  ELSE "machineType"::TEXT
END;

UPDATE "TeamCaptureReading"
SET "equipmentKey" = CASE
  WHEN "machineType" = 'BIKEERG' THEN 'BIKE_ERG'
  WHEN "machineType" = 'ROWER' THEN 'ROW'
  WHEN "machineType" = 'RUN' THEN 'RUN'
  WHEN "machineType" = 'REST' THEN 'REST'
  ELSE "machineType"::TEXT
END;

UPDATE "TeamCaptureSegment"
SET
  "equipmentKey" = CASE
    WHEN "machineType" = 'BIKEERG' THEN 'BIKE_ERG'
    WHEN "machineType" = 'ROWER' THEN 'ROW'
    WHEN "machineType" = 'RUN' THEN 'RUN'
    WHEN "machineType" = 'REST' THEN 'REST'
    ELSE "machineType"::TEXT
  END,
  "captureMethod" = CASE
    WHEN "machineType" = 'RUN' THEN 'GARMIN_LAP_OR_MANUAL'
    WHEN "machineType" = 'REST' THEN 'REST'
    ELSE 'BLUETOOTH_STATION'
  END,
  "targetDurationSec" = GREATEST(0, "plannedEndSec" - "plannedStartSec");

DROP INDEX IF EXISTS "TeamCaptureStation_sessionId_laneNumber_machineType_key";
CREATE UNIQUE INDEX "TeamCaptureStation_sessionId_laneNumber_stationIndex_key"
  ON "TeamCaptureStation"("sessionId", "laneNumber", "stationIndex");
CREATE INDEX "TeamCaptureStation_sessionId_laneNumber_machineType_idx"
  ON "TeamCaptureStation"("sessionId", "laneNumber", "machineType");
CREATE INDEX "TeamCaptureStation_equipmentKey_idx"
  ON "TeamCaptureStation"("equipmentKey");
CREATE INDEX "TeamCaptureSegment_equipmentKey_idx"
  ON "TeamCaptureSegment"("equipmentKey");
