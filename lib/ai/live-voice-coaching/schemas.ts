/**
 * Live Voice Coaching Zod Schemas
 */

import { z } from 'zod'

export const initSessionSchema = z.object({
  assignmentId: z.string().uuid(),
})

export const endSessionSchema = z.object({
  sessionId: z.string().uuid(),
  durationSeconds: z.number().int().min(0).max(7200),
  audioInputSeconds: z.number().min(0).max(7200),
  audioOutputSeconds: z.number().min(0).max(7200),
  segmentsCompleted: z.number().int().min(0),
  endReason: z.enum(['completed', 'user_cancelled', 'error', 'timeout']),
})

export type InitSessionInput = z.infer<typeof initSessionSchema>
export type EndSessionInput = z.infer<typeof endSessionSchema>
