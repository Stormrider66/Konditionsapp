/**
 * Half-Marathon Strength Templates
 *
 * Pre-built strength training templates optimized for half-marathon runners.
 * Focuses on hip stability, single-leg strength, calf/achilles resilience,
 * and core stability for maintaining running form over 21.1 km.
 *
 * Templates are organized by athlete level:
 * - BEGINNER: Bodyweight foundation for first-time half-marathon runners
 * - INTERMEDIATE: Loaded single-leg work for sub-1:45 aspirants
 * - ADVANCED: Heavy strength + plyometric elements for competitive runners
 */

import type { StrengthTemplate, TemplateExercise } from '@/lib/training-engine/templates/strength-templates'

/**
 * Half-marathon strength templates
 */
export const HALF_MARATHON_TEMPLATES: StrengthTemplate[] = [
  // ============================================
  // BEGINNER HALF-MARATHON (2x/week)
  // ============================================
  {
    id: 'hm-beginner-2x',
    name: 'Beginner Half-Marathon Strength',
    nameSv: 'Nybörjare Halvmaraton Styrka',
    description:
      'Foundation strength program for first-time half-marathon runners. Builds hip stability, calf endurance, and core control with minimal equipment.',
    descriptionSv:
      'Grundläggande styrkeprogram för förstagångs halvmaratonlöpare. Bygger höftstabilitet, vaduthållighet och bålkontroll med minimal utrustning.',
    category: 'HALF_MARATHON',
    phase: 'ANATOMICAL_ADAPTATION',
    sessionsPerWeek: 2,
    estimatedDuration: 35,
    athleteLevel: 'BEGINNER',
    equipmentRequired: ['Träningsmatta', 'Motståndsband'],
    includesWarmup: true,
    includesCore: true,
    includesCooldown: true,
    tags: ['halvmaraton', 'nybörjare', 'höftstabilitet', 'löpare'],
    exercises: [
      // Warmup
      {
        exerciseName: 'Hip Circles',
        exerciseNameSv: 'Höftcirklar',
        sets: 1,
        reps: '10 per håll',
        restSeconds: 0,
        section: 'WARMUP',
      },
      {
        exerciseName: 'Glute Bridges',
        exerciseNameSv: 'Glutebrygga',
        sets: 2,
        reps: 12,
        restSeconds: 30,
        section: 'WARMUP',
      },
      {
        exerciseName: 'Lateral Band Walks',
        exerciseNameSv: 'Sidogång med band',
        sets: 2,
        reps: '10 per riktning',
        restSeconds: 30,
        notes: 'Motståndsband runt anklarna. Håll spänning genom hela rörelsen.',
        section: 'WARMUP',
      },
      // Main
      {
        exerciseName: 'Bodyweight Single Leg Squat to Box',
        exerciseNameSv: 'Enbens knäböj till låda',
        sets: 3,
        reps: '8 per ben',
        restSeconds: 60,
        tempo: '2-1-1-0',
        notes: 'Använd bänk/stol som stöd. Håll knäet i linje med tårna.',
        section: 'MAIN',
      },
      {
        exerciseName: 'Romanian Deadlift (Single Leg)',
        exerciseNameSv: 'Enbens RDL',
        sets: 3,
        reps: '8 per ben',
        restSeconds: 60,
        tempo: '3-0-1-0',
        notes: 'Kroppsvikt. Fokus på balans och hamstring-stretch.',
        section: 'MAIN',
      },
      {
        exerciseName: 'Clamshells',
        exerciseNameSv: 'Musslor',
        sets: 2,
        reps: '15 per sida',
        restSeconds: 30,
        notes: 'Motståndsband runt knäna. Aktiverar gluteus medius.',
        section: 'MAIN',
      },
      {
        exerciseName: 'Calf Raises (Double Leg)',
        exerciseNameSv: 'Tåhävningar (dubbla ben)',
        sets: 3,
        reps: 15,
        restSeconds: 30,
        tempo: '2-1-2-0',
        notes: 'Kontrollerad rörelse. Full stretch i botten.',
        section: 'MAIN',
      },
      // Core
      {
        exerciseName: 'Dead Bug',
        exerciseNameSv: 'Dead Bug',
        sets: 2,
        reps: '8 per sida',
        restSeconds: 30,
        notes: 'Tryck nedre ryggen mot golvet. Kontrollera andning.',
        section: 'CORE',
      },
      {
        exerciseName: 'Side Plank',
        exerciseNameSv: 'Sidoplanka',
        sets: 2,
        reps: '20 sek per sida',
        restSeconds: 30,
        section: 'CORE',
      },
      // Cooldown
      {
        exerciseName: 'Hip Flexor Stretch',
        exerciseNameSv: 'Höftböjarstretch',
        sets: 1,
        reps: '45 sek per sida',
        restSeconds: 0,
        section: 'COOLDOWN',
      },
      {
        exerciseName: 'Calf Stretch (Wall)',
        exerciseNameSv: 'Vadstretch (vägg)',
        sets: 1,
        reps: '45 sek per sida',
        restSeconds: 0,
        section: 'COOLDOWN',
      },
    ],
    coachNotes:
      'Kör passet 48+ timmar före långa löppass. Fokusera på stabilitet och teknik. Öka reps till 12 innan extern belastning läggs till.',
  },

  // ============================================
  // INTERMEDIATE HALF-MARATHON (2x/week)
  // ============================================
  {
    id: 'hm-intermediate-2x',
    name: 'Intermediate Half-Marathon Strength',
    nameSv: 'Medel Halvmaraton Styrka',
    description:
      'Loaded single-leg strength program for experienced half-marathon runners targeting sub-1:45. Emphasizes running economy through hip and calf power.',
    descriptionSv:
      'Belastat enbens styrkeprogram för erfarna halvmaratonlöpare som siktar under 1:45. Fokus på löpekonomi genom höft- och vadkraft.',
    category: 'HALF_MARATHON',
    phase: 'MAXIMUM_STRENGTH',
    sessionsPerWeek: 2,
    estimatedDuration: 45,
    athleteLevel: 'INTERMEDIATE',
    equipmentRequired: ['Hantlar', 'Träningsmatta', 'Motståndsband', 'Bänk/låda'],
    includesWarmup: true,
    includesCore: true,
    includesCooldown: true,
    tags: ['halvmaraton', 'medel', 'enbens', 'löpekonomi'],
    exercises: [
      // Warmup
      {
        exerciseName: 'Leg Swings (Front-Back + Side)',
        exerciseNameSv: 'Benpendlar (fram-bak + sida)',
        sets: 1,
        reps: '10 per ben per riktning',
        restSeconds: 0,
        section: 'WARMUP',
      },
      {
        exerciseName: 'Single Leg Glute Bridge',
        exerciseNameSv: 'Enbens Glutebrygga',
        sets: 2,
        reps: '8 per ben',
        restSeconds: 30,
        section: 'WARMUP',
      },
      {
        exerciseName: 'A-Skips',
        exerciseNameSv: 'A-hopp',
        sets: 2,
        reps: '15m',
        restSeconds: 30,
        notes: 'Kontrollerad knälyft med snabb markkontakt.',
        section: 'WARMUP',
      },
      // Main
      {
        exerciseName: 'Bulgarian Split Squat',
        exerciseNameSv: 'Bulgariska Split Squats',
        sets: 3,
        reps: '8 per ben',
        restSeconds: 90,
        tempo: '3-0-1-0',
        notes: 'Hantlar i händerna. Fokus på kontrollerad excentrisk fas.',
        section: 'MAIN',
      },
      {
        exerciseName: 'Single Leg Romanian Deadlift',
        exerciseNameSv: 'Enbens RDL',
        sets: 3,
        reps: '8 per ben',
        restSeconds: 90,
        tempo: '3-1-1-0',
        notes: 'Hantel i motstående hand. Stark hamstring-aktivering.',
        section: 'MAIN',
      },
      {
        exerciseName: 'Step-ups (High Box)',
        exerciseNameSv: 'Step-ups (hög låda)',
        sets: 3,
        reps: '8 per ben',
        restSeconds: 60,
        notes: 'Lådan i höfthöjd. Tryck igenom hela foten.',
        section: 'MAIN',
      },
      {
        exerciseName: 'Single Leg Calf Raise',
        exerciseNameSv: 'Enbens Tåhävning',
        sets: 3,
        reps: '12 per ben',
        restSeconds: 45,
        tempo: '2-1-2-1',
        notes: 'Med hantel. Full stretch i botten, full kontraktion i toppen.',
        section: 'MAIN',
      },
      {
        exerciseName: 'Banded Side-Lying Hip Abduction',
        exerciseNameSv: 'Höftabduktion sidoliggande med band',
        sets: 2,
        reps: '12 per sida',
        restSeconds: 30,
        notes: 'Motståndsband ovanför knäna. Kontrollerad rörelse.',
        section: 'MAIN',
      },
      // Core
      {
        exerciseName: 'Pallof Press',
        exerciseNameSv: 'Pallof Press',
        sets: 2,
        reps: '10 per sida',
        restSeconds: 30,
        notes: 'Motståndsband. Anti-rotationsstabilitet.',
        section: 'CORE',
      },
      {
        exerciseName: 'Bird Dog',
        exerciseNameSv: 'Bird Dog',
        sets: 2,
        reps: '8 per sida',
        restSeconds: 30,
        notes: 'Håll bäckenet stabilt. Kontrollerad förlängning.',
        section: 'CORE',
      },
      {
        exerciseName: 'Side Plank with Hip Dip',
        exerciseNameSv: 'Sidoplanka med höftsänkning',
        sets: 2,
        reps: '10 per sida',
        restSeconds: 30,
        section: 'CORE',
      },
      // Cooldown
      {
        exerciseName: 'Pigeon Stretch',
        exerciseNameSv: 'Duvstretch',
        sets: 1,
        reps: '60 sek per sida',
        restSeconds: 0,
        section: 'COOLDOWN',
      },
      {
        exerciseName: 'Soleus Stretch (Wall)',
        exerciseNameSv: 'Soleusstretch (vägg)',
        sets: 1,
        reps: '45 sek per sida',
        restSeconds: 0,
        notes: 'Böjt knä mot väggen. Stretchar djupa vadmuskeln.',
        section: 'COOLDOWN',
      },
    ],
    coachNotes:
      'Kör minst 48 timmar före kvalitetspass. Progridera belastning i split squats och RDL var 2-3:e vecka. Behåll tempo genom hela rörelseomfånget.',
  },

  // ============================================
  // ADVANCED HALF-MARATHON (2-3x/week)
  // ============================================
  {
    id: 'hm-advanced-3x',
    name: 'Advanced Half-Marathon Strength',
    nameSv: 'Avancerad Halvmaraton Styrka',
    description:
      'High-level strength program for competitive half-marathon runners. Combines heavy single-leg strength with reactive plyometric elements for maximal running economy.',
    descriptionSv:
      'Styrkeprogram på hög nivå för tävlingsinriktade halvmaratonlöpare. Kombinerar tung enbensstyrka med reaktiv plyometri för maximal löpekonomi.',
    category: 'HALF_MARATHON',
    phase: 'MAXIMUM_STRENGTH',
    sessionsPerWeek: 3,
    estimatedDuration: 50,
    athleteLevel: 'ADVANCED',
    equipmentRequired: ['Skivstång', 'Hantlar', 'Plyo-låda', 'Träningsmatta'],
    includesWarmup: true,
    includesCore: true,
    includesCooldown: true,
    tags: ['halvmaraton', 'avancerad', 'tung styrka', 'plyometri', 'löpekonomi'],
    exercises: [
      // Warmup
      {
        exerciseName: 'Dynamic Leg Swings',
        exerciseNameSv: 'Dynamiska Benpendlar',
        sets: 1,
        reps: '10 per ben',
        restSeconds: 0,
        section: 'WARMUP',
      },
      {
        exerciseName: 'A-Skips',
        exerciseNameSv: 'A-hopp',
        sets: 2,
        reps: '20m',
        restSeconds: 30,
        section: 'WARMUP',
      },
      {
        exerciseName: 'Pogos',
        exerciseNameSv: 'Pogos',
        sets: 2,
        reps: 20,
        restSeconds: 30,
        notes: 'Snabb markkontakt. Stela anklar.',
        section: 'WARMUP',
      },
      // Main
      {
        exerciseName: 'Back Squat',
        exerciseNameSv: 'Knäböj med skivstång',
        sets: 4,
        reps: 5,
        restSeconds: 120,
        tempo: '2-0-1-0',
        notes: 'Tung belastning (80-85% 1RM). Full djup.',
        section: 'MAIN',
      },
      {
        exerciseName: 'Single Leg Romanian Deadlift',
        exerciseNameSv: 'Enbens RDL',
        sets: 3,
        reps: '6 per ben',
        restSeconds: 90,
        tempo: '3-1-1-0',
        notes: 'Hantel eller kettlebell. Tung belastning.',
        section: 'MAIN',
      },
      {
        exerciseName: 'Drop Lunge to Single Leg Hop',
        exerciseNameSv: 'Utfallshopp till enbenshopp',
        sets: 3,
        reps: '5 per ben',
        restSeconds: 90,
        notes: 'Bakåtutfall direkt till explosivt hopp. Kontrollerad landning.',
        section: 'MAIN',
      },
      {
        exerciseName: 'Single Leg Calf Raise (Weighted)',
        exerciseNameSv: 'Enbens Tåhävning (belastad)',
        sets: 3,
        reps: '10 per ben',
        restSeconds: 60,
        tempo: '2-1-3-1',
        notes: 'Hantel i handen. Lång excentrisk fas (3 sek) for senstyrka.',
        section: 'MAIN',
      },
      {
        exerciseName: 'Copenhagen Adductor',
        exerciseNameSv: 'Copenhagen Adduktor',
        sets: 2,
        reps: '8 per sida',
        restSeconds: 45,
        notes: 'Sidoliggande. Stärker adduktorer och förebygger ljumskskador.',
        section: 'MAIN',
      },
      // Core
      {
        exerciseName: 'Anti-Rotation Press (Cable/Band)',
        exerciseNameSv: 'Anti-rotationspress (kabel/band)',
        sets: 3,
        reps: '10 per sida',
        restSeconds: 30,
        notes: 'Stark bålspänning. Simulerar rotationskrafter vid löpning.',
        section: 'CORE',
      },
      {
        exerciseName: 'Hanging Knee Raise',
        exerciseNameSv: 'Hängande knälyft',
        sets: 3,
        reps: 10,
        restSeconds: 30,
        notes: 'Kontrollerad rörelse utan svaj.',
        section: 'CORE',
      },
      // Cooldown
      {
        exerciseName: 'Hip Flexor Stretch (Couch Stretch)',
        exerciseNameSv: 'Höftböjarstretch (soffstretch)',
        sets: 1,
        reps: '60 sek per sida',
        restSeconds: 0,
        section: 'COOLDOWN',
      },
      {
        exerciseName: 'Hamstring Stretch (Elevated)',
        exerciseNameSv: 'Hamstringstretch (förhöjd)',
        sets: 1,
        reps: '45 sek per sida',
        restSeconds: 0,
        section: 'COOLDOWN',
      },
    ],
    coachNotes:
      'Kör session A (tung) tidigt i veckan, session B (reaktiv) mitt i veckan, och session C (underhåll) sent. Aldrig tungt styrkepass samma dag som intervaller.',
  },
]

export default HALF_MARATHON_TEMPLATES
