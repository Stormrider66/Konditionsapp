// lib/validations/voice-workout-schemas.ts
import { z } from 'zod'

// ==================== VOICE WORKOUT VALIDATION SCHEMAS ====================

/**
 * Target types for workout assignment
 */
export const voiceWorkoutTargetTypeSchema = z.enum(['ATHLETE', 'TEAM'])

/**
 * Workout type (cardio, strength, hybrid)
 */
export const voiceWorkoutTypeSchema = z.enum(['CARDIO', 'STRENGTH', 'HYBRID'])

/**
 * Session status
 */
export const voiceWorkoutStatusSchema = z.enum([
  'PENDING',
  'PROCESSING',
  'PARSED',
  'CONFIRMED',
  'FAILED',
])

/**
 * Target information from voice input
 */
export const voiceWorkoutTargetSchema = z.object({
  type: voiceWorkoutTargetTypeSchema,
  name: z.string().min(1, 'Namn krävs'),
  resolvedId: z.string().uuid().optional(),
  alternatives: z
    .array(
      z.object({
        id: z.string().uuid(),
        name: z.string(),
      })
    )
    .optional(),
  confidence: z.number().min(0).max(1),
})

/**
 * Schedule information from voice input
 */
export const voiceWorkoutScheduleSchema = z.object({
  dateText: z.string().min(1),
  timeText: z.string().optional(),
  resolvedDate: z.string().optional(), // ISO date
  resolvedTime: z.string().optional(), // HH:mm
})

/**
 * Workout structure element
 */
export const voiceWorkoutStructureSchema = z.object({
  type: z.enum(['warmup', 'main', 'cooldown', 'interval', 'exercise', 'rest']),
  duration: z.number().positive().optional(),
  zone: z.number().int().min(1).max(5).optional(),
  reps: z.number().int().positive().optional(),
  sets: z.number().int().positive().optional(),
  repsCount: z.string().optional(), // "10", "10-12", "AMRAP"
  exerciseName: z.string().optional(),
  rest: z.number().nonnegative().optional(), // seconds
  description: z.string().optional(),
})

/**
 * Parsed intent from voice transcription
 */
export const voiceWorkoutIntentSchema = z.object({
  transcription: z.string().min(1),
  target: voiceWorkoutTargetSchema,
  schedule: voiceWorkoutScheduleSchema,
  workout: z.object({
    type: voiceWorkoutTypeSchema,
    subtype: z.string().optional(),
    name: z.string().optional(),
    duration: z.number().positive().optional(),
    structure: z.array(voiceWorkoutStructureSchema),
  }),
  confidence: z.number().min(0).max(1),
  ambiguities: z.array(z.string()),
})

/**
 * Cardio segment data
 */
export const cardioSegmentSchema = z.object({
  type: z.enum(['warmup', 'work', 'recovery', 'cooldown', 'interval']),
  duration: z.number().nonnegative().optional(),
  distance: z.number().nonnegative().optional(),
  pace: z.string().optional(),
  zone: z.number().int().min(1).max(5).optional(),
  targetHR: z.number().int().min(40).max(250).optional(),
  notes: z.string().optional(),
})

/**
 * Cardio session data
 */
export const cardioSessionDataSchema = z.object({
  name: z.string().min(1, 'Namn krävs'),
  description: z.string().optional(),
  sport: z.string(),
  segments: z.array(cardioSegmentSchema),
  totalDuration: z.number().nonnegative().optional(),
  totalDistance: z.number().nonnegative().optional(),
  avgZone: z.number().min(1).max(5).optional(),
  tags: z.array(z.string()).optional(),
})

/**
 * Strength exercise data
 */
export const strengthExerciseDataSchema = z.object({
  exerciseId: z.string().uuid().optional(),
  exerciseName: z.string().min(1),
  sets: z.number().int().positive(),
  reps: z.string().min(1), // "10", "8-12", "AMRAP"
  weight: z.string().optional(),
  restSeconds: z.number().nonnegative().optional(),
  notes: z.string().optional(),
  section: z.enum(['WARMUP', 'MAIN', 'CORE', 'COOLDOWN']).optional(),
})

/**
 * Strength session data
 */
export const strengthSessionDataSchema = z.object({
  name: z.string().min(1, 'Namn krävs'),
  description: z.string().optional(),
  phase: z.string().optional(),
  exercises: z.array(strengthExerciseDataSchema),
  warmupData: z
    .object({
      notes: z.string().optional(),
      duration: z.number().positive().optional(),
      exercises: z.array(strengthExerciseDataSchema).optional(),
    })
    .optional(),
  coreData: z
    .object({
      notes: z.string().optional(),
      duration: z.number().positive().optional(),
      exercises: z.array(strengthExerciseDataSchema).optional(),
    })
    .optional(),
  cooldownData: z
    .object({
      notes: z.string().optional(),
      duration: z.number().positive().optional(),
    })
    .optional(),
  estimatedDuration: z.number().positive().optional(),
  tags: z.array(z.string()).optional(),
})

/**
 * Hybrid movement data
 */
export const hybridMovementDataSchema = z.object({
  exerciseId: z.string().uuid().optional(),
  name: z.string().min(1),
  reps: z.string().optional(),
  weight: z.string().optional(),
  distance: z.number().nonnegative().optional(),
  duration: z.number().nonnegative().optional(),
  calories: z.number().nonnegative().optional(),
  sequence: z.number().int().nonnegative(),
  notes: z.string().optional(),
})

