// lib/validations/schemas.ts
import { z } from 'zod'
export { detectLactateDecreases } from '@/lib/lactate/data-quality'

type AppLocale = 'en' | 'sv'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

// Helper to convert NaN to undefined for optional number fields
const optionalNumber = (min: number, max: number) =>
  z
    .union([z.number().min(min).max(max), z.nan(), z.undefined()])
    .transform((val): number | undefined =>
      typeof val === 'number' && !isNaN(val) ? val : undefined
    )

// Klient-validering
export function createClientSchema(locale: AppLocale = 'en') {
  return z.object({
    name: z.string().min(2, t(locale, 'Name must be at least 2 characters', 'Namnet måste vara minst 2 tecken')).max(100),
    email: z.string().email(t(locale, 'Invalid email address', 'Ogiltig e-postadress')).optional().or(z.literal('')),
    phone: z.string().optional(),
    gender: z.enum(['MALE', 'FEMALE']),
    birthDate: z.string().refine(
      (date) => {
        const age = new Date().getFullYear() - new Date(date).getFullYear()
        return age >= 10 && age <= 100
      },
      { message: t(locale, 'Age must be between 10 and 100 years', 'Ålder måste vara mellan 10 och 100 år') }
    ),
    height: z.number().min(100, t(locale, 'Height must be at least 100 cm', 'Längd måste vara minst 100 cm')).max(250),
    weight: z.number().min(30, t(locale, 'Weight must be at least 30 kg', 'Vikt måste vara minst 30 kg')).max(300),
    notes: z.string().optional(),
    teamId: z.string().optional().or(z.literal('')),
    jerseyNumber: z
      .union([z.number(), z.nan(), z.undefined()])
      .transform((v): number | undefined =>
        typeof v === 'number' && !isNaN(v) ? v : undefined
      )
      .refine((v) => v === undefined || (Number.isInteger(v) && v >= 0 && v <= 999), {
        message: t(locale, 'Jersey number must be between 0 and 999', 'Tröjnummer måste vara mellan 0 och 999'),
      }),
    position: z.string().max(40).optional().or(z.literal('')),
    photoUrl: z.string().url().max(2048).optional().or(z.literal('')),
    athleteTier: z.enum(['FREE', 'STANDARD', 'PRO', 'ELITE']).optional(),
  })
}

export const clientSchema = createClientSchema('en')

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
  // Metabol data (spirometri)
  rer: optionalNumber(0.5, 1.5),
  ve: optionalNumber(0, 300),
  vco2: optionalNumber(0, 10000),
  fatPercent: optionalNumber(0, 100),
  choPercent: optionalNumber(0, 100),
  respiratoryRate: optionalNumber(0, 80),
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
  // Metabol data (spirometri)
  rer: optionalNumber(0.5, 1.5),
  ve: optionalNumber(0, 300),
  vco2: optionalNumber(0, 10000),
  fatPercent: optionalNumber(0, 100),
  choPercent: optionalNumber(0, 100),
  respiratoryRate: optionalNumber(0, 80),
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

// Test-validering (form version)
export function buildCreateTestSchema(locale: AppLocale = 'en') {
  return z.object({
    clientId: z.string().uuid().optional(),
    testDate: z.string(),
    testType: z.enum(['RUNNING', 'CYCLING', 'SKIING']),
    location: z.string().optional(),
    testLeader: z.string().optional(),
    inclineUnit: z.enum(['PERCENT', 'DEGREES']).optional(),
    stages: z.array(testStageSchema).min(3, t(locale, 'At least 3 stages are required', 'Minst 3 steg krävs')),
    notes: z.string().optional(),
    // Pre-test measurements
    restingLactate: optionalNumber(0, 10),
    // Post-test measurements (post-max lactate)
    postTestMeasurements: z.array(postTestMeasurementSchema).optional(),
    // Recommended next test date
    recommendedNextTestDate: z.string().optional(),
  })
}

export const createTestSchema = buildCreateTestSchema('en')

// Test-validering (API version - for server-side validation)
export function buildCreateTestApiSchema(locale: AppLocale = 'en') {
  return z.object({
    clientId: z.string().uuid().optional(),
    testDate: z.string(),
    testType: z.enum(['RUNNING', 'CYCLING', 'SKIING']),
    location: z.string().optional(),
    testLeader: z.string().optional(),
    inclineUnit: z.enum(['PERCENT', 'DEGREES']).optional(),
    stages: z.array(testStageApiSchema).min(3, t(locale, 'At least 3 stages are required', 'Minst 3 steg krävs')),
    notes: z.string().optional(),
    // Pre-test measurements
    restingLactate: optionalNumber(0, 10),
    // Post-test measurements (post-max lactate)
    postTestMeasurements: z.array(postTestMeasurementApiSchema).optional(),
    // Recommended next test date
    recommendedNextTestDate: z.string().optional(),
  })
}

export const createTestApiSchema = buildCreateTestApiSchema('en')

// Löptest-specifik validering
export function buildRunningTestSchema(locale: AppLocale = 'en') {
  return buildCreateTestSchema(locale).extend({
    testType: z.literal('RUNNING'),
    stages: z.array(
      testStageSchema.extend({
        speed: z.number().min(3, t(locale, 'Speed must be at least 3 km/h', 'Hastighet måste vara minst 3 km/h')).max(30),
      })
    ),
  })
}

export const runningTestSchema = buildRunningTestSchema('en')

// Cykeltest-specifik validering
export function buildCyclingTestSchema(locale: AppLocale = 'en') {
  return buildCreateTestSchema(locale).extend({
    testType: z.literal('CYCLING'),
    stages: z.array(
      testStageSchema.extend({
        power: z.number().min(20, t(locale, 'Power must be at least 20 watts', 'Effekt måste vara minst 20 watt')).max(1000),
      })
    ),
  })
}

export const cyclingTestSchema = buildCyclingTestSchema('en')

// Skidtest-specifik validering
export function buildSkiingTestSchema(locale: AppLocale = 'en') {
  return buildCreateTestSchema(locale).extend({
    testType: z.literal('SKIING'),
    stages: z.array(
      testStageSchema.extend({
        pace: z.number().min(2, t(locale, 'Pace must be at least 2 min/km', 'Tempo måste vara minst 2 min/km')).max(20),
      })
    ),
  })
}

export const skiingTestSchema = buildSkiingTestSchema('en')

export type ClientFormData = z.infer<typeof clientSchema>
export type TestStageFormData = z.infer<typeof testStageSchema>
export type TestStageApiData = z.infer<typeof testStageApiSchema>
export type CreateTestFormData = z.infer<typeof createTestSchema>
export type CreateTestApiData = z.infer<typeof createTestApiSchema>
