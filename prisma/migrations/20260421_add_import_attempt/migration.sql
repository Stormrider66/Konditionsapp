-- Refactor 7: per-attempt telemetry for the program importer.
-- One row per /api/programs/import-parse POST, written post-response so a
-- telemetry failure can't fail the user-facing request.

CREATE TABLE "ImportAttempt" (
    "id"              TEXT NOT NULL,
    "userId"          TEXT,
    "coachId"         TEXT,
    "athleteClientId" TEXT,
    "inputKind"       TEXT NOT NULL,
    "modelUsed"       TEXT NOT NULL,
    "intent"          TEXT,
    "parsedOk"        BOOLEAN NOT NULL,
    "warningCount"    INTEGER NOT NULL DEFAULT 0,
    "resolutionCount" INTEGER NOT NULL DEFAULT 0,
    "autoMappedCount" INTEGER NOT NULL DEFAULT 0,
    "cached"          BOOLEAN NOT NULL DEFAULT false,
    "inputHash"       TEXT,
    "errorMessage"    TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ImportAttempt_userId_idx"    ON "ImportAttempt" ("userId");
CREATE INDEX "ImportAttempt_coachId_idx"   ON "ImportAttempt" ("coachId");
CREATE INDEX "ImportAttempt_createdAt_idx" ON "ImportAttempt" ("createdAt");
