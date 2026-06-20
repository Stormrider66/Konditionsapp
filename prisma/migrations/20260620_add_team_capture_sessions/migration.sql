-- Team hybrid capture sessions with fixed lane/station receivers.

CREATE TYPE "TeamCaptureSessionStatus" AS ENUM (
  'DRAFT',
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'CANCELLED'
);

CREATE TYPE "TeamCaptureMachineType" AS ENUM (
  'BIKEERG',
  'ROWER',
  'RUN',
  'REST'
);

CREATE TYPE "TeamCaptureSegmentStatus" AS ENUM (
  'PLANNED',
  'RESOLVED',
  'MANUAL_OVERRIDE',
  'NO_DATA'
);

CREATE TABLE "TeamCaptureSession" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "coachId" TEXT NOT NULL,
  "teamEventId" TEXT,
  "broadcastId" TEXT,
  "name" TEXT NOT NULL,
  "status" "TeamCaptureSessionStatus" NOT NULL DEFAULT 'DRAFT',
  "workoutType" TEXT,
  "workoutId" TEXT,
  "workoutName" TEXT,
  "laneCount" INTEGER NOT NULL DEFAULT 6,
  "roundCount" INTEGER NOT NULL DEFAULT 10,
  "bikeCalories" INTEGER NOT NULL DEFAULT 20,
  "rowCalories" INTEGER NOT NULL DEFAULT 20,
  "runDistanceMeters" INTEGER NOT NULL DEFAULT 200,
  "restBetweenRoundsSeconds" INTEGER NOT NULL DEFAULT 60,
  "estimatedBikeSeconds" INTEGER NOT NULL DEFAULT 75,
  "estimatedRowSeconds" INTEGER NOT NULL DEFAULT 75,
  "estimatedRunSeconds" INTEGER NOT NULL DEFAULT 45,
  "structure" JSONB NOT NULL,
  "lanePlan" JSONB NOT NULL,
  "masterStartedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TeamCaptureSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeamCaptureParticipant" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "laneNumber" INTEGER NOT NULL,
  "heatNumber" INTEGER NOT NULL DEFAULT 1,
  "startOrder" INTEGER NOT NULL,
  "displayName" TEXT NOT NULL,
  "jerseyNumber" INTEGER,
  "position" TEXT,
  "expectedStartOffsetSec" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'PLANNED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TeamCaptureParticipant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeamCaptureStation" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "laneNumber" INTEGER NOT NULL,
  "machineType" "TeamCaptureMachineType" NOT NULL,
  "label" TEXT NOT NULL,
  "receiverName" TEXT,
  "deviceName" TEXT,
  "deviceId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OFFLINE',
  "lastSeenAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TeamCaptureStation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeamCaptureReading" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "stationId" TEXT NOT NULL,
  "laneNumber" INTEGER NOT NULL,
  "machineType" "TeamCaptureMachineType" NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL,
  "offsetSec" INTEGER,
  "source" TEXT NOT NULL DEFAULT 'NATIVE_STATION',
  "deviceId" TEXT,
  "power" INTEGER,
  "cadence" INTEGER,
  "strokeRate" INTEGER,
  "paceSecPer500m" INTEGER,
  "distanceMeters" DOUBLE PRECISION,
  "calories" DOUBLE PRECISION,
  "heartRate" INTEGER,
  "raw" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeamCaptureReading_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeamCaptureSegment" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "participantId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "stationId" TEXT,
  "laneNumber" INTEGER NOT NULL,
  "heatNumber" INTEGER NOT NULL,
  "roundNumber" INTEGER NOT NULL,
  "segmentIndex" INTEGER NOT NULL,
  "machineType" "TeamCaptureMachineType" NOT NULL,
  "label" TEXT NOT NULL,
  "plannedStartSec" INTEGER NOT NULL,
  "plannedEndSec" INTEGER NOT NULL,
  "targetCalories" INTEGER,
  "targetDistanceMeters" INTEGER,
  "actualStartAt" TIMESTAMP(3),
  "actualEndAt" TIMESTAMP(3),
  "status" "TeamCaptureSegmentStatus" NOT NULL DEFAULT 'PLANNED',
  "summary" JSONB,
  "overrideById" TEXT,
  "overrideReason" TEXT,
  "workoutSensorCaptureId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TeamCaptureSegment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TeamCaptureSession_teamId_createdAt_idx" ON "TeamCaptureSession"("teamId", "createdAt");
