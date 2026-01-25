// lib/agility-studio/equipment-filter.ts
// Equipment filtering utilities for agility drills

import { prisma } from '@/lib/prisma'
import type { AgilityDrill } from '@/types'

/**
 * Get available drills for a location based on its equipment
 */
export async function getAvailableDrillsForLocation(locationId: string): Promise<AgilityDrill[]> {
  // Get location's equipment
  const locationEquipment = await prisma.locationEquipment.findMany({
    where: {
      locationId,
      isAvailable: true
    },
    include: {
      equipment: true
    }
  })

  const availableEquipment = locationEquipment.map(le => le.equipment.name.toLowerCase())

  // Get all agility drills
  const allDrills = await prisma.agilityDrill.findMany({
    where: {
      OR: [
        { isSystemDrill: true },
        { coachId: null }
      ]
    }
  })

  // Filter drills that can be done with available equipment
  return allDrills.filter(drill => {
    // If no required equipment, drill is available
    if (drill.requiredEquipment.length === 0) {
      return true
    }

    // Check if all required equipment is available
    return drill.requiredEquipment.every(req =>
      availableEquipment.some(avail =>
        avail.includes(req.toLowerCase()) || req.toLowerCase().includes(avail)
      )
    )
  })
}

/**
 * Filter drills by available equipment (client-side)
 */
export function filterDrillsByEquipment(
  drills: AgilityDrill[],
  availableEquipment: string[]
): AgilityDrill[] {
  const normalizedEquipment = availableEquipment.map(e => e.toLowerCase())

  return drills.filter(drill => {
    if (drill.requiredEquipment.length === 0) {
      return true
    }

    return drill.requiredEquipment.every(req =>
      normalizedEquipment.some(avail =>
        avail.includes(req.toLowerCase()) || req.toLowerCase().includes(avail)
      )
    )
  })
}

/**
 * Calculate which equipment would unlock the most drills
 */
export function calculateEquipmentGaps(
  drills: AgilityDrill[],
  availableEquipment: string[]
): { equipment: string; unlockedDrills: number }[] {
  const normalizedEquipment = new Set(availableEquipment.map(e => e.toLowerCase()))

  // Find all unique required equipment across drills
  const allRequiredEquipment = new Set<string>()
  drills.forEach(drill => {
    drill.requiredEquipment.forEach(eq => {
      if (!normalizedEquipment.has(eq.toLowerCase())) {
        allRequiredEquipment.add(eq)
      }
    })
  })

  // Calculate how many drills each piece of equipment would unlock
  const equipmentImpact: { equipment: string; unlockedDrills: number }[] = []

  allRequiredEquipment.forEach(equipment => {
    // Simulate having this equipment
    const simulatedEquipment = new Set([...normalizedEquipment, equipment.toLowerCase()])

    // Count drills that would become available
    const unlockedCount = drills.filter(drill => {
      // Already available drills don't count
      if (drill.requiredEquipment.length === 0) return false
      if (drill.requiredEquipment.every(req => normalizedEquipment.has(req.toLowerCase()))) return false

      // Check if this drill would be unlocked with the new equipment
      return drill.requiredEquipment.every(req =>
        simulatedEquipment.has(req.toLowerCase())
      )
    }).length

    if (unlockedCount > 0) {
      equipmentImpact.push({ equipment, unlockedDrills: unlockedCount })
    }
  })

  // Sort by impact (most drills unlocked first)
  return equipmentImpact.sort((a, b) => b.unlockedDrills - a.unlockedDrills)
}

/**
 * Get drill categories available with current equipment
 */
export function getAvailableCategories(
  drills: AgilityDrill[],
  availableEquipment: string[]
): Record<string, number> {
  const available = filterDrillsByEquipment(drills, availableEquipment)

  const categories: Record<string, number> = {}
  available.forEach(drill => {
    categories[drill.category] = (categories[drill.category] || 0) + 1
  })

  return categories
}
