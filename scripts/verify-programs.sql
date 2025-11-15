-- Check all programs and their exercise linkage
SELECT
  tp.id as program_id,
  tp.name as program_name,
  tp."createdAt",
  COUNT(DISTINCT ws.id) as total_segments,
  COUNT(DISTINCT CASE WHEN ws."exerciseId" IS NOT NULL THEN ws.id END) as segments_with_exercise_id,
  COUNT(DISTINCT CASE WHEN e.id IS NOT NULL THEN ws.id END) as segments_with_valid_exercise
FROM "TrainingProgram" tp
LEFT JOIN "TrainingWeek" tw ON tw."programId" = tp.id
LEFT JOIN "TrainingDay" td ON td."weekId" = tw.id
LEFT JOIN "Workout" w ON w."dayId" = td.id
LEFT JOIN "WorkoutSegment" ws ON ws."workoutId" = w.id
LEFT JOIN "Exercise" e ON ws."exerciseId" = e.id
GROUP BY tp.id, tp.name, tp."createdAt"
ORDER BY tp."createdAt" DESC;

-- Also check Exercise table
SELECT COUNT(*) as exercise_count FROM "Exercise";
