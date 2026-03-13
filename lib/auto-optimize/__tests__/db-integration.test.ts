/**
 * DB Integration Tests for AutoOptimize
 *
 * Tests variant CRUD and AccuracySnapshot storage against the real database.
 * Requires DATABASE_URL to be set.
 */

import { describe, it, expect, afterAll } from 'vitest'
import { prisma } from '@/lib/prisma'
import {
  createVariant,
  getActiveVariant,
  getVariant,
  getVariantHistory,
  listVariants,
  promoteVariant,
  deprecateVariant,
  updateVariantScores,
  addIterationToHistory,
} from '../prompt-variants'
import type { PromptSlot } from '../types'

// Track IDs for cleanup
const createdIds: string[] = []
const snapshotIds: string[] = []

afterAll(async () => {
  // Cleanup test records
  if (createdIds.length > 0) {
    await prisma.aIModelVersion.deleteMany({
      where: { id: { in: createdIds } },
    })
  }
  if (snapshotIds.length > 0) {
    await prisma.accuracySnapshot.deleteMany({
      where: { id: { in: snapshotIds } },
    })
  }
  await prisma.$disconnect()
})

describe('Prompt Variant CRUD', () => {
  const slot: PromptSlot = 'full_program'

  it('creates a variant in DEVELOPMENT status', async () => {
    const variant = await createVariant(slot, 'Test prompt template {{sport}} {{totalWeeks}}', {
      name: 'test-auto-optimize-v1',
    })
    createdIds.push(variant.id)

    expect(variant.id).toBeTruthy()
    expect(variant.status).toBe('DEVELOPMENT')
    expect(variant.slot).toBe('full_program')
    expect(variant.promptTemplate).toContain('{{sport}}')
    expect(variant.versionName).toBe('test-auto-optimize-v1')
  })

  it('retrieves variant by ID', async () => {
    const variant = await getVariant(createdIds[0])
    expect(variant).not.toBeNull()
    expect(variant!.id).toBe(createdIds[0])
    expect(variant!.slot).toBe('full_program')
  })

  it('lists variants for a slot', async () => {
    const variants = await listVariants({ slot })
    expect(variants.length).toBeGreaterThanOrEqual(1)
    expect(variants.some(v => v.id === createdIds[0])).toBe(true)
  })

  it('promotes DEVELOPMENT → TESTING', async () => {
    const promoted = await promoteVariant(createdIds[0])
    expect(promoted.status).toBe('TESTING')
  })

  it('promotes TESTING → ACTIVE', async () => {
    const promoted = await promoteVariant(createdIds[0])
    expect(promoted.status).toBe('ACTIVE')
  })

  it('getActiveVariant returns the promoted variant', async () => {
    const active = await getActiveVariant(slot)
    expect(active).not.toBeNull()
    expect(active!.id).toBe(createdIds[0])
    expect(active!.status).toBe('ACTIVE')
  })

  it('creating and promoting a second variant deprecates the first', async () => {
    const v2 = await createVariant(slot, 'Improved prompt v2 {{sport}}', {
      name: 'test-auto-optimize-v2',
      parentId: createdIds[0],
    })
    createdIds.push(v2.id)

    // Promote to TESTING then ACTIVE
    await promoteVariant(v2.id)
    await promoteVariant(v2.id)

    // v1 should now be DEPRECATED
    const v1 = await getVariant(createdIds[0])
    expect(v1!.status).toBe('DEPRECATED')

    // v2 should be ACTIVE
    const active = await getActiveVariant(slot)
    expect(active!.id).toBe(v2.id)
    expect(active!.status).toBe('ACTIVE')
  })

  it('updates variant scores', async () => {
    const id = createdIds[1] // v2, currently ACTIVE
    await updateVariantScores(id, 78.5, {
      structuralCompleteness: 85,
      progressiveOverload: 72,
      zoneDistribution: 80,
    }, {
      'running-polarized-12w-beginner': 82,
      'cycling-pyramidal-8w': 75,
    })

    const updated = await getVariant(id)
    expect(updated!.overallAccuracy).toBe(78.5)
    const params = updated!.parameters as Record<string, unknown>
    expect(params.lastEvaluationScores).toHaveProperty('structuralCompleteness', 85)
    expect(params.scenarioScores).toHaveProperty('running-polarized-12w-beginner', 82)
  })

  it('adds iteration to history', async () => {
    const id = createdIds[1]
    await addIterationToHistory(id, {
      runId: 'test_run_001',
      timestamp: new Date().toISOString(),
      decision: 'KEEP',
      candidateScore: 78.5,
      baselineScore: 72.0,
      delta: 6.5,
    })

    const variant = await getVariant(id)
    const params = variant!.parameters as Record<string, unknown>
    const history = params.iterationHistory as unknown[]
    expect(history).toHaveLength(1)
    expect((history[0] as Record<string, unknown>).runId).toBe('test_run_001')
  })

  it('getVariantHistory returns ordered list', async () => {
    const history = await getVariantHistory(slot)
    expect(history.length).toBeGreaterThanOrEqual(2)
    // Should be ordered by version number descending
    for (let i = 1; i < history.length; i++) {
      // Only check our test variants
      if (createdIds.includes(history[i].id) && createdIds.includes(history[i - 1].id)) {
        expect(history[i - 1].versionNumber).toBeGreaterThanOrEqual(history[i].versionNumber)
      }
    }
  })

  it('deprecates a variant', async () => {
    const deprecated = await deprecateVariant(createdIds[1])
    expect(deprecated.status).toBe('DEPRECATED')
  })
})

describe('AccuracySnapshot storage', () => {
  it('stores and retrieves an auto_optimize iteration snapshot', async () => {
    const snapshot = await prisma.accuracySnapshot.create({
      data: {
        periodStart: new Date(),
        periodEnd: new Date(),
        snapshotType: 'auto_optimize_iteration',
        programOutcomes: {
          type: 'auto_optimize',
          runId: 'test_snapshot_001',
          slot: 'full_program',
          candidateId: 'test-candidate',
          baselineId: 'test-baseline',
          candidateScore: 82.3,
          baselineScore: 75.1,
          delta: 7.2,
          decision: 'KEEP',
          scenarioCount: 13,
          timestamp: new Date().toISOString(),
        },
        overallSampleSize: 26,
        overallAccuracy: 82.3,
        confidenceLevel: 0.89,
      },
    })
    snapshotIds.push(snapshot.id)

    expect(snapshot.id).toBeTruthy()
    expect(snapshot.snapshotType).toBe('auto_optimize_iteration')

    // Retrieve it
    const retrieved = await prisma.accuracySnapshot.findUnique({
      where: { id: snapshot.id },
    })
    expect(retrieved).not.toBeNull()
    const outcomes = retrieved!.programOutcomes as Record<string, unknown>
    expect(outcomes.type).toBe('auto_optimize')
    expect(outcomes.decision).toBe('KEEP')
    expect(outcomes.candidateScore).toBe(82.3)
  })

  it('queries recent auto_optimize snapshots', async () => {
    const snapshots = await prisma.accuracySnapshot.findMany({
      where: { snapshotType: 'auto_optimize_iteration' },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    expect(snapshots.length).toBeGreaterThanOrEqual(1)
    expect(snapshots[0].snapshotType).toBe('auto_optimize_iteration')
  })
})
