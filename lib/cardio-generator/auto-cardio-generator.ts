/**
 * Auto Cardio Generator
 *
 * Generates cardio workout sessions based on training goals, methodology,
 * and athlete parameters. Follows scientific training principles.
 */

// Segment types for cardio workouts
type SegmentType = 'WARMUP' | 'COOLDOWN' | 'INTERVAL' | 'STEADY' | 'RECOVERY' | 'HILL' | 'DRILLS'

// Training methodology options
type Methodology = 'POLARIZED' | 'PYRAMIDAL' | 'THRESHOLD_FOCUSED' | 'VO2MAX_FOCUSED'

// Sport types
type Sport = 'RUNNING' | 'CYCLING' | 'SWIMMING' | 'SKIING'

type AppLocale = 'en' | 'sv'

// Training goal options
type TrainingGoal =
  | 'BASE_BUILDING'      // Build aerobic base (mostly Zone 2)
  | 'THRESHOLD_DEVELOPMENT' // Improve lactate threshold
  | 'VO2MAX_IMPROVEMENT' // Improve VO2max
  | 'SPEED_DEVELOPMENT'  // Speed work and economy
  | 'ENDURANCE'          // Long slow distance
  | 'RECOVERY'           // Active recovery
  | 'RACE_PREPARATION'   // Race-specific work

// Athlete experience level
type ExperienceLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE'

// Generated segment
export interface GeneratedSegment {
  type: SegmentType
  duration: number      // seconds
  distance?: number     // meters (optional)
  zone: number          // 1-5
  pace?: number         // sec/km (for running)
  power?: number        // watts (for cycling)
  notes: string
}

// Generation parameters
export interface CardioGenerationParams {
  sport: Sport
  goal: TrainingGoal
  methodology?: Methodology
  targetDuration: number         // Total workout duration in minutes
  experienceLevel: ExperienceLevel
  athleteZones?: {               // Optional personalized zones
    zone1?: { minPace?: number; maxPace?: number }
    zone2?: { minPace?: number; maxPace?: number }
    zone3?: { minPace?: number; maxPace?: number }
    zone4?: { minPace?: number; maxPace?: number }
    zone5?: { minPace?: number; maxPace?: number }
  }
  includeWarmup?: boolean
  includeCooldown?: boolean
  includeHills?: boolean
  includeDrills?: boolean
  locale?: AppLocale
}

// Generation result
export interface GeneratedCardioSession {
  name: string
  description: string
  sport: Sport
  segments: GeneratedSegment[]
  totalDuration: number          // seconds
  totalDistance?: number         // meters
  avgZone: number
  zoneDistribution: {
    zone1: number                // percentage
    zone2: number
    zone3: number
    zone4: number
    zone5: number
  }
  tags: string[]
}

/**
 * Zone distribution by methodology (percentages for zones 1-2, 3, 4-5)
 */
const METHODOLOGY_DISTRIBUTIONS: Record<Methodology, { low: number; moderate: number; high: number }> = {
  POLARIZED: { low: 80, moderate: 0, high: 20 },       // 80/0/20
  PYRAMIDAL: { low: 75, moderate: 15, high: 10 },     // 75/15/10
  THRESHOLD_FOCUSED: { low: 65, moderate: 25, high: 10 }, // Heavy threshold work
  VO2MAX_FOCUSED: { low: 70, moderate: 5, high: 25 }, // More VO2max intervals
}

/**
 * Goal-specific parameters
 */
