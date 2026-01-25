// app/api/agility-drills/available/route.ts
// Returns drills filtered by location's available equipment

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import {
  filterDrillsByEquipment,
  calculateEquipmentGaps,
  getAvailableCategories
} from '@/lib/agility-studio/equipment-filter'
import type { AgilityDrillCategory, DevelopmentStage } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const locationId = searchParams.get('locationId')
    const category = searchParams.get('category') as AgilityDrillCategory | null
    const developmentStage = searchParams.get('developmentStage') as DevelopmentStage | null
    const includeGapAnalysis = searchParams.get('includeGapAnalysis') === 'true'

    // Get all drills (system drills and coach's custom drills)
    const allDrills = await prisma.agilityDrill.findMany({
      where: {
        OR: [
          { isSystemDrill: true },
          { coachId: user.id }
        ],
        ...(category && { category }),
        ...(developmentStage && {
          minDevelopmentStage: { lte: developmentStage },
          maxDevelopmentStage: { gte: developmentStage }
        })
      },
      orderBy: [
        { category: 'asc' },
        { difficultyLevel: 'asc' },
        { name: 'asc' }
      ]
    })

    // If no location specified, return all drills
    if (!locationId) {
      return NextResponse.json({
        drills: allDrills,
        totalDrills: allDrills.length,
        availableDrills: allDrills.length,
        categoryCounts: getAvailableCategories(allDrills, [])
      })
    }

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

    const availableEquipment = locationEquipment.map(le => le.equipment.name)

    // Filter drills by available equipment
    const availableDrills = filterDrillsByEquipment(allDrills, availableEquipment)

    // Get category distribution
    const categoryCounts = getAvailableCategories(allDrills, availableEquipment)

    // Build response
    const response: {
      drills: typeof availableDrills
      totalDrills: number
      availableDrills: number
      availableEquipment: string[]
      categoryCounts: Record<string, number>
      equipmentGaps?: { equipment: string; unlockedDrills: number }[]
    } = {
      drills: availableDrills,
      totalDrills: allDrills.length,
      availableDrills: availableDrills.length,
      availableEquipment,
      categoryCounts
    }

    // Include equipment gap analysis if requested
    if (includeGapAnalysis) {
      const gaps = calculateEquipmentGaps(allDrills, availableEquipment)
      response.equipmentGaps = gaps.slice(0, 5) // Top 5 equipment to add
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching available drills:', error)
    return NextResponse.json(
      { error: 'Failed to fetch available drills' },
      { status: 500 }
    )
  }
}
