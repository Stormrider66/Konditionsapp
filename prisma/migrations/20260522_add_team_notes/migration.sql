-- Shared staff notes on team dashboards.

CREATE TABLE "TeamNote" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "tag" TEXT NOT NULL DEFAULT 'OTHER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TeamNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TeamNote_teamId_createdAt_idx" ON "TeamNote"("teamId", "createdAt");
CREATE INDEX "TeamNote_authorId_idx" ON "TeamNote"("authorId");

ALTER TABLE "TeamNote"
  ADD CONSTRAINT "TeamNote_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeamNote"
  ADD CONSTRAINT "TeamNote_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
