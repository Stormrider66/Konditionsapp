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
  description: string
}> = {
  BASE_BUILDING: {
    methodology: 'PYRAMIDAL',
    primaryZone: 2,
    description: 'Fokus på aerob basbyggnad i zon 2',
  },
  THRESHOLD_DEVELOPMENT: {
    methodology: 'THRESHOLD_FOCUSED',
    primaryZone: 4,
    intervalStructure: { work: 480, rest: 60, repeats: 4 }, // 4x8min
    description: 'Utveckla mjölksyratröskeln genom zon 4-arbete',
  },
  VO2MAX_IMPROVEMENT: {
    methodology: 'VO2MAX_FOCUSED',
    primaryZone: 5,
    intervalStructure: { work: 180, rest: 180, repeats: 5 }, // 5x3min
    description: 'Förbättra VO2max genom intensiva intervaller',
  },
  SPEED_DEVELOPMENT: {
    methodology: 'POLARIZED',
    primaryZone: 5,
    intervalStructure: { work: 60, rest: 120, repeats: 8 }, // 8x1min
    description: 'Utveckla fart och löpekonomi',
  },
  ENDURANCE: {
    methodology: 'POLARIZED',
    primaryZone: 2,
    description: 'Bygg uthållighet genom längre pass i zon 2',
  },
  RECOVERY: {
    methodology: 'PYRAMIDAL',
    primaryZone: 1,
    description: 'Aktiv återhämtning för att främja anpassning',
  },
  RACE_PREPARATION: {
    methodology: 'PYRAMIDAL',
    primaryZone: 3,
    intervalStructure: { work: 300, rest: 90, repeats: 5 }, // 5x5min
    description: 'Tävlingsspecifikt arbete nära tävlingstempo',
  },
}

/**
 * Generate warmup segments based on sport and experience
 */
function generateWarmup(sport: Sport, experience: ExperienceLevel, includeDrills: boolean): GeneratedSegment[] {
  const warmupDuration = experience === 'BEGINNER' ? 300 : experience === 'INTERMEDIATE' ? 600 : 900
  const segments: GeneratedSegment[] = []

  // Initial easy warmup
  segments.push({
    type: 'WARMUP',
    duration: warmupDuration * 0.7,
    zone: 1,
    notes: sport === 'RUNNING' ? 'Lugn jogg, gradvis ökning' :
           sport === 'CYCLING' ? 'Lugnt tramp, 85-95 rpm' :
           sport === 'SWIMMING' ? 'Blandad sim, fokus på teknik' :
           'Lätt start, fokus på form',
  })

  // Add drills if requested
  if (includeDrills) {
    segments.push({
      type: 'DRILLS',
      duration: warmupDuration * 0.3,
      zone: 2,
      notes: sport === 'RUNNING' ? 'Dynamiska övningar, 3-4 stegringar' :
             sport === 'SWIMMING' ? 'Drill övningar: catch-up, fingertip drag' :
             'Teknikfokus',
    })
  }

  return segments
}

/**
 * Generate cooldown segments
 */
function generateCooldown(sport: Sport, experience: ExperienceLevel): GeneratedSegment[] {
  const cooldownDuration = experience === 'BEGINNER' ? 300 : 600

  return [{
    type: 'COOLDOWN',
    duration: cooldownDuration,
    zone: 1,
    notes: sport === 'RUNNING' ? 'Lugn jogg, gradvis sänkning' :
           sport === 'CYCLING' ? 'Lätt tramp, minska motstånd' :
           sport === 'SWIMMING' ? 'Lugn sim, valfritt simsätt' :
           'Mjuk avslutning, sänk pulsen',
  }]
}

/**
 * Generate interval segments based on structure
 */
function generateIntervals(
  structure: { work: number; rest: number; repeats: number },
  workZone: number,
  restZone: number,
  sport: Sport
): GeneratedSegment[] {
  const segments: GeneratedSegment[] = []

  for (let i = 0; i < structure.repeats; i++) {
    // Work interval
    segments.push({
      type: 'INTERVAL',
      duration: structure.work,
      zone: workZone,
      notes: i === 0 ? `Intervall ${i + 1}: Etablera tempo` :
             i === structure.repeats - 1 ? `Intervall ${i + 1}: Sista! Ge allt!` :
             `Intervall ${i + 1}: Bibehåll intensitet`,
    })

    // Recovery (except after last interval)
    if (i < structure.repeats - 1) {
      segments.push({
        type: 'RECOVERY',
        duration: structure.rest,
        zone: restZone,
        notes: sport === 'RUNNING' ? 'Lätt jogg, återhämta' :
               sport === 'CYCLING' ? 'Lätt tramp, sänk puls' :
               'Aktiv vila',
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
  isMain: boolean
): GeneratedSegment {
  return {
    type: 'STEADY',
    duration,
    zone,
    notes: isMain ?
      (zone === 2 ? 'Håll konversationstempo, fokus på andning' :
       zone === 3 ? 'Måttlig ansträngning, kontrollerad' :
       zone === 4 ? 'Tröskeltempo, komfortabelt hårt' :
       'Jämnt tempo') :
      'Mjuk övergång',
  }
}

/**
 * Generate hill segments
 */
function generateHills(
  experience: ExperienceLevel,
  sport: Sport
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
      notes: i === 0 ? 'Uppför: kraftfullt men kontrollerat' :
             i === repeats - 1 ? 'Sista backen! Fokus på teknik' :
             'Uppför: lyft knäna högt',
    })

    if (i < repeats - 1) {
      segments.push({
        type: 'RECOVERY',
        duration: hillDuration * 2,
        zone: 1,
        notes: 'Jogg/gå ner',
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
function generateWorkoutName(params: CardioGenerationParams): string {
  const sportLabels: Record<Sport, string> = {
    RUNNING: 'Löppass',
    CYCLING: 'Cykelpass',
    SWIMMING: 'Simpass',
    SKIING: 'Skidpass',
  }

  const goalLabels: Record<TrainingGoal, string> = {
    BASE_BUILDING: 'Basbygge',
    THRESHOLD_DEVELOPMENT: 'Tröskel',
    VO2MAX_IMPROVEMENT: 'VO2max',
    SPEED_DEVELOPMENT: 'Fart',
    ENDURANCE: 'Uthållighet',
    RECOVERY: 'Återhämtning',
    RACE_PREPARATION: 'Tävlingsförberedelse',
  }

  return `${sportLabels[params.sport]} - ${goalLabels[params.goal]} ${params.targetDuration}min`
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

  const goalParams = GOAL_PARAMS[goal]
  const segments: GeneratedSegment[] = []
  let remainingDuration = targetDuration * 60 // Convert to seconds

  // Add warmup
  if (includeWarmup) {
    const warmupSegments = generateWarmup(sport, experienceLevel, includeDrills)
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
    const hillSegments = generateHills(experienceLevel, sport)
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
      sport
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
    segments.push(generateSteadyState(remainingDuration, steadyZone, sport, !goalParams.intervalStructure))
  }

  // Add cooldown
  if (includeCooldown) {
    const cooldownSegments = generateCooldown(sport, experienceLevel)
    segments.push(...cooldownSegments)
  }

  // Calculate totals
  const totalDuration = segments.reduce((sum, s) => sum + s.duration, 0)
  const zoneDistribution = calculateZoneDistribution(segments)
  const avgZone = calculateAvgZone(segments)
  const tags = generateTags(params, segments)

  return {
    name: generateWorkoutName(params),
    description: goalParams.description,
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
