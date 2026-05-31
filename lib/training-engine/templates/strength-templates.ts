/**
 * System Strength Templates
 *
 * Pre-built strength training templates for self-service athletes and quick coach setup.
 * These templates are optimized for runners and endurance athletes.
 */

import type { StrengthPhase } from '@prisma/client'

export interface TemplateExercise {
  exerciseName: string
  exerciseNameSv: string
  sets: number
  reps: number | string
  restSeconds: number
  tempo?: string
  notes?: string
  notesSv?: string
  section: 'WARMUP' | 'MAIN' | 'CORE' | 'COOLDOWN'
}

export interface StrengthTemplate {
  id: string
  name: string
  nameSv: string
  description: string
  descriptionSv: string
  category: 'RUNNER' | 'BEGINNER' | 'MARATHON' | 'INJURY_PREVENTION' | 'POWER' | 'MAINTENANCE' | 'HALF_MARATHON' | 'STRENGTH_BASE'
  phase: StrengthPhase
  sessionsPerWeek: 1 | 2 | 3
  estimatedDuration: number // minutes
  athleteLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE'
  equipmentRequired: string[]
  equipmentRequiredSv?: string[]
  includesWarmup: boolean
  includesCore: boolean
  includesCooldown: boolean
  exercises: TemplateExercise[]
  coachNotes?: string
  coachNotesSv?: string
  tags: string[]
  tagsSv?: string[]
}

/**
 * Pre-built strength templates
 */
