-- CreateEnum
CREATE TYPE "ProgressionStatus" AS ENUM ('ON_TRACK', 'PLATEAU', 'REGRESSING', 'DELOAD_NEEDED');

-- CreateEnum
CREATE TYPE "StrengthPhase" AS ENUM ('ANATOMICAL_ADAPTATION', 'MAXIMUM_STRENGTH', 'POWER', 'MAINTENANCE', 'TAPER');

-- CreateTable
CREATE TABLE "ProgressionTracking" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "sets" INTEGER NOT NULL,
    "repsCompleted" INTEGER NOT NULL,
    "repsTarget" INTEGER NOT NULL,
    "actualLoad" DOUBLE PRECISION NOT NULL,
    "rpe" INTEGER,
    "estimated1RM" DOUBLE PRECISION NOT NULL,
    "estimationMethod" TEXT NOT NULL,
    "progressionStatus" "ProgressionStatus" NOT NULL DEFAULT 'ON_TRACK',
    "weeksAtCurrentLoad" INTEGER NOT NULL DEFAULT 0,
    "lastIncrease" TIMESTAMP(3),
    "nextRecommendedLoad" DOUBLE PRECISION,
    "strengthPhase" "StrengthPhase",
    "consecutiveSessionsWithExtraReps" INTEGER NOT NULL DEFAULT 0,
    "readyForIncrease" BOOLEAN NOT NULL DEFAULT false,
    "plateauWeeks" INTEGER NOT NULL DEFAULT 0,
    "deloadRecommended" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "manualOverride" BOOLEAN NOT NULL DEFAULT false,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgressionTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OneRepMaxHistory" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "oneRepMax" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "bodyWeight" DOUBLE PRECISION,
    "strengthPhase" "StrengthPhase",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OneRepMaxHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProgressionTracking_clientId_exerciseId_date_idx" ON "ProgressionTracking"("clientId", "exerciseId", "date");

-- CreateIndex
CREATE INDEX "ProgressionTracking_clientId_progressionStatus_idx" ON "ProgressionTracking"("clientId", "progressionStatus");

-- CreateIndex
CREATE INDEX "ProgressionTracking_exerciseId_date_idx" ON "ProgressionTracking"("exerciseId", "date");

-- CreateIndex
CREATE INDEX "ProgressionTracking_readyForIncrease_idx" ON "ProgressionTracking"("readyForIncrease");

-- CreateIndex
CREATE INDEX "ProgressionTracking_plateauWeeks_idx" ON "ProgressionTracking"("plateauWeeks");

-- CreateIndex
CREATE INDEX "ProgressionTracking_clientId_strengthPhase_idx" ON "ProgressionTracking"("clientId", "strengthPhase");

-- CreateIndex
CREATE INDEX "OneRepMaxHistory_clientId_exerciseId_date_idx" ON "OneRepMaxHistory"("clientId", "exerciseId", "date");

-- CreateIndex
CREATE INDEX "OneRepMaxHistory_clientId_date_idx" ON "OneRepMaxHistory"("clientId", "date");

-- AddForeignKey
ALTER TABLE "ProgressionTracking" ADD CONSTRAINT "ProgressionTracking_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressionTracking" ADD CONSTRAINT "ProgressionTracking_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OneRepMaxHistory" ADD CONSTRAINT "OneRepMaxHistory_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OneRepMaxHistory" ADD CONSTRAINT "OneRepMaxHistory_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
