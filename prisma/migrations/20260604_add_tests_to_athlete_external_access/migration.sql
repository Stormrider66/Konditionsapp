ALTER TABLE "AthleteExternalAccess"
  ALTER COLUMN "scopes" SET DEFAULT ARRAY['calendar', 'workouts', 'tests']::TEXT[];

UPDATE "AthleteExternalAccess"
SET "scopes" = "scopes" || ARRAY['tests']::TEXT[]
WHERE NOT ("scopes" @> ARRAY['tests']::TEXT[]);