const GOAL_PARAMS: Record<TrainingGoal, {
  methodology: Methodology
  primaryZone: number
  intervalStructure?: { work: number; rest: number; repeats: number }
  description: Record<AppLocale, string>
}> = {
  BASE_BUILDING: {
    methodology: 'PYRAMIDAL',
    primaryZone: 2,
    description: {
      en: 'Focus on aerobic base building in zone 2',
      sv: 'Fokus på aerob basbyggnad i zon 2',
    },
  },
  THRESHOLD_DEVELOPMENT: {
    methodology: 'THRESHOLD_FOCUSED',
    primaryZone: 4,
    intervalStructure: { work: 480, rest: 60, repeats: 4 }, // 4x8min
    description: {
      en: 'Develop lactate threshold through zone 4 work',
      sv: 'Utveckla mjölksyratröskeln genom zon 4-arbete',
    },
  },
  VO2MAX_IMPROVEMENT: {
    methodology: 'VO2MAX_FOCUSED',
    primaryZone: 5,
    intervalStructure: { work: 180, rest: 180, repeats: 5 }, // 5x3min
    description: {
      en: 'Improve VO2max through intense intervals',
      sv: 'Förbättra VO2max genom intensiva intervaller',
    },
  },
  SPEED_DEVELOPMENT: {
    methodology: 'POLARIZED',
    primaryZone: 5,
    intervalStructure: { work: 60, rest: 120, repeats: 8 }, // 8x1min
    description: {
      en: 'Develop speed and running economy',
      sv: 'Utveckla fart och löpekonomi',
    },
  },
  ENDURANCE: {
    methodology: 'POLARIZED',
    primaryZone: 2,
    description: {
      en: 'Build endurance through longer zone 2 sessions',
      sv: 'Bygg uthållighet genom längre pass i zon 2',
    },
  },
  RECOVERY: {
    methodology: 'PYRAMIDAL',
    primaryZone: 1,
    description: {
      en: 'Active recovery to support adaptation',
      sv: 'Aktiv återhämtning för att främja anpassning',
    },
  },
  RACE_PREPARATION: {
    methodology: 'PYRAMIDAL',
    primaryZone: 3,
    intervalStructure: { work: 300, rest: 90, repeats: 5 }, // 5x5min
    description: {
      en: 'Race-specific work close to competition pace',
      sv: 'Tävlingsspecifikt arbete nära tävlingstempo',
    },
  },
}

function getLocale(locale?: AppLocale): AppLocale {
  return locale === 'sv' ? 'sv' : 'en'
}

/**
 * Generate warmup segments based on sport and experience
 */
function generateWarmup(
  sport: Sport,
  experience: ExperienceLevel,
  includeDrills: boolean,
  locale: AppLocale
): GeneratedSegment[] {
  const warmupDuration = experience === 'BEGINNER' ? 300 : experience === 'INTERMEDIATE' ? 600 : 900
  const segments: GeneratedSegment[] = []

  // Initial easy warmup
  segments.push({
    type: 'WARMUP',
    duration: warmupDuration * 0.7,
    zone: 1,
    notes: locale === 'sv'
      ? sport === 'RUNNING' ? 'Lugn jogg, gradvis ökning' :
        sport === 'CYCLING' ? 'Lugnt tramp, 85-95 rpm' :
        sport === 'SWIMMING' ? 'Blandad sim, fokus på teknik' :
        'Lätt start, fokus på form'
      : sport === 'RUNNING' ? 'Easy jog, gradual build' :
        sport === 'CYCLING' ? 'Easy spin, 85-95 rpm' :
        sport === 'SWIMMING' ? 'Mixed swim, focus on technique' :
        'Easy start, focus on form',
  })

  // Add drills if requested
  if (includeDrills) {
    segments.push({
      type: 'DRILLS',
      duration: warmupDuration * 0.3,
      zone: 2,
      notes: locale === 'sv'
        ? sport === 'RUNNING' ? 'Dynamiska övningar, 3-4 stegringar' :
          sport === 'SWIMMING' ? 'Drill övningar: catch-up, fingertip drag' :
          'Teknikfokus'
        : sport === 'RUNNING' ? 'Dynamic drills, 3-4 strides' :
          sport === 'SWIMMING' ? 'Drills: catch-up, fingertip drag' :
          'Technique focus',
    })
  }

  return segments
}

/**
 * Generate cooldown segments
 */