export const STRENGTH_TEMPLATES: StrengthTemplate[] = [
  // ============================================
  // BEGINNER RUNNER (2x/week)
  // ============================================
  {
    id: 'beginner-runner-2x',
    name: 'Beginner Runner Strength',
    nameSv: 'Nybörjare Löpstyrka',
    description: 'Perfect introduction to strength training for new runners. Focuses on fundamental movement patterns and injury prevention.',
    descriptionSv: 'Perfekt introduktion till styrketräning för nya löpare. Fokus på grundläggande rörelsemönster och skadeprevention.',
    category: 'BEGINNER',
    phase: 'ANATOMICAL_ADAPTATION',
    sessionsPerWeek: 2,
    estimatedDuration: 35,
    athleteLevel: 'BEGINNER',
    equipmentRequired: ['Exercise mat'],
    equipmentRequiredSv: ['Träningsmatta'],
    includesWarmup: true,
    includesCore: true,
    includesCooldown: true,
    tags: ['beginner', 'runner', 'bodyweight'],
    tagsSv: ['nybörjare', 'löpare', 'kroppsvikt'],
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
        exerciseName: 'Bodyweight Squats',
        exerciseNameSv: 'Knäböj utan vikt',
        sets: 2,
        reps: 10,
        restSeconds: 30,
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
      // Main
      {
        exerciseName: 'Goblet Squat',
        exerciseNameSv: 'Goblet Squat',
        sets: 3,
        reps: 12,
        restSeconds: 60,
        tempo: '2-0-2-0',
        notes: 'Bodyweight or light load. Focus on depth and technique.',
        notesSv: 'Kroppsvikt eller lätt vikt. Fokus på djup och teknik.',
        section: 'MAIN',
      },
      {
        exerciseName: 'Romanian Deadlift',
        exerciseNameSv: 'RDL',
        sets: 3,
        reps: 10,
        restSeconds: 60,
        tempo: '3-0-1-0',
        notes: 'Bodyweight or dumbbells. Feel the stretch in the hamstrings.',
        notesSv: 'Kroppsvikt eller hantlar. Känn stretch i hamstrings.',
        section: 'MAIN',
      },
      {
        exerciseName: 'Reverse Lunges',
        exerciseNameSv: 'Bakåtutfall',
        sets: 2,
        reps: '10 per ben',
        restSeconds: 45,
        section: 'MAIN',
      },
      {
        exerciseName: 'Calf Raises',
        exerciseNameSv: 'Tåhävningar',
        sets: 2,
        reps: 15,
        restSeconds: 30,
        notes: 'Slow, controlled movement.',
        notesSv: 'Långsam kontrollerad rörelse',
        section: 'MAIN',
      },
      // Core
      {
        exerciseName: 'Dead Bug',
        exerciseNameSv: 'Dead Bug',
        sets: 2,
        reps: '8 per sida',
        restSeconds: 30,
        notes: 'Press the lower back toward the floor.',
        notesSv: 'Tryck nedre ryggen mot golvet',
        section: 'CORE',
      },
      {
        exerciseName: 'Plank',
        exerciseNameSv: 'Plankan',
        sets: 2,
        reps: '30 sek',
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
        exerciseName: 'Hamstring Stretch',
        exerciseNameSv: 'Hamstringstretch',
        sets: 1,
        reps: '45 sek per sida',
        restSeconds: 0,
        section: 'COOLDOWN',
      },
    ],
    coachNotes: 'Prioritize technique over load. Increase reps first (up to 15), then add light resistance.',
    coachNotesSv: 'Fokusera på teknik framför vikt. Öka reps först (till 15), sedan lägg till lätt belastning.',
  },

  // ============================================
  // MARATHON PREP STRENGTH
  // ============================================
  {
    id: 'marathon-prep-strength',
    name: 'Marathon Prep Strength',
    nameSv: 'Maratonförberedande Styrka',
    description: 'Strength program designed for marathon training. Emphasizes injury prevention, running economy, and muscular endurance.',
    descriptionSv: 'Styrkeprogram designat för maratonträning. Fokus på skadeprevention, löpekonomi och muskulär uthållighet.',
    category: 'MARATHON',
    phase: 'MAINTENANCE',
    sessionsPerWeek: 2,
    estimatedDuration: 40,
    athleteLevel: 'INTERMEDIATE',
    equipmentRequired: ['Dumbbells', 'Exercise mat'],
    equipmentRequiredSv: ['Hantlar', 'Träningsmatta'],
    includesWarmup: true,
    includesCore: true,
    includesCooldown: true,
    tags: ['marathon', 'runner', 'maintenance', 'endurance'],
    tagsSv: ['maraton', 'löpare', 'underhåll', 'uthållighet'],
    exercises: [
      // Warmup
      {
        exerciseName: 'Leg Swings',
        exerciseNameSv: 'Benpendel',
        sets: 1,
        reps: '10 per ben',
        restSeconds: 0,
        section: 'WARMUP',
      },
      {
        exerciseName: 'Walking Lunges',
        exerciseNameSv: 'Gående utfall',
        sets: 1,
        reps: '8 per ben',
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
      // Main
      {
        exerciseName: 'Bulgarian Split Squat',
        exerciseNameSv: 'Bulgariska Split Squats',
        sets: 3,
        reps: '8 per ben',
        restSeconds: 90,
        tempo: '3-0-1-0',
        notes: 'Hold dumbbells at your sides. Keep the movement controlled.',
        notesSv: 'Hantlar i händerna. Kontrollerad rörelse.',
        section: 'MAIN',
      },
      {
        exerciseName: 'Romanian Deadlift',
        exerciseNameSv: 'RDL',
        sets: 3,
        reps: 8,
        restSeconds: 90,
        tempo: '3-1-1-0',
        notes: 'Use dumbbells. Strong hamstring activation.',
        notesSv: 'Hantlar. Stark hamstring-aktivering.',
        section: 'MAIN',
      },
      {
        exerciseName: 'Step-ups',
        exerciseNameSv: 'Step-ups',
        sets: 2,
        reps: '10 per ben',
        restSeconds: 60,
        notes: 'Use a high bench or box. Focus on driving upward.',
        notesSv: 'Hög bänk/låda. Fokus på framdrivning.',
        section: 'MAIN',
      },
      {
        exerciseName: 'Single Leg Calf Raise',
        exerciseNameSv: 'Enbens Tåhävning',
        sets: 3,
        reps: '12 per ben',
        restSeconds: 45,
        tempo: '2-1-2-1',
        notes: 'Full stretch at the bottom.',
        notesSv: 'Fullständig stretch i botten',
        section: 'MAIN',
      },
      // Core
      {
        exerciseName: 'Side Plank',
        exerciseNameSv: 'Sidoplanka',
        sets: 2,
        reps: '30 sek per sida',
        restSeconds: 30,
        section: 'CORE',
      },
      {
        exerciseName: 'Bird Dog',
        exerciseNameSv: 'Bird Dog',
        sets: 2,
        reps: '8 per sida',
        restSeconds: 30,
        notes: 'Controlled movement with a stable pelvis.',
        notesSv: 'Kontrollerad, stabilt bäcken',
        section: 'CORE',
      },
      {
        exerciseName: 'Pallof Press',
        exerciseNameSv: 'Pallof Press',
        sets: 2,
        reps: '10 per sida',
        restSeconds: 30,
        notes: 'Use a resistance band. Anti-rotation focus.',
        notesSv: 'Motståndsband. Anti-rotation.',
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
        exerciseName: 'Quad Stretch',
        exerciseNameSv: 'Quadstretch',
        sets: 1,
        reps: '45 sek per sida',
        restSeconds: 0,
        section: 'COOLDOWN',
      },
    ],
    coachNotes: 'Schedule this session 48+ hours before quality runs. Focus on control, not max load.',
    coachNotesSv: 'Kör detta pass 48+ timmar före kvalitetspass. Fokus på kontroll, inte maxvikt.',
  },

  // ============================================
  // INJURY PREVENTION ESSENTIALS
  // ============================================
  {
    id: 'injury-prevention-essentials',
    name: 'Injury Prevention Essentials',
    nameSv: 'Skadeförebyggande Essentials',
    description: 'Targeted exercises to prevent common running injuries. Focus on hip stability, hamstrings, and ankle strength.',
    descriptionSv: 'Målinriktade övningar för att förebygga vanliga löpskador. Fokus på höftstabilitet, hamstrings och ankelstyrka.',
    category: 'INJURY_PREVENTION',
    phase: 'ANATOMICAL_ADAPTATION',
    sessionsPerWeek: 3,
    estimatedDuration: 25,
    athleteLevel: 'BEGINNER',
    equipmentRequired: ['Exercise mat', 'Resistance band'],
    equipmentRequiredSv: ['Träningsmatta', 'Motståndsband'],
    includesWarmup: false,
    includesCore: true,
    includesCooldown: false,
    tags: ['injury prevention', 'hip', 'hamstrings', 'ankle'],
    tagsSv: ['skadeprevention', 'höft', 'hamstrings', 'ankel'],
    exercises: [
      // Main (focused on injury prevention)
      {
        exerciseName: 'Clamshells',
        exerciseNameSv: 'Musslor',
        sets: 2,
        reps: '15 per sida',
        restSeconds: 30,
        notes: 'Resistance band around the knees. Activate the gluteus medius.',
        notesSv: 'Motståndsband runt knäna. Aktiverar gluteus medius.',
        section: 'MAIN',
      },
      {
        exerciseName: 'Single Leg Glute Bridge',
        exerciseNameSv: 'Enbens Glutebrygga',
        sets: 3,
        reps: '10 per ben',
        restSeconds: 45,
        notes: 'Keep the pelvis stable.',
        notesSv: 'Håll bäckenet stabilt',
        section: 'MAIN',
      },
      {
        exerciseName: 'Nordic Hamstring Curl',
        exerciseNameSv: 'Nordic Hamstring',
        sets: 3,
        reps: '5-8',
        restSeconds: 60,
        notes: 'Controlled eccentric phase. Use your hands for assistance if needed.',
        notesSv: 'Kontrollerad excentrisk. Använd händerna för assistans om behövs.',
        section: 'MAIN',
      },
      {
        exerciseName: 'Eccentric Calf Raises',
        exerciseNameSv: 'Excentriska Tåhävningar',
        sets: 3,
        reps: '10 per ben',
        restSeconds: 45,
        tempo: '1-0-3-1',
        notes: 'Slow lowering phase (3 seconds). Helps prevent Achilles issues.',
        notesSv: 'Långsam nedgång (3 sek). Förebygger hälseneproblem.',
        section: 'MAIN',
      },
      {
        exerciseName: 'Copenhagen Adductor',
        exerciseNameSv: 'Copenhagen Adduktor',
        sets: 2,
        reps: '8 per sida',
        restSeconds: 45,
        notes: 'Side-lying position. Strengthens the groin.',
        notesSv: 'Sidoliggande. Stärker ljumskar.',
        section: 'MAIN',
      },
      // Core
      {
        exerciseName: 'Dead Bug',
        exerciseNameSv: 'Dead Bug',
        sets: 2,
        reps: '10 per sida',
        restSeconds: 30,
        section: 'CORE',
      },
      {
        exerciseName: 'Side Plank with Hip Dip',
        exerciseNameSv: 'Sidoplanka med Höftsänkning',
        sets: 2,
        reps: '10 per sida',
        restSeconds: 30,
        section: 'CORE',
      },
    ],
    coachNotes: 'Can be used as a quick session before running or as a standalone session. Prioritize Nordic Hamstring and Copenhagen plank.',
    coachNotesSv: 'Kan köras som snabbpass före löpning eller som separat pass. Prioritera Nordic Hamstring och Copenhagen.',
  },

  // ============================================
  // POWER DEVELOPMENT
  // ============================================
  {
    id: 'power-development',
    name: 'Power Development',
    nameSv: 'Kraftutveckling',
    description: 'Explosive power training for experienced runners. Includes plyometrics and dynamic strength exercises.',
    descriptionSv: 'Explosiv kraftträning för erfarna löpare. Inkluderar plyometri och dynamiska styrkeövningar.',
    category: 'POWER',
    phase: 'POWER',
    sessionsPerWeek: 2,
    estimatedDuration: 45,
    athleteLevel: 'ADVANCED',
    equipmentRequired: ['Plyo box', 'Barbell', 'Exercise mat'],
    equipmentRequiredSv: ['Plyo-låda', 'Skivstång', 'Träningsmatta'],
    includesWarmup: true,
    includesCore: true,
    includesCooldown: true,
    tags: ['power', 'plyometrics', 'explosiveness', 'advanced'],
    tagsSv: ['kraft', 'plyometri', 'explosivitet', 'avancerad'],
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
        reps: '15m',
        restSeconds: 30,
        section: 'WARMUP',
      },
      {
        exerciseName: 'Pogos',
        exerciseNameSv: 'Pogos',
        sets: 2,
        reps: 20,
        restSeconds: 30,
        notes: 'Quick ground contact with stiff ankles.',
        notesSv: 'Snabb kontakt, stela anklar',
        section: 'WARMUP',
      },
      // Main
      {
        exerciseName: 'Box Jumps',
        exerciseNameSv: 'Lådhopp',
        sets: 4,
        reps: 5,
        restSeconds: 120,
        notes: 'Maximum explosiveness. Step down from the box, do not jump down.',
        notesSv: 'Max explosion. Kliv ner, hoppa inte.',
        section: 'MAIN',
      },
      {
        exerciseName: 'Jump Squats',
        exerciseNameSv: 'Hoppknäböj',
        sets: 3,
        reps: 6,
        restSeconds: 90,
        notes: 'Bodyweight or light load. Maximum height.',
        notesSv: 'Kroppsvikt eller lätt belastning. Max höjd.',
        section: 'MAIN',
      },
      {
        exerciseName: 'Power Step-ups',
        exerciseNameSv: 'Explosiva Step-ups',
        sets: 3,
        reps: '6 per ben',
        restSeconds: 90,
        notes: 'Use a high box. Explosive upward drive.',
        notesSv: 'Hög låda. Explosiv uppgång.',
        section: 'MAIN',
      },
      {
        exerciseName: 'Single Leg Bounds',
        exerciseNameSv: 'Enbenshopp',
        sets: 3,
        reps: '5 per ben',
        restSeconds: 90,
        notes: 'Maximum distance. Land with control.',
        notesSv: 'Max längd. Landning med kontroll.',
        section: 'MAIN',
      },
      // Core
      {
        exerciseName: 'Medicine Ball Slam',
        exerciseNameSv: 'Medicinbollskast',
        sets: 3,
        reps: 8,
        restSeconds: 45,
        notes: 'Full power on every throw.',
        notesSv: 'Full kraft i varje kast',
        section: 'CORE',
      },
      {
        exerciseName: 'Russian Twist',
        exerciseNameSv: 'Rysk Twist',
        sets: 2,
        reps: '12 per sida',
        restSeconds: 30,
        notes: 'Use a medicine ball if available.',
        notesSv: 'Med medicinboll om tillgänglig',
        section: 'CORE',
      },
      // Cooldown
      {
        exerciseName: 'Hip Flexor Stretch',
        exerciseNameSv: 'Höftböjarstretch',
        sets: 1,
        reps: '60 sek per sida',
        restSeconds: 0,
        section: 'COOLDOWN',
      },
      {
        exerciseName: 'Calf Stretch',
        exerciseNameSv: 'Vadstretch',
        sets: 1,
        reps: '45 sek per sida',
        restSeconds: 0,
        section: 'COOLDOWN',
      },
    ],
    coachNotes: 'Do NOT schedule this session the day before or after hard running sessions. Keep at least 48 hours between them.',
    coachNotesSv: 'Kör INTE detta pass dagen före eller efter hårda löppass. Minst 48 timmars vila mellan.',
  },

  // ============================================
  // MAINTENANCE (1x/week)
  // ============================================
  {
    id: 'maintenance-1x-week',
    name: 'Maintenance 1x/Week',
    nameSv: 'Underhåll 1x/vecka',
    description: 'Minimal effective dose for maintaining strength during race season. One session per week.',
    descriptionSv: 'Minimal effektiv dos för att bibehålla styrka under tävlingssäsong. En session per vecka.',
    category: 'MAINTENANCE',
    phase: 'MAINTENANCE',
    sessionsPerWeek: 1,
    estimatedDuration: 30,
    athleteLevel: 'INTERMEDIATE',
    equipmentRequired: ['Dumbbells', 'Exercise mat'],
    equipmentRequiredSv: ['Hantlar', 'Träningsmatta'],
    includesWarmup: true,
    includesCore: true,
    includesCooldown: false,
    tags: ['maintenance', 'race season', 'minimal'],
    tagsSv: ['underhåll', 'tävlingssäsong', 'minimal'],
    exercises: [
      // Warmup (abbreviated)
      {
        exerciseName: 'Glute Bridges',
        exerciseNameSv: 'Glutebrygga',
        sets: 2,
        reps: 10,
        restSeconds: 30,
        section: 'WARMUP',
      },
      // Main (key movements only)
      {
        exerciseName: 'Goblet Squat',
        exerciseNameSv: 'Goblet Squat',
        sets: 2,
        reps: 5,
        restSeconds: 120,
        tempo: '2-0-1-0',
        notes: 'Moderately heavy load. Maintain strength.',
        notesSv: 'Moderat-tung vikt. Bibehåll styrka.',
        section: 'MAIN',
      },
      {
        exerciseName: 'Romanian Deadlift',
        exerciseNameSv: 'RDL',
        sets: 2,
        reps: 5,
        restSeconds: 120,
        tempo: '3-0-1-0',
        notes: 'Maintain the latest working load.',
        notesSv: 'Bibehåll senaste arbetsbelastning.',
        section: 'MAIN',
      },
      {
        exerciseName: 'Single Leg Calf Raise',
        exerciseNameSv: 'Enbens Tåhävning',
        sets: 2,
        reps: 10,
        restSeconds: 45,
        section: 'MAIN',
      },
      // Core
      {
        exerciseName: 'Plank',
        exerciseNameSv: 'Plankan',
        sets: 2,
        reps: '45 sek',
        restSeconds: 30,
        section: 'CORE',
      },
      {
        exerciseName: 'Side Plank',
        exerciseNameSv: 'Sidoplanka',
        sets: 1,
        reps: '30 sek per sida',
        restSeconds: 0,
        section: 'CORE',
      },
    ],
    coachNotes: 'Schedule this session at least 48 hours before a race or quality session. Focus on MAINTAINING, not increasing.',
    coachNotesSv: 'Kör detta pass minst 48 timmar före tävling eller kvalitetspass. Fokus på att BIBEHÅLLA, inte öka.',
  },
]

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: StrengthTemplate['category']): StrengthTemplate[] {
  return STRENGTH_TEMPLATES.filter((t) => t.category === category)
}

/**
 * Get templates by athlete level
 */
export function getTemplatesForLevel(level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE'): StrengthTemplate[] {
  const levelOrder = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ELITE']
  const levelIndex = levelOrder.indexOf(level)

  return STRENGTH_TEMPLATES.filter((t) => {
    const templateLevelIndex = levelOrder.indexOf(t.athleteLevel)
    return templateLevelIndex <= levelIndex
  })
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): StrengthTemplate | undefined {
  return STRENGTH_TEMPLATES.find((t) => t.id === id)
}

/**
 * Search templates by tags
 */
export function searchTemplates(query: string): StrengthTemplate[] {
  const lowerQuery = query.toLowerCase()
  return STRENGTH_TEMPLATES.filter(
    (t) =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.nameSv.toLowerCase().includes(lowerQuery) ||
      t.tags.some((tag) => tag.includes(lowerQuery)) ||
      t.tagsSv?.some((tag) => tag.includes(lowerQuery)) ||
      t.description.toLowerCase().includes(lowerQuery)
  )
}

export default STRENGTH_TEMPLATES
