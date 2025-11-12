-- Check workout segments from the latest program
SELECT
  ws.id,
  ws.type,
  ws."exerciseId",
  ws."heartRate",
  ws.pace,
  ws.duration,
  ws.sets,
  ws."repsCount",
  e."nameSv" as exercise_name,
  e.category as exercise_category
FROM "WorkoutSegment" ws
LEFT JOIN "Exercise" e ON ws."exerciseId" = e.id
WHERE ws."workoutId" IN (
  SELECT w.id
  FROM "Workout" w
  JOIN "TrainingDay" td ON w."dayId" = td.id
  JOIN "TrainingWeek" tw ON td."weekId" = tw.id
  JOIN "TrainingProgram" tp ON tw."programId" = tp.id
  ORDER BY tp."createdAt" DESC
  LIMIT 1
)
ORDER BY ws."order"
LIMIT 10;