function generateCooldown(sport: Sport, experience: ExperienceLevel, locale: AppLocale): GeneratedSegment[] {
  const cooldownDuration = experience === 'BEGINNER' ? 300 : 600

  return [{
    type: 'COOLDOWN',
    duration: cooldownDuration,
    zone: 1,
    notes: locale === 'sv'
      ? sport === 'RUNNING' ? 'Lugn jogg, gradvis sänkning' :
        sport === 'CYCLING' ? 'Lätt tramp, minska motstånd' :
        sport === 'SWIMMING' ? 'Lugn sim, valfritt simsätt' :
        'Mjuk avslutning, sänk pulsen'
      : sport === 'RUNNING' ? 'Easy jog, gradually ease down' :
        sport === 'CYCLING' ? 'Easy spin, reduce resistance' :
        sport === 'SWIMMING' ? 'Easy swim, stroke of choice' :
        'Smooth finish, lower heart rate',
  }]
}

/**
 * Generate interval segments based on structure
 */
function generateIntervals(
  structure: { work: number; rest: number; repeats: number },
  workZone: number,
  restZone: number,
  sport: Sport,
  locale: AppLocale
): GeneratedSegment[] {
  const segments: GeneratedSegment[] = []

  for (let i = 0; i < structure.repeats; i++) {
    // Work interval
    segments.push({
      type: 'INTERVAL',
      duration: structure.work,
      zone: workZone,
      notes: locale === 'sv'
        ? i === 0 ? `Intervall ${i + 1}: Etablera tempo` :
          i === structure.repeats - 1 ? `Intervall ${i + 1}: Sista! Ge allt!` :
          `Intervall ${i + 1}: Bibehåll intensitet`
        : i === 0 ? `Interval ${i + 1}: Settle into pace` :
          i === structure.repeats - 1 ? `Interval ${i + 1}: Last one. Give it everything.` :
          `Interval ${i + 1}: Hold intensity`,
    })

    // Recovery (except after last interval)
    if (i < structure.repeats - 1) {
      segments.push({
        type: 'RECOVERY',
        duration: structure.rest,
        zone: restZone,
        notes: locale === 'sv'
          ? sport === 'RUNNING' ? 'Lätt jogg, återhämta' :
            sport === 'CYCLING' ? 'Lätt tramp, sänk puls' :
            'Aktiv vila'
          : sport === 'RUNNING' ? 'Easy jog, recover' :
            sport === 'CYCLING' ? 'Easy spin, lower heart rate' :
            'Active recovery',
      })
    }
  }

  return segments
}

/**
 * Generate steady-state segments to fill remaining time
 */
function generateSteadyState(
  duration: number,
  zone: number,
  sport: Sport,
  isMain: boolean,
  locale: AppLocale
): GeneratedSegment {
  return {
    type: 'STEADY',
    duration,
    zone,
    notes: locale === 'sv'
      ? isMain
        ? (zone === 2 ? 'Håll konversationstempo, fokus på andning' :
          zone === 3 ? 'Måttlig ansträngning, kontrollerad' :
          zone === 4 ? 'Tröskeltempo, komfortabelt hårt' :
          'Jämnt tempo')
        : 'Mjuk övergång'
      : isMain
        ? (zone === 2 ? 'Hold conversation pace, focus on breathing' :
          zone === 3 ? 'Moderate effort, controlled' :
          zone === 4 ? 'Threshold pace, comfortably hard' :
          'Steady pace')
        : 'Smooth transition',
  }
}

/**
 * Generate hill segments
 */
function generateHills(
  experience: ExperienceLevel,
  sport: Sport,
  locale: AppLocale
): GeneratedSegment[] {
  if (sport !== 'RUNNING' && sport !== 'CYCLING') {
    return []
  }

  const repeats = experience === 'BEGINNER' ? 4 : experience === 'INTERMEDIATE' ? 6 : 8
  const hillDuration = experience === 'BEGINNER' ? 30 : experience === 'INTERMEDIATE' ? 45 : 60
  const segments: GeneratedSegment[] = []

  for (let i = 0; i < repeats; i++) {
    segments.push({
      type: 'HILL',
      duration: hillDuration,
      zone: 5,
      notes: locale === 'sv'
        ? i === 0 ? 'Uppför: kraftfullt men kontrollerat' :
          i === repeats - 1 ? 'Sista backen! Fokus på teknik' :
          'Uppför: lyft knäna högt'
        : i === 0 ? 'Uphill: powerful but controlled' :
          i === repeats - 1 ? 'Last hill. Focus on technique.' :
          'Uphill: drive the knees high',
    })

    if (i < repeats - 1) {
      segments.push({
        type: 'RECOVERY',
        duration: hillDuration * 2,
        zone: 1,
        notes: locale === 'sv' ? 'Jogg/gå ner' : 'Jog/walk down',
      })
    }
  }

  return segments
}

