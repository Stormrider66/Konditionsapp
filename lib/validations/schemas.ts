// lib/validations/schemas.ts
import { z } from 'zod'

// Helper to convert NaN to undefined for optional number fields
const optionalNumber = (min: number, max: number) =>
  z
    .union([z.number().min(min).max(max), z.nan(), z.undefined()])
    .transform((val): number | undefined =>
      typeof val === 'number' && !isNaN(val) ? val : undefined
    )

// Klient-validering
export const clientSchema = z.object({
  name: z.string().min(2, 'Namnet måste vara minst 2 tecken').max(100),
  email: z.string().email('Ogiltig e-postadress').optional().or(z.literal('')),
  phone: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE']),
  birthDate: z.string().refine(
    (date) => {
      const age = new Date().getFullYear() - new Date(date).getFullYear()
      return age >= 10 && age <= 100
    },
    { message: 'Ålder måste vara mellan 10 och 100 år' }
  ),
  height: z.number().min(100, 'Längd måste vara minst 100 cm').max(250),
  weight: z.number().min(30, 'Vikt måste vara minst 30 kg').max(300),
  notes: z.string().optional(),
  teamId: z.string().optional().or(z.literal('')),
})

// Test-stage validering (form version with separate minutes/seconds)
export const testStageSchema = z.object({
  durationMinutes: z.number().min(0).max(60),
  durationSeconds: z.number().min(0).max(59),
  heartRate: z.number().min(40).max(250),
  lactate: z.number().min(0).max(30),
  vo2: optionalNumber(10, 100),
  speed: optionalNumber(0, 30),
  incline: optionalNumber(0, 20),
  power: optionalNumber(0, 1000),
  cadence: optionalNumber(0, 200),
  pace: optionalNumber(2, 20),
})

// Test-stage validering (API version with combined duration)
export const testStageApiSchema = z.object({
  duration: z.number().min(0.01).max(60),
  heartRate: z.number().min(40).max(250),
  lactate: z.number().min(0).max(30),
  vo2: optionalNumber(10, 100),
  speed: optionalNumber(0, 30),
  incline: optionalNumber(0, 20),
  power: optionalNumber(0, 1000),
  cadence: optionalNumber(0, 200),
  pace: optionalNumber(2, 20),
})

// Post-test lactate measurement (form version with separate minutes/seconds)
export const postTestMeasurementSchema = z.object({
  timeMinutes: z.number().min(0).max(30),
  timeSeconds: z.number().min(0).max(59),
  lactate: z.number().min(0).max(30),
})

// Post-test lactate measurement (API version with combined time)
export const postTestMeasurementApiSchema = z.object({
  timeMin: z.number().min(0).max(30),
  lactate: z.number().min(0).max(30),
})

// Helper to detect significant lactate decreases between stages
export function detectLactateDecreases(
  stages: Array<{ lactate: number }>
): Array<{ fromStage: number; toStage: number; drop: number }> {
  const warnings: Array<{ fromStage: number; toStage: number; drop: number }> = []
  for (let i = 1; i < stages.length; i++) {
    const drop = stages[i - 1].lactate - stages[i].lactate
    if (drop > 0.3) {
      warnings.push({
        fromStage: i,
        toStage: i + 1,
        drop: Math.round(drop * 100) / 100,
      })
    }
  }
  return warnings
}

// Test-validering (form version)
export const createTestSchema = z.object({
  clientId: z.string().uuid().optional(),
  testDate: z.string(),
  testType: z.enum(['RUNNING', 'CYCLING', 'SKIING']),
  location: z.string().optional(),
  testLeader: z.string().optional(),
  inclineUnit: z.enum(['PERCENT', 'DEGREES']).optional(),
  stages: z.array(testStageSchema).min(3, 'Minst 3 steg krävs'),
  notes: z.string().optional(),
  // Pre-test measurements
  restingLactate: optionalNumber(0, 10),
  // Post-test measurements (post-max lactate)
  postTestMeasurements: z.array(postTestMeasurementSchema).optional(),
  // Recommended next test date
  recommendedNextTestDate: z.string().optional(),
})

// Test-validering (API version - for server-side validation)
export const createTestApiSchema = z.object({
  clientId: z.string().uuid().optional(),
  testDate: z.string(),
  testType: z.enum(['RUNNING', 'CYCLING', 'SKIING']),
  location: z.string().optional(),
  testLeader: z.string().optional(),
  inclineUnit: z.enum(['PERCENT', 'DEGREES']).optional(),
  stages: z.array(testStageApiSchema).min(3, 'Minst 3 steg krävs'),
  notes: z.string().optional(),
  // Pre-test measurements
  restingLactate: optionalNumber(0, 10),
  // Post-test measurements (post-max lactate)
  postTestMeasurements: z.array(postTestMeasurementApiSchema).optional(),
  // Recommended next test date
  recommendedNextTestDate: z.string().optional(),
})

// Löptest-specifik validering
export const runningTestSchema = createTestSchema.extend({
  testType: z.literal('RUNNING'),
  stages: z.array(
    testStageSchema.extend({
      speed: z.number().min(3, 'Hastighet måste vara minst 3 km/h').max(30),
    })
  ),
})

// Cykeltest-specifik validering
export const cyclingTestSchema = createTestSchema.extend({
  testType: z.literal('CYCLING'),
  stages: z.array(
    testStageSchema.extend({
      power: z.number().min(20, 'Effekt måste vara minst 20 watt').max(1000),
    })
  ),
})

// Skidtest-specifik validering
export const skiingTestSchema = createTestSchema.extend({
  testType: z.literal('SKIING'),
  stages: z.array(
    testStageSchema.extend({
      pace: z.number().min(2, 'Tempo måste vara minst 2 min/km').max(20),
    })
  ),
})

export type ClientFormData = z.infer<typeof clientSchema>
export type TestStageFormData = z.infer<typeof testStageSchema>
export type TestStageApiData = z.infer<typeof testStageApiSchema>
export type CreateTestFormData = z.infer<typeof createTestSchema>
export type CreateTestApiData = z.infer<typeof createTestApiSchema>
