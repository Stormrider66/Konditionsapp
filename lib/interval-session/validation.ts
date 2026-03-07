/**
 * Interval Session Validation Schemas
 */

import { z } from 'zod'

export const createSessionSchema = z.object({
  name: z.string().max(200).optional(),
  teamId: z.string().uuid().optional(),
  sportType: z.string().max(50).optional(),
  protocol: z
    .object({
      intervalCount: z.number().int().min(1).max(100).optional(),
      targetDurationSeconds: z.number().min(1).max(7200).optional(),
      restDurationSeconds: z.number().min(0).max(3600).optional(),
      description: z.string().max(500).optional(),
    })
    .optional(),
  participantIds: z.array(z.string().uuid()).max(50).optional(),
  scheduledDate: z.string().optional(), // ISO date string
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/).optional(), // "HH:mm"
})

export const recordLapSchema = z.object({
  clientId: z.string().uuid(),
  cumulativeMs: z.number().int().min(0),
})

export const recordLactateSchema = z.object({
  clientId: z.string().uuid(),
  intervalNumber: z.number().int().min(0).max(100),
  lactate: z.number().min(0).max(30),
  heartRate: z.number().int().min(30).max(250).optional(),
  notes: z.string().max(500).optional(),
})

export const deleteLapSchema = z.object({
  clientId: z.string().uuid(),
  intervalNumber: z.number().int().min(1),
})
