-- Direct SQL insert for exercises
-- Run this in Supabase SQL editor or via psql

INSERT INTO "Exercise" ("id", "name", "nameSv", "nameEn", "category", "muscleGroup", "description", "equipment", "difficulty", "isPublic", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'Knäböj', 'Knäböj', 'Squat', 'STRENGTH', 'Ben', 'Grundläggande styrkeövning för ben och höfter', 'Skivstång, rack', 'Intermediate', true, NOW(), NOW()),
  (gen_random_uuid(), 'Marklyft', 'Marklyft', 'Deadlift', 'STRENGTH', 'Ben', 'Helkroppsövning med fokus på bakre kedjan', 'Skivstång', 'Advanced', true, NOW(), NOW()),
  (gen_random_uuid(), 'Utfallssteg', 'Utfallssteg', 'Lunges', 'STRENGTH', 'Ben', 'Enbensstyrka för löpare', 'Hantlar (valfritt)', 'Beginner', true, NOW(), NOW()),
  (gen_random_uuid(), 'Rumänsk marklyft', 'Rumänsk marklyft', 'Romanian Deadlift', 'STRENGTH', 'Ben', 'Isolerar hases och gluteus', 'Skivstång', 'Intermediate', true, NOW(), NOW()),
  (gen_random_uuid(), 'Bänkpress', 'Bänkpress', 'Bench Press', 'STRENGTH', 'Överkropp', 'Grundövning för bröst och triceps', 'Skivstång, bänk', 'Intermediate', true, NOW(), NOW()),
  (gen_random_uuid(), 'Rodd', 'Rodd', 'Barbell Row', 'STRENGTH', 'Överkropp', 'Stärker rygg och baksida axlar', 'Skivstång', 'Intermediate', true, NOW(), NOW()),
  (gen_random_uuid(), 'Chins', 'Chins', 'Pull-ups', 'STRENGTH', 'Överkropp', 'Vertikal dragövning', 'Chinsstång', 'Advanced', true, NOW(), NOW()),
  (gen_random_uuid(), 'Axelpress', 'Axelpress', 'Overhead Press', 'STRENGTH', 'Överkropp', 'Axelstyrka', 'Skivstång', 'Intermediate', true, NOW(), NOW()),
  (gen_random_uuid(), 'Lådhopp', 'Lådhopp', 'Box Jumps', 'PLYOMETRIC', 'Ben', 'Explosiv styrka', 'Plyolåda', 'Intermediate', true, NOW(), NOW()),
  (gen_random_uuid(), 'Depth Jumps', 'Depth Jumps', 'Depth Jumps', 'PLYOMETRIC', 'Ben', 'Reaktiv styrka', 'Låda', 'Advanced', true, NOW(), NOW()),
  (gen_random_uuid(), 'Enbenhopp', 'Enbenhopp', 'Single Leg Hops', 'PLYOMETRIC', 'Ben', 'Enbensstyrka och stabilitet', 'Ingen', 'Intermediate', true, NOW(), NOW()),
  (gen_random_uuid(), 'Broad Jump', 'Broad Jump', 'Broad Jump', 'PLYOMETRIC', 'Ben', 'Horisontell explosivitet', 'Ingen', 'Intermediate', true, NOW(), NOW()),
  (gen_random_uuid(), 'Plank', 'Plank', 'Plank', 'CORE', 'Core', 'Corestabilitet', 'Ingen', 'Beginner', true, NOW(), NOW()),
  (gen_random_uuid(), 'Sidplank', 'Sidplank', 'Side Plank', 'CORE', 'Core', 'Lateral corestabilitet', 'Ingen', 'Beginner', true, NOW(), NOW()),
  (gen_random_uuid(), 'Dead Bug', 'Dead Bug', 'Dead Bug', 'CORE', 'Core', 'Anti-extension core', 'Ingen', 'Beginner', true, NOW(), NOW()),
  (gen_random_uuid(), 'Bird Dog', 'Bird Dog', 'Bird Dog', 'CORE', 'Core', 'Corestabilitet och balans', 'Ingen', 'Beginner', true, NOW(), NOW()),
  (gen_random_uuid(), 'Pallof Press', 'Pallof Press', 'Pallof Press', 'CORE', 'Core', 'Anti-rotation corestyrka', 'Kabel eller gummiband', 'Intermediate', true, NOW(), NOW()),
  (gen_random_uuid(), 'Russian Twist', 'Russian Twist', 'Russian Twist', 'CORE', 'Core', 'Rotationsstyrka', 'Viktskiva (valfritt)', 'Intermediate', true, NOW(), NOW()),
  (gen_random_uuid(), 'Benlyft', 'Benlyft', 'Leg Raises', 'CORE', 'Core', 'Nedre magmuskler', 'Ingen', 'Intermediate', true, NOW(), NOW()),
  (gen_random_uuid(), 'Mountain Climbers', 'Mountain Climbers', 'Mountain Climbers', 'CORE', 'Core', 'Dynamisk core och kondition', 'Ingen', 'Intermediate', true, NOW(), NOW());

-- Verify
SELECT COUNT(*) as total_exercises FROM "Exercise";
SELECT name, category, "muscleGroup" FROM "Exercise" LIMIT 10;
