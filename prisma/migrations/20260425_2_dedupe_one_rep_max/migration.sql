-- Dedupe OneRepMaxHistory rows so the upcoming UNIQUE constraint can be
-- added without conflict. Coach intent on a same-day duplicate is "the
-- best of session", so we keep the highest oneRepMax per
-- (clientId, exerciseId, date), tie-break on most-recent createdAt.
--
-- Run this before the UNIQUE constraint migration. Idempotent — if no
-- duplicates exist, the DELETE is a no-op.

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "clientId", "exerciseId", "date"
      ORDER BY "oneRepMax" DESC, "createdAt" DESC, id DESC
    ) AS rn
  FROM "OneRepMaxHistory"
)
DELETE FROM "OneRepMaxHistory"
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