CREATE INDEX "TeamCaptureSession_coachId_idx" ON "TeamCaptureSession"("coachId");
CREATE INDEX "TeamCaptureSession_teamEventId_idx" ON "TeamCaptureSession"("teamEventId");
CREATE INDEX "TeamCaptureSession_broadcastId_idx" ON "TeamCaptureSession"("broadcastId");
CREATE INDEX "TeamCaptureSession_status_idx" ON "TeamCaptureSession"("status");

CREATE UNIQUE INDEX "TeamCaptureParticipant_sessionId_clientId_key" ON "TeamCaptureParticipant"("sessionId", "clientId");
CREATE INDEX "TeamCaptureParticipant_sessionId_laneNumber_idx" ON "TeamCaptureParticipant"("sessionId", "laneNumber");
CREATE INDEX "TeamCaptureParticipant_clientId_idx" ON "TeamCaptureParticipant"("clientId");

CREATE UNIQUE INDEX "TeamCaptureStation_sessionId_laneNumber_machineType_key" ON "TeamCaptureStation"("sessionId", "laneNumber", "machineType");
CREATE INDEX "TeamCaptureStation_sessionId_idx" ON "TeamCaptureStation"("sessionId");
CREATE INDEX "TeamCaptureStation_deviceId_idx" ON "TeamCaptureStation"("deviceId");

CREATE INDEX "TeamCaptureReading_sessionId_timestamp_idx" ON "TeamCaptureReading"("sessionId", "timestamp");
CREATE INDEX "TeamCaptureReading_stationId_timestamp_idx" ON "TeamCaptureReading"("stationId", "timestamp");
CREATE INDEX "TeamCaptureReading_sessionId_laneNumber_machineType_timestamp_idx" ON "TeamCaptureReading"("sessionId", "laneNumber", "machineType", "timestamp");

CREATE INDEX "TeamCaptureSegment_sessionId_clientId_idx" ON "TeamCaptureSegment"("sessionId", "clientId");
CREATE INDEX "TeamCaptureSegment_participantId_idx" ON "TeamCaptureSegment"("participantId");
CREATE INDEX "TeamCaptureSegment_stationId_idx" ON "TeamCaptureSegment"("stationId");
CREATE INDEX "TeamCaptureSegment_clientId_idx" ON "TeamCaptureSegment"("clientId");
CREATE INDEX "TeamCaptureSegment_sessionId_laneNumber_roundNumber_idx" ON "TeamCaptureSegment"("sessionId", "laneNumber", "roundNumber");

ALTER TABLE "TeamCaptureSession"
  ADD CONSTRAINT "TeamCaptureSession_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeamCaptureSession"
  ADD CONSTRAINT "TeamCaptureSession_coachId_fkey"
  FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TeamCaptureSession"
  ADD CONSTRAINT "TeamCaptureSession_teamEventId_fkey"
  FOREIGN KEY ("teamEventId") REFERENCES "TeamEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TeamCaptureSession"
  ADD CONSTRAINT "TeamCaptureSession_broadcastId_fkey"
  FOREIGN KEY ("broadcastId") REFERENCES "TeamWorkoutBroadcast"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TeamCaptureParticipant"
  ADD CONSTRAINT "TeamCaptureParticipant_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "TeamCaptureSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeamCaptureParticipant"
  ADD CONSTRAINT "TeamCaptureParticipant_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeamCaptureStation"
  ADD CONSTRAINT "TeamCaptureStation_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "TeamCaptureSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeamCaptureReading"
  ADD CONSTRAINT "TeamCaptureReading_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "TeamCaptureSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeamCaptureReading"
  ADD CONSTRAINT "TeamCaptureReading_stationId_fkey"
  FOREIGN KEY ("stationId") REFERENCES "TeamCaptureStation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeamCaptureSegment"
  ADD CONSTRAINT "TeamCaptureSegment_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "TeamCaptureSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeamCaptureSegment"
  ADD CONSTRAINT "TeamCaptureSegment_participantId_fkey"
  FOREIGN KEY ("participantId") REFERENCES "TeamCaptureParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeamCaptureSegment"
  ADD CONSTRAINT "TeamCaptureSegment_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeamCaptureSegment"
  ADD CONSTRAINT "TeamCaptureSegment_stationId_fkey"
  FOREIGN KEY ("stationId") REFERENCES "TeamCaptureStation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TeamCaptureSegment"
  ADD CONSTRAINT "TeamCaptureSegment_overrideById_fkey"
  FOREIGN KEY ("overrideById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
