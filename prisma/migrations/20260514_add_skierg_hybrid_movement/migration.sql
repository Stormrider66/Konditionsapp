-- Ensure SkiErg is available in the Hybrid Studio movement picker.
-- Older databases may have the spaced "Ski Erg" variants or may not have
-- the standalone HYROX station entry if seed scripts were not rerun.

UPDATE "Exercise"
SET
  name = 'SkiErg (Calories)',
  "nameSv" = 'SkiErg (Kalorier)',
  "nameEn" = 'SkiErg (Calories)',
  "isHybridMovement" = true,
  "movementCategory" = 'MONOSTRUCTURAL'::"MovementCategory",
  "equipmentTypes" = ARRAY['MACHINE_SKI']::"EquipmentType"[],
  "standardAbbreviation" = 'SKI',
  "updatedAt" = NOW()
WHERE name = 'Ski Erg (Calories)'
  AND "coachId" IS NULL;

UPDATE "Exercise"
SET
  name = 'SkiErg (Meters)',
  "nameSv" = 'SkiErg (Meter)',
  "nameEn" = 'SkiErg (Meters)',
  "isHybridMovement" = true,
  "movementCategory" = 'MONOSTRUCTURAL'::"MovementCategory",
  "equipmentTypes" = ARRAY['MACHINE_SKI']::"EquipmentType"[],
  "standardAbbreviation" = 'SKI',
  "updatedAt" = NOW()
WHERE name = 'Ski Erg (Meters)'
  AND "coachId" IS NULL;

INSERT INTO "Exercise" (
  id,
  "coachId",
  name,
  category,
  "muscleGroup",
  description,
  equipment,
  difficulty,
  "isPublic",
  "nameSv",
  "nameEn",
  "isHybridMovement",
  "movementCategory",
  "equipmentTypes",
  "standardAbbreviation",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid(),
  NULL,
  v.name,
  'OTHER'::"WorkoutType",
  v."muscleGroup",
  v.description,
  v.equipment,
  v.difficulty,
  true,
  v."nameSv",
  v."nameEn",
  true,
  v."movementCategory"::"MovementCategory",
  v."equipmentTypes"::"EquipmentType"[],
  v."standardAbbreviation",
  NOW(),
  NOW()
FROM (
  VALUES
    (
      'SkiErg',
      'SkiErg',
      'SkiErg',
      'Upper Body',
      'Hybrid station: SkiErg work for meters, calories, or time.',
      'SkiErg',
      'Intermediate',
      'MONOSTRUCTURAL',
      ARRAY['MACHINE_SKI'],
      'SKI'
    ),
    (
      'SkiErg (Calories)',
      'SkiErg (Kalorier)',
      'SkiErg (Calories)',
      'Upper Body',
      'SkiErg workout measured in calories.',
      'SkiErg',
      'Intermediate',
      'MONOSTRUCTURAL',
      ARRAY['MACHINE_SKI'],
      'SKI'
    ),
    (
      'SkiErg (Meters)',
      'SkiErg (Meter)',
      'SkiErg (Meters)',
      'Upper Body',
      'SkiErg workout measured in meters.',
      'SkiErg',
      'Intermediate',
      'MONOSTRUCTURAL',
      ARRAY['MACHINE_SKI'],
      'SKI'
    )
) AS v(name, "nameSv", "nameEn", "muscleGroup", description, equipment, difficulty, "movementCategory", "equipmentTypes", "standardAbbreviation")
WHERE NOT EXISTS (
  SELECT 1
  FROM "Exercise" e
  WHERE e.name = v.name
    AND e."coachId" IS NULL
);
