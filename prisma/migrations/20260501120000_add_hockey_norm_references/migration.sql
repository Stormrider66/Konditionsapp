-- Hockey pathway norm references, editable per coach/team.
CREATE TABLE "HockeyNormReference" (
    "id" TEXT NOT NULL,
    "teamId" TEXT,
    "businessId" TEXT,
    "coachId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "position" TEXT NOT NULL DEFAULT 'All',
    "metricKey" TEXT NOT NULL,
    "target" DOUBLE PRECISION NOT NULL,
    "elite" DOUBLE PRECISION NOT NULL,
    "priorityThreshold" DOUBLE PRECISION,
    "unit" TEXT NOT NULL,
    "lowerIsBetter" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HockeyNormReference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HockeyNormReference_coachId_teamId_level_position_metricKey_key"
ON "HockeyNormReference"("coachId", "teamId", "level", "position", "metricKey");

CREATE INDEX "HockeyNormReference_teamId_idx" ON "HockeyNormReference"("teamId");
CREATE INDEX "HockeyNormReference_coachId_idx" ON "HockeyNormReference"("coachId");
CREATE INDEX "HockeyNormReference_businessId_idx" ON "HockeyNormReference"("businessId");
