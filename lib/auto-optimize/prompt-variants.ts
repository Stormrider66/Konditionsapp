/**
 * Prompt Variant System
 *
 * CRUD layer over AIModelVersion for managing prompt variants.
 * Scoped to modelType = 'program_generation'.
 */

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { PromptSlot, PromptVariant, VariantParameters } from './types'

const MODEL_TYPE = 'program_generation'

// ── Read ────────────────────────────────────────────────────────────

/**
 * Get the currently ACTIVE variant for a prompt slot.
 */
export async function getActiveVariant(slot: PromptSlot): Promise<PromptVariant | null> {
  const record = await prisma.aIModelVersion.findFirst({
    where: {
      modelType: `${MODEL_TYPE}_${slot}`,
      status: 'ACTIVE',
    },
    orderBy: { versionNumber: 'desc' },
  })

  return record ? toPromptVariant(record) : null
}

/**
 * Get variant by ID.
 */
export async function getVariant(id: string): Promise<PromptVariant | null> {
  const record = await prisma.aIModelVersion.findUnique({
    where: { id },
  })
  return record ? toPromptVariant(record) : null
}

/**
 * Get full version chain for a slot, ordered by version number desc.
 */
export async function getVariantHistory(
  slot: PromptSlot,
  limit = 20
): Promise<PromptVariant[]> {
  const records = await prisma.aIModelVersion.findMany({
    where: { modelType: `${MODEL_TYPE}_${slot}` },
    orderBy: { versionNumber: 'desc' },
    take: limit,
  })
  return records.map(toPromptVariant)
}

/**
 * List all variants across all slots.
 */
export async function listVariants(options?: {
  slot?: PromptSlot
  status?: 'DEVELOPMENT' | 'TESTING' | 'ACTIVE' | 'DEPRECATED' | 'ARCHIVED'
  limit?: number
}): Promise<PromptVariant[]> {
  const where: Record<string, unknown> = {
    modelType: options?.slot
      ? `${MODEL_TYPE}_${options.slot}`
      : { startsWith: MODEL_TYPE },
  }
  if (options?.status) {
    where.status = options.status
  }

  const records = await prisma.aIModelVersion.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: options?.limit ?? 50,
  })
  return records.map(toPromptVariant)
}

// ── Create ──────────────────────────────────────────────────────────

/**
 * Create a new prompt variant in DEVELOPMENT status.
 */
export async function createVariant(
  slot: PromptSlot,
  template: string,
  options?: {
    name?: string
    parentId?: string
    parameters?: Partial<VariantParameters>
  }
): Promise<PromptVariant> {
  // Get next version number for this slot
  const lastVersion = await prisma.aIModelVersion.findFirst({
    where: { modelType: `${MODEL_TYPE}_${slot}` },
    orderBy: { versionNumber: 'desc' },
    select: { versionNumber: true },
  })

  const nextVersion = (lastVersion?.versionNumber ?? 0) + 1

  const record = await prisma.aIModelVersion.create({
    data: {
      versionName: options?.name || `${slot}-v${nextVersion}`,
      versionNumber: nextVersion,
      modelType: `${MODEL_TYPE}_${slot}`,
      promptTemplate: template,
      status: 'DEVELOPMENT',
      parameters: {
        slot,
        ...options?.parameters,
      } as Prisma.JsonObject,
      ...(options?.parentId && { previousVersionId: options.parentId }),
    },
  })

  return toPromptVariant(record)
}

// ── Promote / Demote ────────────────────────────────────────────────

/**
 * Promote a variant: DEVELOPMENT → TESTING → ACTIVE.
 * When promoting to ACTIVE, demotes the current ACTIVE variant to DEPRECATED.
 */
export async function promoteVariant(id: string): Promise<PromptVariant> {
  const variant = await prisma.aIModelVersion.findUniqueOrThrow({ where: { id } })
  const slot = extractSlot(variant.modelType)

  if (variant.status === 'DEVELOPMENT') {
    // DEVELOPMENT → TESTING
    const updated = await prisma.aIModelVersion.update({
      where: { id },
      data: { status: 'TESTING' },
    })
    return toPromptVariant(updated)
  }

  if (variant.status === 'TESTING') {
    // TESTING → ACTIVE, demote current ACTIVE
    const updated = await prisma.$transaction(async (tx) => {
      // Demote current active
      await tx.aIModelVersion.updateMany({
        where: {
          modelType: variant.modelType,
          status: 'ACTIVE',
        },
        data: {
          status: 'DEPRECATED',
          deprecatedAt: new Date(),
        },
      })

      // Promote candidate
      return tx.aIModelVersion.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          deployedAt: new Date(),
        },
      })
    })

    return toPromptVariant(updated)
  }

  throw new Error(`Cannot promote variant with status ${variant.status}`)
}

/**
 * Deprecate a variant (set status to DEPRECATED).
 */
export async function deprecateVariant(id: string): Promise<PromptVariant> {
  const updated = await prisma.aIModelVersion.update({
    where: { id },
    data: {
      status: 'DEPRECATED',
      deprecatedAt: new Date(),
    },
  })
  return toPromptVariant(updated)
}

// ── Update ──────────────────────────────────────────────────────────

/**
 * Update variant scores after evaluation.
 */
export async function updateVariantScores(
  id: string,
  overallScore: number,
  criteriaScores: Record<string, number>,
  scenarioScores?: Record<string, number>
): Promise<void> {
  const variant = await prisma.aIModelVersion.findUniqueOrThrow({ where: { id } })
  const currentParams = (variant.parameters as Prisma.JsonObject) || {}

  await prisma.aIModelVersion.update({
    where: { id },
    data: {
      overallAccuracy: overallScore,
      parameters: {
        ...currentParams,
        lastEvaluationScores: criteriaScores,
        ...(scenarioScores && { scenarioScores }),
      } as Prisma.JsonObject,
    },
  })
}

/**
 * Add iteration summary to variant history.
 */
export async function addIterationToHistory(
  id: string,
  summary: { runId: string; timestamp: string; decision: string; candidateScore: number; baselineScore: number; delta: number }
): Promise<void> {
  const variant = await prisma.aIModelVersion.findUniqueOrThrow({ where: { id } })
  const currentParams = (variant.parameters as Prisma.JsonObject) || {}
  const history = (currentParams.iterationHistory as Prisma.JsonArray) || []

  await prisma.aIModelVersion.update({
    where: { id },
    data: {
      parameters: {
        ...currentParams,
        iterationHistory: [...history, summary as unknown as Prisma.JsonValue],
      } as Prisma.JsonObject,
    },
  })
}

// ── Helpers ─────────────────────────────────────────────────────────

function extractSlot(modelType: string): PromptSlot {
  const suffix = modelType.replace(`${MODEL_TYPE}_`, '')
  if (['system', 'outline', 'phase', 'full_program'].includes(suffix)) {
    return suffix as PromptSlot
  }
  return 'full_program'
}

function toPromptVariant(record: {
  id: string
  versionName: string
  versionNumber: number
  modelType: string
  promptTemplate: string | null
  status: string
  overallAccuracy: number | null
  parameters: unknown
  previousVersionId: string | null
  createdAt: Date
  updatedAt: Date
}): PromptVariant {
  return {
    id: record.id,
    versionName: record.versionName,
    versionNumber: record.versionNumber,
    promptTemplate: record.promptTemplate || '',
    slot: extractSlot(record.modelType),
    status: record.status as PromptVariant['status'],
    overallAccuracy: record.overallAccuracy,
    parameters: record.parameters as VariantParameters | null,
    previousVersionId: record.previousVersionId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}
