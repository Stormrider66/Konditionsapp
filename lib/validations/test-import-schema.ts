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
      vo2: z.number().min(5).max(100).optional(),
      speed: z.number().optional(),
      power: z.number().optional(),
      cadence: z.number().optional(),
      pace: z.number().optional(),
      incline: z.number().optional(),
      // Metabol data (spirometri) — physiological ranges so Gemini's
      // misreads (scientific notation, unit confusion) fail validation
      // and the SDK retries instead of writing junk to the form.
      rer: z.number().min(0.6).max(1.3).optional(),
      ve: z.number().min(5).max(250).optional(),
      vco2: z.number().min(100).max(6000).optional(),
      fatPercent: z.number().min(0).max(100).optional(),
      choPercent: z.number().min(0).max(100).optional(),
      respiratoryRate: z.number().min(5).max(80).optional(),
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
