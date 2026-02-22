/**
 * General Strength Base-Building Templates
 *
 * Pre-built strength training templates for general population athletes.
 * Not sport-specific -- focuses on building a solid foundation of strength
 * through fundamental compound movement patterns.
 *
 * Templates are organized by athlete level:
 * - BEGINNER: Bodyweight and light load introduction to the big lifts
 * - INTERMEDIATE: Progressive overload with barbell compound movements
 * - ADVANCED: Periodized heavy compound training with accessory work
 * - ELITE: High-volume periodized strength with advanced techniques
 */

import type { StrengthTemplate, TemplateExercise } from '@/lib/training-engine/templates/strength-templates'

/**
 * General strength base-building templates
 */
export const STRENGTH_BASE_TEMPLATES: StrengthTemplate[] = [
  // ============================================
  // BEGINNER STRENGTH BASE (2x/week)
  // ============================================
  {
    id: 'strength-base-beginner-2x',
    name: 'Beginner Strength Base',
    nameSv: 'Nybörjare Grundstyrka',
    description:
      'Introduction to compound lifting for beginners. Teaches squat, hinge, push, and pull patterns with bodyweight and light loads. Perfect first strength program.',
    descriptionSv:
      'Introduktion till grundläggande lyft för nybörjare. Lär ut knäböj, gångjärn, tryck och drag med kroppsvikt och lätt belastning. Perfekt första styrkeprogram.',
    category: 'STRENGTH_BASE',
    phase: 'ANATOMICAL_ADAPTATION',
    sessionsPerWeek: 2,
    estimatedDuration: 40,
    athleteLevel: 'BEGINNER',
    equipmentRequired: ['Hantlar', 'Träningsmatta'],
    includesWarmup: true,
    includesCore: true,
    includesCooldown: true,
    tags: ['grundstyrka', 'nybörjare', 'helkropp', 'compound'],
    exercises: [
      // Warmup
      {
        exerciseName: 'Cat-Cow Stretch',
        exerciseNameSv: 'Katt-ko stretch',
        sets: 1,
        reps: 10,
        restSeconds: 0,
        notes: 'Kontrollerad rörelse genom hela ryggraden.',
        section: 'WARMUP',
      },
      {
        exerciseName: 'Bodyweight Squats',
        exerciseNameSv: 'Knäböj utan vikt',
        sets: 2,
        reps: 10,
        restSeconds: 30,
        section: 'WARMUP',
      },
      {
        exerciseName: 'Arm Circles',
        exerciseNameSv: 'Armcirklar',
        sets: 1,
        reps: '10 per håll',
        restSeconds: 0,
        section: 'WARMUP',
      },
      // Main
      {
        exerciseName: 'Goblet Squat',
        exerciseNameSv: 'Goblet Squat',
        sets: 3,
        reps: 12,
        restSeconds: 60,
        tempo: '2-0-2-0',
        notes: 'Lätt hantel. Armbågarna innanför knäna i botten. Rakt ryggläge.',
        section: 'MAIN',
      },
      {
        exerciseName: 'Romanian Deadlift (Dumbbell)',
        exerciseNameSv: 'RDL (Hantel)',
        sets: 3,
        reps: 10,
        restSeconds: 60,
        tempo: '3-0-1-0',
        notes: 'Hantlar längs låren. Mjukt i knäna, känn stretch i hamstrings.',
        section: 'MAIN',
      },
      {
        exerciseName: 'Dumbbell Floor Press',
        exerciseNameSv: 'Hantel golvpress',
        sets: 3,
        reps: 10,
        restSeconds: 60,
        tempo: '2-1-1-0',
        notes: 'Ligg på golvet. Armbågarna vilar i botten. Kontrollerad rörelse.',
        section: 'MAIN',
      },
      {
        exerciseName: 'Dumbbell Row (Single Arm)',
        exerciseNameSv: 'Hantelrodd (enarms)',
        sets: 3,
        reps: '10 per arm',
        restSeconds: 60,
        tempo: '2-1-1-0',
        notes: 'Stöd med handen på bänk. Dra till höften. Kontrollera nedsläpp.',
        section: 'MAIN',
      },
      {
        exerciseName: 'Dumbbell Overhead Press (Seated)',
        exerciseNameSv: 'Hantel axelpress (sittande)',
        sets: 2,
        reps: 10,
        restSeconds: 60,
        notes: 'Sittande med ryggstöd. Tryck rakt upp. Kontrollerad nedfällning.',
        section: 'MAIN',
      },
      // Core
      {
        exerciseName: 'Plank',
        exerciseNameSv: 'Plankan',
        sets: 2,
        reps: '30 sek',
        restSeconds: 30,
        notes: 'Rak linje från huvud till hälar. Dra in naveln.',
        section: 'CORE',
      },
      {
        exerciseName: 'Dead Bug',
        exerciseNameSv: 'Dead Bug',
        sets: 2,
        reps: '8 per sida',
        restSeconds: 30,
        notes: 'Tryck nedre ryggen mot golvet hela tiden.',
        section: 'CORE',
      },
      // Cooldown
      {
        exerciseName: 'Chest Stretch (Doorway)',
        exerciseNameSv: 'Bröststretch (dörrkarm)',
        sets: 1,
        reps: '45 sek per sida',
        restSeconds: 0,
        section: 'COOLDOWN',
      },
      {
        exerciseName: 'Hamstring Stretch',
        exerciseNameSv: 'Hamstringstretch',
        sets: 1,
        reps: '45 sek per sida',
        restSeconds: 0,
        section: 'COOLDOWN',
      },
    ],
    coachNotes:
      'Fokus på teknik i alla lyft. Öka reps till 15 innan vikten höjs. Rörelser ska kännas kontrollerade och smärtfria.',
  },

  // ============================================
  // INTERMEDIATE STRENGTH BASE (3x/week)
  // ============================================
  {
    id: 'strength-base-intermediate-3x',
    name: 'Intermediate Strength Base',
    nameSv: 'Medel Grundstyrka',
    description:
      'Progressive compound barbell program for intermediate lifters. Full-body sessions with squat, deadlift, bench press, and barbell row as primary movements.',
    descriptionSv:
      'Progressivt compound skivstångsprogram för medelavancerade. Helkroppspass med knäböj, marklyft, bänkpress och skivstångsrodd som primära rörelser.',
    category: 'STRENGTH_BASE',
    phase: 'MAXIMUM_STRENGTH',
    sessionsPerWeek: 3,
    estimatedDuration: 50,
    athleteLevel: 'INTERMEDIATE',
    equipmentRequired: ['Skivstång', 'Hantlar', 'Bänk', 'Rack'],
    includesWarmup: true,
    includesCore: true,
    includesCooldown: true,
    tags: ['grundstyrka', 'medel', 'skivstång', 'compound', 'helkropp'],
    exercises: [
      // Warmup
      {
        exerciseName: 'Foam Roll (Full Body)',
        exerciseNameSv: 'Foamroller (helkropp)',
        sets: 1,
        reps: '5 min',
        restSeconds: 0,
        notes: 'Rulla quad, hamstrings, övre rygg och lats.',
        section: 'WARMUP',
      },
      {
        exerciseName: 'Glute Bridges',
        exerciseNameSv: 'Glutebrygga',
        sets: 2,
        reps: 10,
        restSeconds: 30,
        section: 'WARMUP',
      },
      {
        exerciseName: 'Band Pull-Aparts',
        exerciseNameSv: 'Bandisärdragning',
        sets: 2,
        reps: 15,
        restSeconds: 30,
        notes: 'Aktiverar övre rygg och bakre axel.',
        section: 'WARMUP',
      },
      // Main
      {
        exerciseName: 'Back Squat',
        exerciseNameSv: 'Knäböj med skivstång',
        sets: 4,
        reps: 6,
        restSeconds: 120,
        tempo: '2-0-1-0',
        notes: 'Uppvärmningsset: tom stång x 10, 50% x 5, 70% x 3. Arbetsset 80-85% av 1RM.',
        section: 'MAIN',
      },
      {
        exerciseName: 'Bench Press',
        exerciseNameSv: 'Bänkpress',
        sets: 4,
        reps: 6,
        restSeconds: 120,
        tempo: '2-1-1-0',
        notes: 'Skulderbladen ihopdragna. Fötterna i golvet. Kontrollerad nedfällning.',
        section: 'MAIN',
      },
      {
        exerciseName: 'Barbell Row',
        exerciseNameSv: 'Skivstångsrodd',
        sets: 4,
        reps: 8,
        restSeconds: 90,
        tempo: '1-1-2-0',
        notes: '45-graders vinkel i överkroppen. Dra till nedre bröstkorgen.',
        section: 'MAIN',
      },
      {
        exerciseName: 'Overhead Press',
        exerciseNameSv: 'Axelpress stående',
        sets: 3,
        reps: 8,
        restSeconds: 90,
        notes: 'Stående med skivstång. Tight bål. Tryck rakt upp.',
        section: 'MAIN',
      },
      {
        exerciseName: 'Romanian Deadlift',
        exerciseNameSv: 'RDL',
        sets: 3,
        reps: 8,
        restSeconds: 90,
        tempo: '3-0-1-0',
        notes: 'Skivstång. Fokus på hamstring-stretch under kontroll.',
        section: 'MAIN',
      },
      // Core
      {
        exerciseName: 'Ab Wheel Rollout',
        exerciseNameSv: 'Ab Wheel Utfällning',
        sets: 3,
        reps: 8,
        restSeconds: 45,
        notes: 'Från knäna. Kontrollerad förlängning. Undvik att svanka.',
        section: 'CORE',
      },
      {
        exerciseName: 'Pallof Press',
        exerciseNameSv: 'Pallof Press',
        sets: 2,
        reps: '10 per sida',
        restSeconds: 30,
        notes: 'Anti-rotation med kabel eller band.',
        section: 'CORE',
      },
      // Cooldown
      {
        exerciseName: 'Lat Stretch (Doorway)',
        exerciseNameSv: 'Latstretch (dörrkarm)',
        sets: 1,
        reps: '45 sek per sida',
        restSeconds: 0,
        section: 'COOLDOWN',
      },
      {
        exerciseName: 'Hip Flexor Stretch',
        exerciseNameSv: 'Höftböjarstretch',
        sets: 1,
        reps: '45 sek per sida',
        restSeconds: 0,
        section: 'COOLDOWN',
      },
    ],
    coachNotes:
      'Progridera vikt med 2.5 kg per vecka i knäböj/marklyft och 1.25 kg i bänk/axelpress. Deload var 4:e vecka (-40% volym). Variera mellan A (squat-fokus) och B (deadlift-fokus) pass.',
  },

  // ============================================
  // ADVANCED STRENGTH BASE (3x/week)
  // ============================================
  {
    id: 'strength-base-advanced-3x',
    name: 'Advanced Strength Base',
    nameSv: 'Avancerad Grundstyrka',
    description:
      'Periodized heavy compound training with accessory work for advanced lifters. Includes intensity techniques and structured progression.',
    descriptionSv:
      'Periodiserad tung compound-träning med tillbehörsövningar för avancerade lyftare. Inkluderar intensitetstekniker och strukturerad progression.',
    category: 'STRENGTH_BASE',
    phase: 'MAXIMUM_STRENGTH',
    sessionsPerWeek: 3,
    estimatedDuration: 60,
    athleteLevel: 'ADVANCED',
    equipmentRequired: ['Skivstång', 'Hantlar', 'Bänk', 'Rack', 'Kabel-maskin'],
    includesWarmup: true,
    includesCore: true,
    includesCooldown: true,
    tags: ['grundstyrka', 'avancerad', 'periodisering', 'tung', 'compound'],
    exercises: [
      // Warmup
      {
        exerciseName: 'Foam Roll + Lacrosse Ball',
        exerciseNameSv: 'Foamroller + lacrosseboll',
        sets: 1,
        reps: '5 min',
        restSeconds: 0,
        notes: 'Fokusera på problemområden: thorax, höftböjare, lats.',
        section: 'WARMUP',
      },
      {
        exerciseName: 'Goblet Squat',
        exerciseNameSv: 'Goblet Squat',
        sets: 2,
        reps: 8,
        restSeconds: 30,
        notes: 'Uppvärmning med lätt vikt. Öppna höfterna.',
        section: 'WARMUP',
      },
      {
        exerciseName: 'Band Pull-Aparts + Dislocates',
        exerciseNameSv: 'Bandisärdragning + axelcirklar',
        sets: 2,
        reps: '10 + 10',
        restSeconds: 30,
        notes: 'Aktivera bakre axel och mobilisera axelled.',
        section: 'WARMUP',
      },
      // Main
      {
        exerciseName: 'Back Squat',
        exerciseNameSv: 'Knäböj med skivstång',
        sets: 5,
        reps: 4,
        restSeconds: 180,
        notes: '85-90% av 1RM. Uppvärmningsrampen: stång x 5, 50% x 5, 70% x 3, 80% x 2.',
        section: 'MAIN',
      },
      {
        exerciseName: 'Bench Press (Paused)',
        exerciseNameSv: 'Bänkpress (pausad)',
        sets: 4,
        reps: 4,
        restSeconds: 150,
        tempo: '2-2-1-0',
        notes: '2 sek paus mot bröstet. 82-87% av 1RM.',
        section: 'MAIN',
      },
      {
        exerciseName: 'Weighted Pull-ups',
        exerciseNameSv: 'Viktade chins',
        sets: 4,
        reps: 6,
        restSeconds: 120,
        notes: 'Tilläggsvikt med bälte eller hantel mellan fötterna.',
        section: 'MAIN',
      },
      {
        exerciseName: 'Deadlift (Conventional or Sumo)',
        exerciseNameSv: 'Marklyft (konventionell eller sumo)',
        sets: 4,
        reps: 3,
        restSeconds: 180,
        notes: '85-92% av 1RM. Varje rep från golvet. Ingen studs.',
        section: 'MAIN',
      },
      {
        exerciseName: 'Dumbbell Incline Press',
        exerciseNameSv: 'Hantel lutande bänkpress',
        sets: 3,
        reps: 8,
        restSeconds: 90,
        tempo: '2-0-1-0',
        notes: '30-45 graders lutning. Kompletterande pressövning.',
        section: 'MAIN',
      },
      {
        exerciseName: 'Face Pulls',
        exerciseNameSv: 'Face Pulls',
        sets: 3,
        reps: 15,
        restSeconds: 45,
        notes: 'Kabel eller band. Extern rotation i slutposition. Axelhälsa.',
        section: 'MAIN',
      },
      // Core
      {
        exerciseName: 'Hanging Leg Raise',
        exerciseNameSv: 'Hängande benlyft',
        sets: 3,
        reps: 10,
        restSeconds: 45,
        notes: 'Raka eller böjda ben. Kontrollerad rörelse utan svaj.',
        section: 'CORE',
      },
      {
        exerciseName: 'Farmer Walk',
        exerciseNameSv: 'Bondpromenad',
        sets: 3,
        reps: '30m',
        restSeconds: 60,
        notes: 'Tunga hantlar. Upprät hållning. Stärker grepp och helkroppsstabilitet.',
        section: 'CORE',
      },
      // Cooldown
      {
        exerciseName: 'Thoracic Spine Extension (Foam Roller)',
        exerciseNameSv: 'Bröstryggsextension (foamroller)',
        sets: 1,
        reps: '60 sek',
        restSeconds: 0,
        section: 'COOLDOWN',
      },
      {
        exerciseName: 'Hip 90/90 Stretch',
        exerciseNameSv: 'Höft 90/90 stretch',
        sets: 1,
        reps: '45 sek per sida',
        restSeconds: 0,
        notes: 'Förbättrar höftrotation.',
        section: 'COOLDOWN',
      },
    ],
    coachNotes:
      'Periodisering: Vecka 1-3 progressivt ökande intensitet, vecka 4 deload (-50% volym). Testa nya maxvikter var 6-8:e vecka. Variera huvudlyft mellan pass (A: Squat+Bench, B: Deadlift+OHP, C: Front Squat+Close-grip Bench).',
  },

  // ============================================
  // ELITE STRENGTH BASE (3x/week)
  // ============================================
  {
    id: 'strength-base-elite-3x',
    name: 'Elite Strength Base',
    nameSv: 'Elit Grundstyrka',
    description:
      'High-volume periodized strength program for elite-level athletes. Incorporates wave loading, cluster sets, and advanced accessory selection.',
    descriptionSv:
      'Högvolym periodiserat styrkeprogram för elitidrottare. Inkluderar vågbelastning, klustersets och avancerat tillbehörsval.',
    category: 'STRENGTH_BASE',
    phase: 'MAXIMUM_STRENGTH',
    sessionsPerWeek: 3,
    estimatedDuration: 70,
    athleteLevel: 'ELITE',
    equipmentRequired: ['Skivstång', 'Hantlar', 'Bänk', 'Rack', 'Kabel-maskin', 'Kettlebells'],
    includesWarmup: true,
    includesCore: true,
    includesCooldown: true,
    tags: ['grundstyrka', 'elit', 'periodisering', 'vågbelastning', 'compound'],
    exercises: [
      // Warmup
      {
        exerciseName: 'Dynamic Warm-up Complex',
        exerciseNameSv: 'Dynamisk uppvärmningskomplex',
        sets: 1,
        reps: '8 min',
        restSeconds: 0,
        notes: 'Världens bästa stretch x 5/sida, inchworms x 5, band pull-aparts x 15, goblet squat x 8.',
        section: 'WARMUP',
      },
      {
        exerciseName: 'Barbell Complex (Empty Bar)',
        exerciseNameSv: 'Skivstångskomplex (tom stång)',
        sets: 2,
        reps: '5 av varje',
        restSeconds: 30,
        notes: 'Marklyft + rodd + fällning + press + knäböj. Flödar mellan övningarna.',
        section: 'WARMUP',
      },
      // Main
      {
        exerciseName: 'Back Squat (Wave Loading)',
        exerciseNameSv: 'Knäböj (vågbelastning)',
        sets: 6,
        reps: '3/2/1/3/2/1',
        restSeconds: 180,
        notes: 'Våg 1: 87%/90%/93%. Våg 2: 89%/92%/95%. Fullständig vila mellan set.',
        section: 'MAIN',
      },
      {
        exerciseName: 'Bench Press (Cluster Sets)',
        exerciseNameSv: 'Bänkpress (klustersets)',
        sets: 4,
        reps: '2+2+2',
        restSeconds: 180,
        notes: '88-92% 1RM. 15 sek intra-set vila. Total 6 reps per set med hög kvalitet.',
        section: 'MAIN',
      },
      {
        exerciseName: 'Weighted Pull-ups',
        exerciseNameSv: 'Viktade chins',
        sets: 4,
        reps: 5,
        restSeconds: 120,
        notes: 'Progressivt ökande tilläggsvikt. Fullständig ROM.',
        section: 'MAIN',
      },
      {
        exerciseName: 'Front Squat',
        exerciseNameSv: 'Frontknäböj',
        sets: 3,
        reps: 4,
        restSeconds: 150,
        notes: 'Kompletterar bakre knäböj. 75-80% av back squat 1RM.',
        section: 'MAIN',
      },
      {
        exerciseName: 'Barbell Hip Thrust',
        exerciseNameSv: 'Skivstång höftlyft',
        sets: 3,
        reps: 8,
        restSeconds: 90,
        notes: 'Tung belastning. Full höftextension i toppen. 2 sek paus.',
        section: 'MAIN',
      },
      {
        exerciseName: 'Dumbbell Row (Kroc Row)',
        exerciseNameSv: 'Hantelrodd (Kroc Row)',
        sets: 2,
        reps: '12 per arm',
        restSeconds: 60,
        notes: 'Tung med kontrollerad form. Lite kroppsengelska tillåten.',
        section: 'MAIN',
      },
      // Core
      {
        exerciseName: 'Dragon Flag',
        exerciseNameSv: 'Dragon Flag',
        sets: 3,
        reps: 6,
        restSeconds: 60,
        notes: 'Kontrollerad excentrisk fas. Kroppen rak. Avancerad bålövning.',
        section: 'CORE',
      },
      {
        exerciseName: 'Farmer Walk (Heavy)',
        exerciseNameSv: 'Tung bondpromenad',
        sets: 3,
        reps: '40m',
        restSeconds: 90,
        notes: '50%+ kroppsvikt per hand. Upprät hållning. Greppstyrka.',
        section: 'CORE',
      },
      // Cooldown
      {
        exerciseName: 'Thoracic Spine Rotation',
        exerciseNameSv: 'Bröstryggsrotation',
        sets: 1,
        reps: '8 per sida',
        restSeconds: 0,
        notes: 'Sidoliggande. Öppna bröstryggen efter tunga pressrörelser.',
        section: 'COOLDOWN',
      },
      {
        exerciseName: 'Deep Squat Hold',
        exerciseNameSv: 'Djup knäböjshåll',
        sets: 1,
        reps: '60 sek',
        restSeconds: 0,
        notes: 'Håll i botten av knäböj. Öppna höfter och anklar.',
        section: 'COOLDOWN',
      },
    ],
    coachNotes:
      'Makrocykel: 4 veckor ackumulation (höga reps), 3 veckor intensifiering (vågbelastning/kluster), 1 vecka realisering (maxtest), 1 vecka deload. Anpassa tillbehörsval baserat på individuella svagheter. Övervaka belastning/sömn/näringsintag noggrant.',
  },
]

export default STRENGTH_BASE_TEMPLATES
