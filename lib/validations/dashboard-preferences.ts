/**
 * Zod schemas for dashboard preference API requests.
 */
import { z } from 'zod'
import { WIDGET_REGISTRY } from '@/lib/dashboard/widget-registry'

const widgetKeySchema = z.string().refine(k => Boolean(WIDGET_REGISTRY[k]), {
  message: 'Unknown widget key',
})

export const widgetPreferenceSchema = z.object({
  widgetKey: widgetKeySchema,
  visible: z.boolean(),
  order: z.number().int().min(0).max(10000).optional(),
})

export const updatePreferencesSchema = z.object({
  role: z.enum(['ATHLETE', 'COACH']),
  mode: z.enum(['PT', 'TEAM', 'GYM']).nullish(),
  sport: z.string().nullish(), // SportType enum, validated downstream
  preferences: z.array(widgetPreferenceSchema).max(200),
})

export const widgetTemplateEntrySchema = z.object({
  widgetKey: widgetKeySchema,
  visible: z.boolean(),
  order: z.number().int().min(0).max(10000),
})

export const upsertCoachTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  scope: z.enum(['BUSINESS_DEFAULT', 'TEAM', 'INDIVIDUAL']),
  targetId: z.string().nullish(),
  sport: z.string().nullish(),
  widgets: z.array(widgetTemplateEntrySchema).max(200),
}).refine(
  data => data.scope === 'BUSINESS_DEFAULT' || Boolean(data.targetId),
  { message: 'targetId required for TEAM and INDIVIDUAL scopes', path: ['targetId'] }
)

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>
export type UpsertCoachTemplateInput = z.infer<typeof upsertCoachTemplateSchema>
