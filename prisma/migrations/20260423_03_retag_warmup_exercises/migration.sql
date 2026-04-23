-- Re-tag existing system exercises that are logically warm-ups but were
-- historically filed under STRENGTH. Scoped narrowly to exact names +
-- coachId IS NULL (system exercises) + current category STRENGTH.
UPDATE "Exercise"
SET category = 'WARMUP'::"WorkoutType", "updatedAt" = NOW()
WHERE "coachId" IS NULL
  AND category = 'STRENGTH'::"WorkoutType"
  AND name IN ('Armcirklar', 'Gående utfall', 'Inchworm', 'Världens bästa stretch');
