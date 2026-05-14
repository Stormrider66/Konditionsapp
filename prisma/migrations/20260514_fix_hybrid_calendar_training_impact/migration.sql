-- Hybrid assignments create scheduled workout calendar events. Older events
-- missed the explicit NORMAL impact and inherited the CalendarEvent default
-- of NO_TRAINING, which made valid hybrid workouts show "Ingen träning".
UPDATE "CalendarEvent" ce
SET
  "trainingImpact" = 'NORMAL'::"EventImpact",
  "updatedAt" = NOW()
WHERE ce.type = 'SCHEDULED_WORKOUT'::"CalendarEventType"
  AND ce."trainingImpact" = 'NO_TRAINING'::"EventImpact"
  AND EXISTS (
    SELECT 1
    FROM "HybridWorkoutAssignment" hwa
    WHERE hwa."calendarEventId" = ce.id
  );
