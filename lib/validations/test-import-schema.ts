import { z } from 'zod'

/**
 * Schema for AI-extracted test data from photos, documents, or audio.
 * Field names mirror CreateTestFormData for trivial form pre-fill via setValue/replace.
 */
export const TestImportResultSchema = z.object({
  success: z.boolean(),
  testDate: z.string().optional(),
  testType: z.enum(['RUNNING', 'CYCLING', 'SKIING']).optional(),
  restingLactate: z.number().min(0).max(10).optional(),
  stages: z.array(
    z.object({
      durationMinutes: z.number(),
      durationSeconds: z.number(),
      heartRate: z.number().min(40).max(250),
      lactate: z.number().min(0).max(30),
      vo2: z.number().optional(),
      speed: z.number().optional(),
      power: z.number().optional(),
      cadence: z.number().optional(),
      pace: z.number().optional(),
      incline: z.number().optional(),
    })
  ),
  postTestMeasurements: z
    .array(
      z.object({
        timeMinutes: z.number(),
        timeSeconds: z.number(),
        lactate: z.number(),
      })
    )
    .optional(),
  notes: z.string().optional(),
  sourceDescription: z.string(),
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string()),
  detectedEquipment: z.string().optional(),
})

export type TestImportResult = z.infer<typeof TestImportResultSchema>
