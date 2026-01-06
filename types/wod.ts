/**
 * WOD (Workout of the Day) Types
 *
 * Types for the AI-generated Workout of the Day feature.
 * Supports structured, casual, and fun workout modes.
 */

// ============================================
// REQUEST TYPES
// ============================================

export type WODMode = 'structured' | 'casual' | 'fun'

export type WODFocusArea =
  | 'upper_body'
  | 'lower_body'
  | 'full_body'
  | 'cardio'
  | 'recovery'
  | 'sport_specific'

export type WODEquipment =
  | 'none'
  | 'dumbbells'
  | 'barbell'
  | 'kettlebell'
  | 'resistance_band'
  | 'pull_up_bar'
  | 'treadmill'
  | 'bike'
  | 'rower'
  | 'skierg'

export interface WODRequest {
  mode: WODMode
  duration?: number  // Minutes (15-90, default 45)
  equipment?: WODEquipment[]
  focusArea?: WODFocusArea
}

// ============================================
// WORKOUT STRUCTURE TYPES
// ============================================

export type WODSectionType = 'WARMUP' | 'MAIN' | 'CORE' | 'COOLDOWN'

export interface WODExercise {
  name: string          // English name
  nameSv: string        // Swedish name
  exerciseId?: string   // Link to exercise library (84 exercises)
  imageUrls?: string[]  // Exercise images from library

  // Strength exercise parameters
  sets?: number
  reps?: string         // "10" or "10-12" or "AMRAP"
  weight?: string       // "Bodyweight", "Light", "Moderate", "60% 1RM"
  restSeconds?: number
  tempo?: string        // "3-1-1" (eccentric-pause-concentric)

  // Cardio exercise parameters
  duration?: number     // Seconds
  distance?: number     // Meters
  zone?: number         // 1-5
  pace?: string         // "5:00/km"

  // Instructions
  instructions?: string
  cues?: string[]       // Quick coaching cues
}

export interface WODSection {
  type: WODSectionType
  name: string          // Swedish section name
  duration: number      // Minutes for this section
  exercises: WODExercise[]
  notes?: string        // Section-specific notes
}

export interface WODWorkout {
  title: string         // Swedish title (e.g., "Explosiv Morgonstart")
  subtitle: string      // Motivational tagline
  description: string   // What this workout targets
  sections: WODSection[]
  coachNotes?: string   // AI reasoning for workout selection

  // Computed totals
  totalDuration: number     // Minutes
  totalExercises: number
  totalSets?: number
}

// ============================================
// RESPONSE & METADATA TYPES
// ============================================

export type AdjustedIntensity = 'recovery' | 'easy' | 'moderate' | 'threshold'

export interface WODGuardrailApplied {
  type: 'ACWR_CRITICAL' | 'ACWR_WARNING' | 'INJURY_EXCLUDED' | 'INJURY_MODIFIED' |
        'FATIGUE_REDUCED' | 'USAGE_LIMITED' | 'RECOVERY_FORCED'
  description: string
  modification?: string
}

export interface WODMetadata {
  requestId: string
  athleteName: string
  primarySport: string

  // Readiness context
  readinessScore: number | null
  adjustedIntensity: AdjustedIntensity

  // Guardrails
  guardrailsApplied: WODGuardrailApplied[]

  // Usage tracking
  remainingWODs: number
  weeklyLimit: number

  // Timing
  estimatedDuration: number
  generationTimeMs?: number
}

export interface WODResponse {
  metadata: WODMetadata
  workout: WODWorkout
}

// ============================================
// CONTEXT TYPES (for AI generation)
// ============================================

export interface WODAthleteContext {
  clientId: string
  athleteName: string
  primarySport: string
  experienceLevel: string  // "BEGINNER", "RECREATIONAL", "ADVANCED", "ELITE"

  // Readiness
  readinessScore: number | null
  fatigueLevel: number | null
  sorenessLevel: number | null
  sleepQuality: number | null

  // Training load
  weeklyTSS: number
  acwrZone: 'DETRAINING' | 'OPTIMAL' | 'CAUTION' | 'DANGER' | 'CRITICAL'

  // Injuries
  activeInjuries: {
    type: string
    painLevel: number
    affectedArea: string
  }[]

