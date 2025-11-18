// lib/validations/schemas.ts
import { z } from 'zod'

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

// Test-stage validering
export const testStageSchema = z.object({
  duration: z.number().min(0.1).max(60),
  heartRate: z.number().min(40).max(250),
  lactate: z.number().min(0).max(30),
  vo2: z.number().min(10).max(100).optional(),
  speed: z.number().min(0).max(30).optional(),
  incline: z.number().min(0).max(20).optional(),
  power: z.number().min(0).max(1000).optional(),
  cadence: z.number().min(0).max(200).optional(),
  pace: z.number().min(2).max(20).optional(),
})

// Test-validering
export const createTestSchema = z.object({
  clientId: z.string().uuid().optional(),
  testDate: z.string(),
  testType: z.enum(['RUNNING', 'CYCLING', 'SKIING']),
  location: z.string().optional(),
  testLeader: z.string().optional(),
  inclineUnit: z.enum(['PERCENT', 'DEGREES']).optional(),
  stages: z.array(testStageSchema).min(3, 'Minst 3 steg krävs'),
  notes: z.string().optional(),
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
export type CreateTestFormData = z.infer<typeof createTestSchema>
