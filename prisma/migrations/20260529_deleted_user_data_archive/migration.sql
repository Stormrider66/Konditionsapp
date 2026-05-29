-- Compliance retention: snapshot a user's financial/referral records before an
-- admin hard-deletes them. Additive only (new table, no relation to "User"), so
-- the user-delete cascade cannot wipe this archive.

CREATE TABLE "DeletedUserDataArchive" (
  "id" TEXT NOT NULL,
  "deletedUserId" TEXT NOT NULL,
  "email" TEXT,
  "name" TEXT,
  "role" TEXT,
  "snapshot" JSONB NOT NULL,
  "deletedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DeletedUserDataArchive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeletedUserDataArchive_deletedUserId_idx" ON "DeletedUserDataArchive"("deletedUserId");

-- CreateIndex
CREATE INDEX "DeletedUserDataArchive_createdAt_idx" ON "DeletedUserDataArchive"("createdAt");
