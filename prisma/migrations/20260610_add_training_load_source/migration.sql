-- TrainingLoad holds two kinds of rows that consumers must distinguish:
--   WORKOUT       — written when a session is logged; carries the session's
--                   own dailyLoad; EWMA fields are null.
--   ACWR_SUMMARY  — one row per athlete per day written by the nightly
--                   calculate-acwr cron; its dailyLoad DUPLICATES the
--                   previous day's WORKOUT rows and it is the only carrier
--                   of acuteLoad/chronicLoad/acwr.
-- Until now consumers relied on the implicit "acwr IS NULL" heuristic, which
-- caused double-counted load sums and masked ACWR reads. This makes the
-- discriminator explicit.

CREATE TYPE "TrainingLoadSource" AS ENUM ('WORKOUT', 'ACWR_SUMMARY');

ALTER TABLE "TrainingLoad"
  ADD COLUMN "source" "TrainingLoadSource" NOT NULL DEFAULT 'WORKOUT';

-- Backfill: cron summary rows are exactly those carrying ACWR values.
UPDATE "TrainingLoad" SET "source" = 'ACWR_SUMMARY' WHERE "acwr" IS NOT NULL;

CREATE INDEX "TrainingLoad_clientId_source_date_idx"
  ON "TrainingLoad"("clientId", "source", "date");