/**
 * Hybrid workout data
 */
export const hybridWorkoutDataSchema = z.object({
  name: z.string().min(1, 'Namn krävs'),
  description: z.string().optional(),
  format: z.string().min(1), // AMRAP, FOR_TIME, EMOM, etc.
  timeCap: z.number().nonnegative().optional(),
  workTime: z.number().nonnegative().optional(),
  restTime: z.number().nonnegative().optional(),
  totalRounds: z.number().int().positive().optional(),
  totalMinutes: z.number().positive().optional(),
  repScheme: z.string().optional(),
  movements: z.array(hybridMovementDataSchema),
  warmupData: z
    .object({
      notes: z.string().optional(),
      movements: z.array(hybridMovementDataSchema).optional(),
    })
    .optional(),
  cooldownData: z
    .object({
      notes: z.string().optional(),
      movements: z.array(hybridMovementDataSchema).optional(),
    })
    .optional(),
  tags: z.array(z.string()).optional(),
})

/**
 * Generated workout data (polymorphic)
 */
export const generatedWorkoutDataSchema = z.object({
  type: voiceWorkoutTypeSchema,
  name: z.string().min(1),
  description: z.string().optional(),
  cardioData: cardioSessionDataSchema.optional(),
  strengthData: strengthSessionDataSchema.optional(),
  hybridData: hybridWorkoutDataSchema.optional(),
})

/**
 * Generated workout overrides (deep-ish partial).
 *
 * NOTE: `generatedWorkoutDataSchema.partial()` only makes the top-level optional.
 * This schema also makes nested workout data objects optional/partial so a coach
 * can safely override just a few fields (e.g. `cardioData.name`) without needing
 * to resend required nested fields like `segments`.
 */
export const generatedWorkoutDataOverrideSchema = z.object({
  type: voiceWorkoutTypeSchema.optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  cardioData: cardioSessionDataSchema.partial().optional(),
  strengthData: strengthSessionDataSchema.partial().optional(),
  hybridData: hybridWorkoutDataSchema.partial().optional(),
})

/**
 * Upload request (FormData validation happens at API level)
 */
export const voiceWorkoutUploadSchema = z.object({
  // Audio file is handled separately via FormData
  duration: z.number().int().positive().max(300), // max 5 minutes
  mimeType: z.string().optional(),
})

/**
 * Confirm request - coach confirms and saves the workout
 */
export const voiceWorkoutConfirmSchema = z.object({
  // Optional modifications to the generated workout
  workout: generatedWorkoutDataOverrideSchema.optional(),
  // Assignment configuration
  assignment: z.object({
    targetType: voiceWorkoutTargetTypeSchema,
    targetId: z.string().uuid('Ogiltig mål-ID'),
    assignedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum måste vara i format YYYY-MM-DD'),
  }),
  // Calendar event options
  createCalendarEvent: z.boolean().optional().default(false),
  calendarEventTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Tid måste vara i format HH:mm')
    .optional(),
})

/**
 * Update parsed intent (for coach corrections)
 */
export const voiceWorkoutUpdateIntentSchema = z.object({
  target: voiceWorkoutTargetSchema.partial().optional(),
  schedule: voiceWorkoutScheduleSchema.partial().optional(),
  workout: z
    .object({
      type: voiceWorkoutTypeSchema.optional(),
      subtype: z.string().optional(),
      name: z.string().optional(),
      duration: z.number().positive().optional(),
      structure: z.array(voiceWorkoutStructureSchema).optional(),
    })
    .optional(),
})

// Type exports
export type VoiceWorkoutTargetType = z.infer<typeof voiceWorkoutTargetTypeSchema>
export type VoiceWorkoutType = z.infer<typeof voiceWorkoutTypeSchema>
export type VoiceWorkoutStatus = z.infer<typeof voiceWorkoutStatusSchema>
export type VoiceWorkoutTarget = z.infer<typeof voiceWorkoutTargetSchema>
export type VoiceWorkoutSchedule = z.infer<typeof voiceWorkoutScheduleSchema>
export type VoiceWorkoutStructure = z.infer<typeof voiceWorkoutStructureSchema>
export type VoiceWorkoutIntent = z.infer<typeof voiceWorkoutIntentSchema>
export type CardioSegmentData = z.infer<typeof cardioSegmentSchema>
export type CardioSessionData = z.infer<typeof cardioSessionDataSchema>
export type StrengthExerciseData = z.infer<typeof strengthExerciseDataSchema>
export type StrengthSessionData = z.infer<typeof strengthSessionDataSchema>
export type HybridMovementData = z.infer<typeof hybridMovementDataSchema>
export type HybridWorkoutData = z.infer<typeof hybridWorkoutDataSchema>
export type GeneratedWorkoutData = z.infer<typeof generatedWorkoutDataSchema>
export type VoiceWorkoutUpload = z.infer<typeof voiceWorkoutUploadSchema>
export type VoiceWorkoutConfirm = z.infer<typeof voiceWorkoutConfirmSchema>
export type VoiceWorkoutUpdateIntent = z.infer<typeof voiceWorkoutUpdateIntentSchema>
