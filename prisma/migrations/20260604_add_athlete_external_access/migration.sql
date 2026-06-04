-- Athlete-scoped external calendar/workout access for club performance staff.
CREATE TABLE "AthleteExternalAccess" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "athleteClientId" TEXT NOT NULL,
  "businessId" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "viewerName" TEXT,
  "viewerEmail" TEXT,
  "organizationName" TEXT,
  "organizationType" TEXT,
  "roleLabel" TEXT,
  "accessLevel" TEXT NOT NULL DEFAULT 'CALENDAR_WORKOUTS_READ',
  "scopes" TEXT[] NOT NULL DEFAULT ARRAY['calendar', 'workouts']::TEXT[],
  "note" TEXT,
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "lastViewedAt" TIMESTAMP(3),
  "lastViewedIp" TEXT,
  "viewCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AthleteExternalAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AthleteExternalAccess_tokenHash_key" ON "AthleteExternalAccess"("tokenHash");
CREATE INDEX "AthleteExternalAccess_athleteClientId_idx" ON "AthleteExternalAccess"("athleteClientId");
CREATE INDEX "AthleteExternalAccess_businessId_idx" ON "AthleteExternalAccess"("businessId");
CREATE INDEX "AthleteExternalAccess_createdByUserId_idx" ON "AthleteExternalAccess"("createdByUserId");
CREATE INDEX "AthleteExternalAccess_viewerEmail_idx" ON "AthleteExternalAccess"("viewerEmail");
CREATE INDEX "AthleteExternalAccess_expiresAt_idx" ON "AthleteExternalAccess"("expiresAt");
CREATE INDEX "AthleteExternalAccess_revokedAt_idx" ON "AthleteExternalAccess"("revokedAt");

ALTER TABLE "AthleteExternalAccess"
  ADD CONSTRAINT "AthleteExternalAccess_athleteClientId_fkey"
  FOREIGN KEY ("athleteClientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AthleteExternalAccess"
  ADD CONSTRAINT "AthleteExternalAccess_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AthleteExternalAccess"
  ADD CONSTRAINT "AthleteExternalAccess_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
