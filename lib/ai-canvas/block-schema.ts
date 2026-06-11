import { z } from 'zod'

/**
 * Shared Zod schema for AI-generated canvas blocks. Used by the one-shot
 * generate endpoint, and as the input schema for the agent's addCanvasBlocks
 * tool, so every block that reaches the canvas UI passes the same validation.
 */
export const canvasBlockSchema = z.object({
  type: z.enum(['heading', 'text', 'checklist', 'table', 'insight', 'actions', 'metric-row', 'risk-list', 'trend-summary', 'chart']),
  title: z.string().trim().min(1).max(120).optional(),
  content: z.string().trim().max(1400).optional(),
  items: z.array(z.string().trim().min(1).max(180)).max(8).optional(),
  columns: z.array(z.string().trim().min(1).max(60)).max(5).optional(),
  rows: z.array(z.array(z.string().trim().min(1).max(180)).max(5)).max(8).optional(),
  metrics: z.array(z.object({
    label: z.string().trim().min(1).max(80),
    value: z.string().trim().min(1).max(80),
    detail: z.string().trim().max(140).optional(),
    tone: z.enum(['neutral', 'positive', 'warning', 'danger']).optional(),
  })).max(8).optional(),
  risks: z.array(z.object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(240),
    priority: z.enum(['low', 'medium', 'high']),
    meta: z.string().trim().max(140).optional(),
  })).max(10).optional(),
  trends: z.array(z.object({
    label: z.string().trim().min(1).max(100),
    value: z.string().trim().min(1).max(100),
    direction: z.enum(['up', 'down', 'flat']),
    detail: z.string().trim().max(180).optional(),
  })).max(10).optional(),
  chartType: z.enum(['bar', 'line']).optional(),
  unit: z.string().trim().max(24).optional(),
  points: z.array(z.object({
    label: z.string().trim().min(1).max(40),
    value: z.number().finite(),
    detail: z.string().trim().max(120).optional(),
  })).max(12).optional(),
  tone: z.enum(['neutral', 'positive', 'warning']).optional(),
  source: z.enum(['manual', 'ai', 'template', 'analytics']).optional(),
})

export type CanvasBlockInput = z.infer<typeof canvasBlockSchema>
