-- Phase 5a: learned name → exercise mappings for the program importer.
-- When a coach (or athlete, scoped to their coach) confirms the right exercise
-- for an imported program, we remember it here so the next import auto-resolves.

CREATE TABLE "ExerciseNameAlias" (
    "id"         TEXT NOT NULL,
    "coachId"    TEXT,
    "alias"      TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "createdBy"  TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExerciseNameAlias_pkey" PRIMARY KEY ("id")
);

-- One alias per (coach, alias) pair. Note: Postgres treats NULL as distinct in
-- UNIQUE constraints, so multiple rows with coachId=NULL can coexist — that's
-- acceptable for global aliases seeded over time.
CREATE UNIQUE INDEX "ExerciseNameAlias_coachId_alias_key"
    ON "ExerciseNameAlias" ("coachId", "alias");

CREATE INDEX "ExerciseNameAlias_alias_idx"
    ON "ExerciseNameAlias" ("alias");

CREATE INDEX "ExerciseNameAlias_coachId_idx"
    ON "ExerciseNameAlias" ("coachId");

CREATE INDEX "ExerciseNameAlias_exerciseId_idx"
    ON "ExerciseNameAlias" ("exerciseId");

ALTER TABLE "ExerciseNameAlias"
    ADD CONSTRAINT "ExerciseNameAlias_exerciseId_fkey"
    FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
