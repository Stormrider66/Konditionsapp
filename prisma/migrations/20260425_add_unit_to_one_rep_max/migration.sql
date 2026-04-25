-- Add `unit` column to OneRepMaxHistory so the table can hold non-strength PRs
-- (box jump height in cm, broad jump in m, sprint times in seconds, peak power
-- in watts, max-rep counts, etc.) alongside the existing kg-based 1RM lifts.
--
-- Defaults to 'KG' so every existing row is interpreted correctly without a
-- backfill. The runner's `% av 1RM` weight resolution only fires when the
-- stored unit is KG, so non-KG entries are inert from the strength prescription
-- side — they're pure tracking data.

ALTER TABLE "OneRepMaxHistory"
  ADD COLUMN "unit" TEXT NOT NULL DEFAULT 'KG';
