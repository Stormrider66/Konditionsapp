-- Player-scoped staff notes for coach/physio/PT collaboration.
CREATE TABLE "PlayerStaffNote" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "teamId" TEXT,
  "authorId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'OTHER',
  "isPinned" BOOLEAN NOT NULL DEFAULT false,
  "actionRequired" BOOLEAN NOT NULL DEFAULT false,
  "visibleToAthlete" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PlayerStaffNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlayerStaffNote_clientId_isPinned_createdAt_idx"
  ON "PlayerStaffNote"("clientId", "isPinned", "createdAt");
CREATE INDEX "PlayerStaffNote_clientId_actionRequired_createdAt_idx"
  ON "PlayerStaffNote"("clientId", "actionRequired", "createdAt");
CREATE INDEX "PlayerStaffNote_teamId_createdAt_idx"
  ON "PlayerStaffNote"("teamId", "createdAt");
CREATE INDEX "PlayerStaffNote_authorId_idx"
  ON "PlayerStaffNote"("authorId");

ALTER TABLE "PlayerStaffNote"
  ADD CONSTRAINT "PlayerStaffNote_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlayerStaffNote"
  ADD CONSTRAINT "PlayerStaffNote_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PlayerStaffNote"
  ADD CONSTRAINT "PlayerStaffNote_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Staff-facing alignment note on individual athlete plans.
ALTER TABLE "AthletePlan"
  ADD COLUMN "staffPlanNote" TEXT,
  ADD COLUMN "staffPlanNoteVisibleToAthlete" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "staffPlanNoteUpdatedAt" TIMESTAMP(3),
  ADD COLUMN "staffPlanNoteAuthorId" TEXT;

CREATE INDEX "AthletePlan_staffPlanNoteAuthorId_idx"
  ON "AthletePlan"("staffPlanNoteAuthorId");

ALTER TABLE "AthletePlan"
  ADD CONSTRAINT "AthletePlan_staffPlanNoteAuthorId_fkey"
  FOREIGN KEY ("staffPlanNoteAuthorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