/**
 * Calculate zone distribution from segments
 */
function calculateZoneDistribution(segments: GeneratedSegment[]): {
  zone1: number
  zone2: number
  zone3: number
  zone4: number
  zone5: number
} {
  const totalDuration = segments.reduce((sum, s) => sum + s.duration, 0)
  const zoneDurations = { zone1: 0, zone2: 0, zone3: 0, zone4: 0, zone5: 0 }

  for (const segment of segments) {
    const key = `zone${segment.zone}` as keyof typeof zoneDurations
    zoneDurations[key] += segment.duration
  }

  return {
    zone1: Math.round((zoneDurations.zone1 / totalDuration) * 100),
    zone2: Math.round((zoneDurations.zone2 / totalDuration) * 100),
    zone3: Math.round((zoneDurations.zone3 / totalDuration) * 100),
    zone4: Math.round((zoneDurations.zone4 / totalDuration) * 100),
    zone5: Math.round((zoneDurations.zone5 / totalDuration) * 100),
  }
}

/**
 * Calculate average zone from segments
 */
function calculateAvgZone(segments: GeneratedSegment[]): number {
  const totalDuration = segments.reduce((sum, s) => sum + s.duration, 0)
  const weightedSum = segments.reduce((sum, s) => sum + s.zone * s.duration, 0)
  return Math.round((weightedSum / totalDuration) * 10) / 10
}

/**
 * Generate workout name based on parameters
 */
function generateWorkoutName(params: CardioGenerationParams, locale: AppLocale): string {
  const sportLabels: Record<Sport, Record<AppLocale, string>> = {
    RUNNING: { en: 'Run', sv: 'Löppass' },
    CYCLING: { en: 'Ride', sv: 'Cykelpass' },
    SWIMMING: { en: 'Swim', sv: 'Simpass' },
    SKIING: { en: 'Ski session', sv: 'Skidpass' },
  }

  const goalLabels: Record<TrainingGoal, Record<AppLocale, string>> = {
    BASE_BUILDING: { en: 'Base build', sv: 'Basbygge' },
    THRESHOLD_DEVELOPMENT: { en: 'Threshold', sv: 'Tröskel' },
    VO2MAX_IMPROVEMENT: { en: 'VO2max', sv: 'VO2max' },
    SPEED_DEVELOPMENT: { en: 'Speed', sv: 'Fart' },
    ENDURANCE: { en: 'Endurance', sv: 'Uthållighet' },
    RECOVERY: { en: 'Recovery', sv: 'Återhämtning' },
    RACE_PREPARATION: { en: 'Race prep', sv: 'Tävlingsförberedelse' },
  }

  return `${sportLabels[params.sport][locale]} - ${goalLabels[params.goal][locale]} ${params.targetDuration}min`
}

/**
 * Generate tags based on parameters
 */
function generateTags(params: CardioGenerationParams, segments: GeneratedSegment[]): string[] {
  const tags: string[] = []

  // Sport tag
  tags.push(params.sport.toLowerCase())

  // Goal tags
  switch (params.goal) {
    case 'BASE_BUILDING':
      tags.push('base', 'zone2', 'aerobic')
      break
    case 'THRESHOLD_DEVELOPMENT':
      tags.push('threshold', 'zone4', 'tempo')
      break
    case 'VO2MAX_IMPROVEMENT':
      tags.push('vo2max', 'intervals', 'zone5')
      break
    case 'SPEED_DEVELOPMENT':
      tags.push('speed', 'intervals', 'fast')
      break
    case 'ENDURANCE':
      tags.push('endurance', 'long', 'steady')
      break
    case 'RECOVERY':
      tags.push('recovery', 'easy', 'zone1')
      break
    case 'RACE_PREPARATION':
      tags.push('race', 'specific', 'tempo')
      break
  }

  // Duration tags
  if (params.targetDuration <= 30) tags.push('short')
  else if (params.targetDuration <= 60) tags.push('medium')
  else tags.push('long')

  // Experience tag
  tags.push(params.experienceLevel.toLowerCase())

  // Check for hills
  if (segments.some(s => s.type === 'HILL')) {
    tags.push('hills')
  }

  return [...new Set(tags)]
}

