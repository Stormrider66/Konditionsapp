-- Self-learning Dagens pass support.

ALTER TABLE "AIGeneratedWOD"
  ADD COLUMN "athleteFeedback" JSONB,
  ADD COLUMN "preferenceSnapshot" JSONB,
  ADD COLUMN "candidateScores" JSONB,
  ADD COLUMN "promptVariantId" TEXT;

CREATE TABLE "WODPreferenceProfile" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "preferredDuration" INTEGER,
  "intensityTolerance" DOUBLE PRECISION,
  "preferredFormats" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "exerciseLikes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "exerciseDislikes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "modeAffinity" JSONB,
  "workoutTypeAffinity" JSONB,
  "equipmentAffinity" JSONB,
  "structurePreference" JSONB,
  "noveltyPreference" DOUBLE PRECISION,
  "painAvoidanceSignals" JSONB,
  "promptSummary" TEXT,
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "sampleSize" INTEGER NOT NULL DEFAULT 0,
  "feedbackCount" INTEGER NOT NULL DEFAULT 0,
  "lastUpdatedFromWODId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WODPreferenceProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WODGlobalLearningAggregate" (
  "id" TEXT NOT NULL,
  "cohortKey" TEXT NOT NULL,
  "sport" TEXT NOT NULL,
  "experienceLevel" TEXT,
  "workoutType" TEXT,
  "sampleSize" INTEGER NOT NULL DEFAULT 0,
  "minCohortSize" INTEGER NOT NULL DEFAULT 10,
  "lessons" JSONB,
  "promptSummary" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WODGlobalLearningAggregate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WODPreferenceProfile_clientId_key" ON "WODPreferenceProfile"("clientId");
CREATE INDEX "WODPreferenceProfile_clientId_idx" ON "WODPreferenceProfile"("clientId");
CREATE INDEX "WODPreferenceProfile_updatedAt_idx" ON "WODPreferenceProfile"("updatedAt");

CREATE UNIQUE INDEX "WODGlobalLearningAggregate_cohortKey_key" ON "WODGlobalLearningAggregate"("cohortKey");
CREATE INDEX "WODGlobalLearningAggregate_sport_idx" ON "WODGlobalLearningAggregate"("sport");
CREATE INDEX "WODGlobalLearningAggregate_workoutType_idx" ON "WODGlobalLearningAggregate"("workoutType");
CREATE INDEX "WODGlobalLearningAggregate_sampleSize_idx" ON "WODGlobalLearningAggregate"("sampleSize");

CREATE INDEX "AIGeneratedWOD_promptVariantId_idx" ON "AIGeneratedWOD"("promptVariantId");

ALTER TABLE "WODPreferenceProfile"
  ADD CONSTRAINT "WODPreferenceProfile_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
