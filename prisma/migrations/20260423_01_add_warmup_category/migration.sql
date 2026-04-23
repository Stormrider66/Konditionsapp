-- Add WARMUP to WorkoutType enum (additive, zero data loss).
-- Runs in its own migration because Postgres forbids using a newly-added
-- enum value in the same transaction that adds it.
ALTER TYPE "WorkoutType" ADD VALUE IF NOT EXISTS 'WARMUP';