/**
 * Main generator function
 */
export function generateCardioSession(params: CardioGenerationParams): GeneratedCardioSession {
  const {
    sport,
    goal,
    targetDuration,
    experienceLevel,
    includeWarmup = true,
    includeCooldown = true,
    includeHills = false,
    includeDrills = false,
  } = params

  const locale = getLocale(params.locale)
  const goalParams = GOAL_PARAMS[goal]
  const segments: GeneratedSegment[] = []
  let remainingDuration = targetDuration * 60 // Convert to seconds

  // Add warmup
  if (includeWarmup) {
    const warmupSegments = generateWarmup(sport, experienceLevel, includeDrills, locale)
    segments.push(...warmupSegments)
    remainingDuration -= warmupSegments.reduce((sum, s) => sum + s.duration, 0)
  }

  // Reserve time for cooldown
  let cooldownDuration = 0
  if (includeCooldown) {
    cooldownDuration = experienceLevel === 'BEGINNER' ? 300 : 600
    remainingDuration -= cooldownDuration
  }

  // Add hills if requested
  if (includeHills && (sport === 'RUNNING' || sport === 'CYCLING')) {
    const hillSegments = generateHills(experienceLevel, sport, locale)
    const hillDuration = hillSegments.reduce((sum, s) => sum + s.duration, 0)

    if (hillDuration < remainingDuration * 0.5) {
      segments.push(...hillSegments)
      remainingDuration -= hillDuration
    }
  }

  // Add intervals if goal requires them
  if (goalParams.intervalStructure && remainingDuration > 600) {
    const intervalSegments = generateIntervals(
      goalParams.intervalStructure,
      goalParams.primaryZone,
      goalParams.primaryZone <= 3 ? 1 : 2,
      sport,
      locale
    )
    const intervalDuration = intervalSegments.reduce((sum, s) => sum + s.duration, 0)

    if (intervalDuration <= remainingDuration * 0.8) {
      segments.push(...intervalSegments)
      remainingDuration -= intervalDuration
    }
  }

  // Fill remaining time with steady-state
  if (remainingDuration > 60) {
    const steadyZone = goalParams.intervalStructure ? 2 : goalParams.primaryZone
    segments.push(generateSteadyState(remainingDuration, steadyZone, sport, !goalParams.intervalStructure, locale))
  }

  // Add cooldown
  if (includeCooldown) {
    const cooldownSegments = generateCooldown(sport, experienceLevel, locale)
    segments.push(...cooldownSegments)
  }

  // Calculate totals
  const totalDuration = segments.reduce((sum, s) => sum + s.duration, 0)
  const zoneDistribution = calculateZoneDistribution(segments)
  const avgZone = calculateAvgZone(segments)
  const tags = generateTags(params, segments)

  return {
    name: generateWorkoutName(params, locale),
    description: goalParams.description[locale],
    sport,
    segments,
    totalDuration,
    avgZone,
    zoneDistribution,
    tags,
  }
}

/**
 * Generate multiple workout variations
 */
export function generateCardioVariations(
  params: CardioGenerationParams,
  count: number = 3
): GeneratedCardioSession[] {
  const variations: GeneratedCardioSession[] = []

  // Variation 1: Standard
  variations.push(generateCardioSession(params))

  // Variation 2: With hills (if applicable)
  if (count >= 2 && (params.sport === 'RUNNING' || params.sport === 'CYCLING')) {
    variations.push(generateCardioSession({ ...params, includeHills: true }))
  }

  // Variation 3: With drills
  if (count >= 3) {
    variations.push(generateCardioSession({ ...params, includeDrills: true }))
  }

  return variations
}

const cardioGenerator = {
  generateCardioSession,
  generateCardioVariations,
}

export default cardioGenerator
