import { SportType } from '@prisma/client'
import { z } from 'zod'

export const fuelingPlanInputSchema = z.object({
  clientId: z.string().uuid().optional(),
  testId: z.string().uuid().optional().nullable(),
  raceId: z.string().uuid().optional().nullable(),
  programId: z.string().uuid().optional().nullable(),
  name: z.string().trim().max(120).optional().nullable(),
  sport: z.nativeEnum(SportType),
  distanceKm: z.number().positive().max(1000).optional().nullable(),
  durationMinutes: z.number().positive().max(10000).optional().nullable(),
  targetSpeedKmh: z.number().positive().max(80).optional().nullable(),
  targetPowerWatts: z.number().positive().max(3000).optional().nullable(),
  targetPaceMinKm: z.number().positive().max(60).optional().nullable(),
  raceDate: z.string().datetime().optional().nullable(),
  currentGutToleranceCarbsPerHour: z.number().min(0).max(150).optional().nullable(),
  coachNotes: z.string().max(4000).optional().nullable(),
  athleteNotes: z.string().max(4000).optional().nullable(),
  status: z.enum(['DRAFT', 'APPROVED', 'ARCHIVED']).optional(),
}).refine(
  (data) => Boolean(data.durationMinutes || (data.distanceKm && (data.targetSpeedKmh || data.targetPaceMinKm))),
  {
    message: 'Ange förväntad tid, eller distans tillsammans med målfart.',
    path: ['durationMinutes'],
  }
)

export type FuelingPlanInput = z.infer<typeof fuelingPlanInputSchema>
