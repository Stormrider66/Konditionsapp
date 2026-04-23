-- Seed common warm-up exercises as system exercises (coachId = NULL, isPublic = true).
-- Idempotent: only inserts when a system exercise with the same name is not already present.
INSERT INTO "Exercise" (id, "coachId", name, category, "muscleGroup", description, equipment, difficulty, "isPublic", "nameSv", "nameEn", "createdAt", "updatedAt")
SELECT gen_random_uuid(), NULL, v.name, 'WARMUP'::"WorkoutType", v."muscleGroup", v.description, v.equipment, v.difficulty, true, v."nameSv", v."nameEn", NOW(), NOW()
FROM (
  VALUES
    ('Armcirklar',            'Shoulders',   'Cirkulera armarna framåt och bakåt för att värma upp axlar.',                 'None', 'Beginner',     'Armcirklar',            'Arm Circles'),
    ('Bensvingar',            'Hips',        'Stå på ett ben och sving andra benet fram och tillbaka, sedan sida till sida.', 'None', 'Beginner',     'Bensvingar',            'Leg Swings'),
    ('Höftöppnare (gående)',  'Hips',        'Gående lift av knä till bröst följt av höftrotation utåt.',                   'None', 'Beginner',     'Höftöppnare (gående)',  'Walking Hip Openers'),
    ('Knä till bröst (gående)','Hips',       'Gå framåt och dra växelvis knäet mot bröstet.',                                'None', 'Beginner',     'Knä till bröst (gående)', 'Walking Knee Hugs'),
    ('Gående utfall',         'Legs',        'Kliv framåt i utfall, växla sida. Dynamisk aktivering.',                       'None', 'Beginner',     'Gående utfall',         'Walking Lunges'),
    ('Höga knän',             'Legs',        'Jogga på stället och dra upp knäna högt. Puls + höftböjare.',                  'None', 'Beginner',     'Höga knän',             'High Knees'),
    ('Hälsparkar',            'Legs',        'Jogga på stället och sparka hälarna mot rumpan.',                             'None', 'Beginner',     'Hälsparkar',            'Butt Kicks'),
    ('Inchworm',              'Full Body',   'Böj fram, gå ut på händerna till planka, gå tillbaka.',                        'None', 'Beginner',     'Inchworm',              'Inchworm'),
    ('Världens bästa stretch','Full Body',   'Djupt utfall + rotation mot fram-ben, växla sida.',                           'None', 'Intermediate', 'Världens bästa stretch','Worlds Greatest Stretch'),
    ('Katt-ko',               'Core',        'Alterera mellan rundad och svankad rygg på alla fyra.',                        'None', 'Beginner',     'Katt-ko',               'Cat-Cow'),
    ('Bålrotation stående',   'Core',        'Fötter höftbrett, rotera överkroppen mjukt sida till sida.',                   'None', 'Beginner',     'Bålrotation stående',   'Standing Torso Twists'),
    ('Skulderbladsrullningar','Shoulders',   'Rulla skulderbladen bakåt-nedåt för aktivering av övre rygg.',                 'None', 'Beginner',     'Skulderbladsrullningar','Scapular Rolls')
) AS v(name, "muscleGroup", description, equipment, difficulty, "nameSv", "nameEn")
WHERE NOT EXISTS (
  SELECT 1 FROM "Exercise" e WHERE e.name = v.name AND e."coachId" IS NULL
);
