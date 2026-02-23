/**
 * Tests for Agility Studio Equipment Filter Utilities
 *
 * Tests the following functions:
 * - filterDrillsByEquipment - Client-side drill filtering
 * - calculateEquipmentGaps - Equipment gap analysis
 * - getAvailableCategories - Category counting
 */

import { describe, it, expect } from 'vitest'
import {
  filterDrillsByEquipment,
  calculateEquipmentGaps,
  getAvailableCategories
} from '@/lib/agility-studio/equipment-filter'
import type { AgilityDrill } from '@/types'

// Mock drill data for testing
const createMockDrill = (overrides: Partial<AgilityDrill> = {}): AgilityDrill => ({
  id: 'drill-1',
  name: 'Test Drill',
  nameSv: 'Test Övning',
  description: 'Test description',
  descriptionSv: 'Test beskrivning',
  category: 'COD',
  requiredEquipment: [],
  optionalEquipment: [],
  distanceMeters: 10,
  durationSeconds: null,
  defaultReps: null,
  defaultSets: null,
  restSeconds: null,
  minDevelopmentStage: 'FUNDAMENTALS',
  maxDevelopmentStage: 'ELITE',
  primarySports: [],
  difficultyLevel: 3,
  videoUrl: null,
  animationUrl: null,
  diagramUrl: null,
  setupInstructions: null,
  executionCues: [],
  progressionDrillId: null,
  regressionDrillId: null,
  coachId: null,
  isSystemDrill: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
})

describe('filterDrillsByEquipment', () => {
  it('should return all drills when no equipment is required', () => {
    const drills = [
      createMockDrill({ id: '1', requiredEquipment: [] }),
      createMockDrill({ id: '2', requiredEquipment: [] }),
      createMockDrill({ id: '3', requiredEquipment: [] })
    ]

    const result = filterDrillsByEquipment(drills, [])
    expect(result).toHaveLength(3)
  })

  it('should filter drills based on available equipment', () => {
    const drills = [
      createMockDrill({ id: '1', name: 'Cone Drill', requiredEquipment: ['cones'] }),
      createMockDrill({ id: '2', name: 'Ladder Drill', requiredEquipment: ['ladder'] }),
      createMockDrill({ id: '3', name: 'No Equipment', requiredEquipment: [] })
    ]

    const result = filterDrillsByEquipment(drills, ['cones'])
    expect(result).toHaveLength(2)
    expect(result.map(d => d.name)).toContain('Cone Drill')
    expect(result.map(d => d.name)).toContain('No Equipment')
    expect(result.map(d => d.name)).not.toContain('Ladder Drill')
  })

  it('should handle case-insensitive equipment matching', () => {
    const drills = [
      createMockDrill({ id: '1', requiredEquipment: ['Agility Cones'] }),
      createMockDrill({ id: '2', requiredEquipment: ['LADDER'] })
    ]

    const result = filterDrillsByEquipment(drills, ['agility cones', 'ladder'])
    expect(result).toHaveLength(2)
  })

  it('should handle partial equipment name matching', () => {
    const drills = [
      createMockDrill({ id: '1', requiredEquipment: ['cones'] }),
      createMockDrill({ id: '2', requiredEquipment: ['agility ladder'] })
    ]

    const result = filterDrillsByEquipment(drills, ['agility cones', 'agility ladder'])
    expect(result).toHaveLength(2)
  })

  it('should require ALL equipment for multi-equipment drills', () => {
    const drills = [
      createMockDrill({ id: '1', requiredEquipment: ['cones', 'ladder', 'hurdles'] })
    ]

    // Only have 2 of 3 required items
    const result = filterDrillsByEquipment(drills, ['cones', 'ladder'])
    expect(result).toHaveLength(0)
  })

  it('should pass when all required equipment is available', () => {
    const drills = [
      createMockDrill({ id: '1', requiredEquipment: ['cones', 'ladder', 'hurdles'] })
    ]

    const result = filterDrillsByEquipment(drills, ['cones', 'ladder', 'hurdles', 'extra stuff'])
    expect(result).toHaveLength(1)
  })

  it('should return empty array when no drills match available equipment', () => {
    const drills = [
      createMockDrill({ id: '1', requiredEquipment: ['timing gates'] }),
      createMockDrill({ id: '2', requiredEquipment: ['reaction lights'] })
    ]

    const result = filterDrillsByEquipment(drills, ['cones'])
    expect(result).toHaveLength(0)
  })

  it('should handle empty drills array', () => {
    const result = filterDrillsByEquipment([], ['cones', 'ladder'])
    expect(result).toHaveLength(0)
  })
})

