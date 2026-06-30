-- Per-segment HR-zone and pace targets for team cardio (Lagkondition), so the
-- live coach grid can colour each athlete's pulse and pace by an above/on/below
-- cue (the same way targetPower already drives the watts cue).
-- targetHrZone: 1-5. targetPace: seconds per 500m (rowing/ski).
-- Both columns nullable — existing rows are unaffected.

ALTER TABLE "TeamCaptureSegment"
  ADD COLUMN "targetHrZone" INTEGER,
  ADD COLUMN "targetPace" INTEGER;