  // Recent training (for avoiding overload)
  recentWorkouts: {
    type: string
    date: Date
    intensity: string
    muscleGroups?: string[]
  }[]

  // Goals and preferences
  currentGoal?: string
  availableEquipment: WODEquipment[]
  preferredDuration?: number
}

export interface WODGuardrailResult {
  canGenerate: boolean
  checks: {
    acwr: { passed: boolean; reason?: string; modification?: string }
    injury: { passed: boolean; reason?: string; modification?: string }
    fatigue: { passed: boolean; reason?: string; modification?: string }
    usageLimit: { passed: boolean; reason?: string }
  }
  guardrailsApplied: WODGuardrailApplied[]
  adjustedIntensity: AdjustedIntensity
  excludedAreas: string[]  // Body areas to avoid
  blockedReason?: string   // If canGenerate is false
}

// ============================================
// USAGE TRACKING TYPES
// ============================================

export interface WODUsageLimits {
  FREE: number       // 3/week
  BASIC: number      // 5/week
  STANDARD: number   // 10/week
  PRO: number        // Unlimited (-1)
  ENTERPRISE: number // Unlimited (-1)
}

export const WOD_USAGE_LIMITS: WODUsageLimits = {
  FREE: 3,
  BASIC: 5,
  STANDARD: 10,
  PRO: -1,        // Unlimited
  ENTERPRISE: -1, // Unlimited
}

export interface WODUsageStats {
  weeklyCount: number
  weeklyLimit: number
  remaining: number
  isUnlimited: boolean
  resetDate: Date  // Next Monday
}

// ============================================
// UI STATE TYPES
// ============================================

export type WODGenerationStep = 'mode' | 'duration' | 'equipment' | 'generating' | 'preview' | 'focus'

export interface WODGeneratorState {
  step: WODGenerationStep
  request: WODRequest
  response: WODResponse | null
  isLoading: boolean
  error: string | null
}

// ============================================
// SWEDISH LABELS
// ============================================

export const WOD_LABELS = {
  // Mode labels
  modes: {
    structured: {
      title: 'Strukturerat',
      description: 'Vetenskapligt baserat pass anpassat efter din träningsplan',
    },
    casual: {
      title: 'Avslappnat',
      description: 'Flexibelt pass utan press - bara visa upp och rör dig',
    },
    fun: {
      title: 'Bara kul!',
      description: 'Överraskande och varierat - för dig som vill ha omväxling',
    },
  },

  // Section labels
  sections: {
    WARMUP: 'Uppvärmning',
    MAIN: 'Huvudpass',
    CORE: 'Core',
    COOLDOWN: 'Nedvarvning',
  },

  // Equipment labels
  equipment: {
    none: 'Ingen utrustning',
    dumbbells: 'Hantlar',
    barbell: 'Skivstång',
    kettlebell: 'Kettlebell',
    resistance_band: 'Gummiband',
    pull_up_bar: 'Räcke',
    treadmill: 'Löpband',
    bike: 'Cykel',
    rower: 'Roddmaskin',
    skierg: 'SkiErg',
  },

  // Focus area labels
  focusAreas: {
    upper_body: 'Överkropp',
    lower_body: 'Underkropp',
    full_body: 'Helkropp',
    cardio: 'Kondition',
    recovery: 'Återhämtning',
    sport_specific: 'Sportspecifikt',
  },

  // Intensity labels
  intensity: {
    recovery: 'Vila/Återhämtning',
    easy: 'Lätt',
    moderate: 'Måttlig',
    threshold: 'Tröskel',
  },

  // Readiness messages
  readiness: {
    high: 'Din kropp är redo för utmaning!',
    medium: 'Bra dag för måttlig träning',
    low: 'Fokusera på återhämtning idag',
    unknown: 'Ingen beredskapsdata tillgänglig',
  },

  // Button labels
  buttons: {
    create: 'Skapa Dagens Pass',
    start: 'Starta Pass',
    regenerate: 'Generera nytt',
    back: 'Tillbaka',
    next: 'Nästa',
  },

  // Status labels
  remaining: (n: number) => `${n} pass kvar denna vecka`,
  unlimited: 'Obegränsat',
} as const