describe('calculateEquipmentGaps', () => {
  it('should identify equipment that would unlock drills', () => {
    const drills = [
      createMockDrill({ id: '1', requiredEquipment: ['cones'] }),
      createMockDrill({ id: '2', requiredEquipment: ['ladder'] }),
      createMockDrill({ id: '3', requiredEquipment: ['ladder'] }),
      createMockDrill({ id: '4', requiredEquipment: [] })
    ]

    const gaps = calculateEquipmentGaps(drills, [])

    // Ladder should unlock 2 drills, cones should unlock 1
    expect(gaps.length).toBeGreaterThanOrEqual(2)

    const ladderGap = gaps.find(g => g.equipment.toLowerCase() === 'ladder')
    const conesGap = gaps.find(g => g.equipment.toLowerCase() === 'cones')

    expect(ladderGap?.unlockedDrills).toBe(2)
    expect(conesGap?.unlockedDrills).toBe(1)
  })

  it('should sort results by impact (most drills unlocked first)', () => {
    const drills = [
      createMockDrill({ id: '1', requiredEquipment: ['ladder'] }),
      createMockDrill({ id: '2', requiredEquipment: ['ladder'] }),
      createMockDrill({ id: '3', requiredEquipment: ['ladder'] }),
      createMockDrill({ id: '4', requiredEquipment: ['cones'] }),
      createMockDrill({ id: '5', requiredEquipment: ['hurdles'] }),
      createMockDrill({ id: '6', requiredEquipment: ['hurdles'] })
    ]

    const gaps = calculateEquipmentGaps(drills, [])

    // Should be sorted: ladder (3), hurdles (2), cones (1)
    expect(gaps[0].equipment.toLowerCase()).toBe('ladder')
    expect(gaps[0].unlockedDrills).toBe(3)
    expect(gaps[1].equipment.toLowerCase()).toBe('hurdles')
    expect(gaps[1].unlockedDrills).toBe(2)
    expect(gaps[2].equipment.toLowerCase()).toBe('cones')
    expect(gaps[2].unlockedDrills).toBe(1)
  })

  it('should not include equipment already available', () => {
    const drills = [
      createMockDrill({ id: '1', requiredEquipment: ['cones'] }),
      createMockDrill({ id: '2', requiredEquipment: ['ladder'] })
    ]

    const gaps = calculateEquipmentGaps(drills, ['cones'])

    // Should only suggest ladder, not cones
    expect(gaps.map(g => g.equipment.toLowerCase())).not.toContain('cones')
    expect(gaps.map(g => g.equipment.toLowerCase())).toContain('ladder')
  })

  it('should handle multi-equipment drills correctly', () => {
    const drills = [
      createMockDrill({ id: '1', requiredEquipment: ['cones', 'ladder'] }),
      createMockDrill({ id: '2', requiredEquipment: ['cones'] })
    ]

    // Already have cones, need ladder to unlock drill 1
    const gaps = calculateEquipmentGaps(drills, ['cones'])

    const ladderGap = gaps.find(g => g.equipment.toLowerCase() === 'ladder')
    expect(ladderGap?.unlockedDrills).toBe(1)
  })

  it('should return empty array when all drills are available', () => {
    const drills = [
      createMockDrill({ id: '1', requiredEquipment: [] }),
      createMockDrill({ id: '2', requiredEquipment: ['cones'] })
    ]

    const gaps = calculateEquipmentGaps(drills, ['cones', 'ladder', 'hurdles'])
    expect(gaps).toHaveLength(0)
  })

  it('should return empty array for drills with no equipment requirements', () => {
    const drills = [
      createMockDrill({ id: '1', requiredEquipment: [] }),
      createMockDrill({ id: '2', requiredEquipment: [] })
    ]

    const gaps = calculateEquipmentGaps(drills, [])
    expect(gaps).toHaveLength(0)
  })
})

describe('getAvailableCategories', () => {
  it('should count drills by category', () => {
    const drills = [
      createMockDrill({ id: '1', category: 'COD', requiredEquipment: [] }),
      createMockDrill({ id: '2', category: 'COD', requiredEquipment: [] }),
      createMockDrill({ id: '3', category: 'SPEED_ACCELERATION', requiredEquipment: [] }),
      createMockDrill({ id: '4', category: 'PLYOMETRICS', requiredEquipment: [] })
    ]

    const categories = getAvailableCategories(drills, [])

    expect(categories['COD']).toBe(2)
    expect(categories['SPEED_ACCELERATION']).toBe(1)
    expect(categories['PLYOMETRICS']).toBe(1)
  })

  it('should only count available drills', () => {
    const drills = [
      createMockDrill({ id: '1', category: 'COD', requiredEquipment: [] }),
      createMockDrill({ id: '2', category: 'COD', requiredEquipment: ['ladder'] }),
      createMockDrill({ id: '3', category: 'COD', requiredEquipment: ['timing gates'] })
    ]

    const categories = getAvailableCategories(drills, ['ladder'])

    // Only 2 COD drills are available (no equipment + ladder)
    expect(categories['COD']).toBe(2)
  })

  it('should return empty object for no available drills', () => {
    const drills = [
      createMockDrill({ id: '1', category: 'COD', requiredEquipment: ['timing gates'] })
    ]

    const categories = getAvailableCategories(drills, [])
    expect(Object.keys(categories)).toHaveLength(0)
  })

  it('should handle all category types', () => {
    const drills = [
      createMockDrill({ id: '1', category: 'COD', requiredEquipment: [] }),
      createMockDrill({ id: '2', category: 'REACTIVE_AGILITY', requiredEquipment: [] }),
      createMockDrill({ id: '3', category: 'SPEED_ACCELERATION', requiredEquipment: [] }),
      createMockDrill({ id: '4', category: 'PLYOMETRICS', requiredEquipment: [] }),
      createMockDrill({ id: '5', category: 'FOOTWORK', requiredEquipment: [] }),
      createMockDrill({ id: '6', category: 'BALANCE', requiredEquipment: [] })
    ]

    const categories = getAvailableCategories(drills, [])

    expect(categories['COD']).toBe(1)
    expect(categories['REACTIVE_AGILITY']).toBe(1)
    expect(categories['SPEED_ACCELERATION']).toBe(1)
    expect(categories['PLYOMETRICS']).toBe(1)
    expect(categories['FOOTWORK']).toBe(1)
    expect(categories['BALANCE']).toBe(1)
  })
})
