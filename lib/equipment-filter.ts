// lib/equipment-filter.ts
// Shared equipment filtering utilities for workout builders
// Modeled after lib/agility-studio/equipment-filter.ts

import { prisma } from '@/lib/prisma'

// ============================================
// EQUIPMENT NAME MAPPING
// ============================================

/**
 * Maps Swedish equipment strings in exercises to English catalog names.
 * Used for fuzzy matching between exercise.equipment field and Equipment catalog.
 */
export const EQUIPMENT_NAME_MAP: Record<string, string[]> = {
  'Skivstång': ['Olympic Barbell', 'Barbell', 'EZ Curl Bar'],
  'Hantlar': ['Dumbbells'],
  'Hantel': ['Dumbbells'],
  'Kettlebell': ['Kettlebells'],
  'Kabelmaskin': ['Cable Machine'],
  'Kabel': ['Cable Machine'],
  'Bänk': ['Bench'],
  'Benpress-maskin': ['Leg Press'],
  'Benextensionsmaskin': ['Leg Extension Machine'],
  'Bencurlmaskin': ['Leg Curl Machine'],
  'Hack squat-maskin': ['Hack Squat Machine'],
  'Belt squat-maskin': ['Belt Squat'],
  'GHD': ['GHD'],
  'Chinsstång': ['Pull-up Rig'],
  'Motståndsband': ['Resistance Bands'],
  'Resistance band': ['Resistance Bands'],
  'EZ-stång': ['EZ Curl Bar'],
  'Plyobox': ['Plyo Boxes'],
  'Steglåda': ['Plyo Boxes'],
  'Hopprep': ['Jump Rope'],
  'Gymnastikboll': ['Stability Ball'],
  'Ab wheel': ['Ab Wheel'],
  'Rack': ['Power Rack'],
  'Ingen': [], // Bodyweight - always available
}

// ============================================
// SERVER-SIDE FUNCTIONS
// ============================================

/**
 * Get equipment list for a location
 */
export async function getLocationEquipmentList(locationId: string) {
  const locationEquipment = await prisma.locationEquipment.findMany({
    where: {
      locationId,
      isAvailable: true,
    },
    include: {
      equipment: true,
    },
  })

  return locationEquipment.map((le) => ({
    id: le.equipment.id,
    name: le.equipment.name,
    nameSv: le.equipment.nameSv,
    category: le.equipment.category,
    enablesExercises: le.equipment.enablesExercises,
    quantity: le.quantity,
    isAvailable: le.isAvailable,
  }))
}

/**
 * Get exercises that can be done at a location based on its equipment
 */
export async function getAvailableExercisesForLocation(locationId: string) {
  const equipment = await getLocationEquipmentList(locationId)
  const equipmentNames = equipment.map((e) => e.name.toLowerCase())

  const allExercises = await prisma.exercise.findMany({
    where: {
      OR: [{ isPublic: true }, { coachId: null }],
    },
  })

  return allExercises.filter((exercise) => {
    return exerciseMatchesEquipment(exercise.equipment || '', equipmentNames)
  })
}

/**
 * Get hybrid movements that can be done at a location
 */
export async function getAvailableMovementsForLocation(locationId: string) {
  const equipment = await getLocationEquipmentList(locationId)
  const equipmentTypes = new Set(
    equipment.flatMap((e) => e.enablesExercises)
  )

  const allMovements = await prisma.exercise.findMany({
    where: {
      isHybridMovement: true,
      OR: [{ isPublic: true }, { coachId: null }],
    },
  })

  return allMovements.filter((movement) => {
    if (!movement.equipmentTypes || movement.equipmentTypes.length === 0) {
      return true
    }
    // Check if movement uses BODYWEIGHT or RUNNING (always available)
    if (movement.equipmentTypes.some((t: string) => ['BODYWEIGHT', 'RUNNING'].includes(t))) {
      return true
    }
    return movement.equipmentTypes.some((t: string) =>
      equipmentTypes.has(t.toLowerCase())
    )
  })
}

// ============================================
// CLIENT-SIDE FUNCTIONS
// ============================================

/**
 * Check if an exercise can be done with available equipment
 */
function exerciseMatchesEquipment(
  exerciseEquipment: string,
  availableEquipmentNames: string[]
): boolean {
  // No equipment needed
  if (!exerciseEquipment || exerciseEquipment === 'Ingen' || exerciseEquipment === 'None') {
    return true
  }

  const normalizedAvailable = availableEquipmentNames.map((n) => n.toLowerCase())

  // Check each piece of equipment the exercise needs
  const requiredPieces = exerciseEquipment.split(',').map((p) => p.trim())

  return requiredPieces.every((piece) => {
    const pieceLower = piece.toLowerCase()

    // Check direct match
    if (normalizedAvailable.some((avail) => avail.includes(pieceLower) || pieceLower.includes(avail))) {
      return true
    }

    // Check via mapping
    const mappedNames = EQUIPMENT_NAME_MAP[piece]
    if (mappedNames) {
      if (mappedNames.length === 0) return true // Bodyweight
      return mappedNames.some((mapped) =>
        normalizedAvailable.some((avail) => avail.includes(mapped.toLowerCase()))
      )
    }

    // Optional equipment markers
    if (pieceLower.includes('valfritt') || pieceLower.includes('optional')) {
      return true
    }

    return false
  })
}

/**
 * Filter exercises by available equipment (client-side)
 */
export function filterExercisesByEquipment(
  exercises: { equipment?: string; [key: string]: unknown }[],
  availableEquipmentNames: string[]
): typeof exercises {
  const normalizedNames = availableEquipmentNames.map((n) => n.toLowerCase())

  return exercises.filter((ex) => {
    return exerciseMatchesEquipment(ex.equipment as string || '', normalizedNames)
  })
}

/**
 * Filter hybrid movements by equipment types (client-side)
 */
export function filterMovementsByEquipment(
  movements: { equipmentTypes?: string[]; [key: string]: unknown }[],
  availableEquipmentTypes: string[]
): typeof movements {
  const normalizedTypes = new Set(availableEquipmentTypes.map((t) => t.toLowerCase()))

  return movements.filter((movement) => {
    if (!movement.equipmentTypes || movement.equipmentTypes.length === 0) {
      return true
    }
    if ((movement.equipmentTypes as string[]).some((t) => ['bodyweight', 'running'].includes(t.toLowerCase()))) {
      return true
    }
    return (movement.equipmentTypes as string[]).some((t) => normalizedTypes.has(t.toLowerCase()))
  })
}

/**
 * Calculate which equipment would unlock the most exercises
 */
export function calculateExerciseEquipmentGaps(
  exercises: { equipment?: string; [key: string]: unknown }[],
  availableEquipmentNames: string[]
): { equipment: string; unlockedExercises: number }[] {
  const normalizedAvailable = new Set(availableEquipmentNames.map((n) => n.toLowerCase()))

  // Find all unique equipment requirements
  const allRequiredEquipment = new Set<string>()
  exercises.forEach((ex) => {
    const eq = (ex.equipment as string) || ''
    if (eq && eq !== 'Ingen' && eq !== 'None') {
      eq.split(',').forEach((piece) => {
        const trimmed = piece.trim()
        if (trimmed && !normalizedAvailable.has(trimmed.toLowerCase())) {
          allRequiredEquipment.add(trimmed)
        }
      })
    }
  })

  const equipmentImpact: { equipment: string; unlockedExercises: number }[] = []

  allRequiredEquipment.forEach((equipment) => {
    const simulatedEquipment = [...Array.from(normalizedAvailable), equipment.toLowerCase()]
    const unlockedCount = exercises.filter((ex) => {
      const eq = (ex.equipment as string) || ''
      if (!eq || eq === 'Ingen') return false
      if (exerciseMatchesEquipment(eq, Array.from(normalizedAvailable))) return false
      return exerciseMatchesEquipment(eq, simulatedEquipment)
    }).length

    if (unlockedCount > 0) {
      equipmentImpact.push({ equipment, unlockedExercises: unlockedCount })
    }
  })

  return equipmentImpact.sort((a, b) => b.unlockedExercises - a.unlockedExercises)
}
