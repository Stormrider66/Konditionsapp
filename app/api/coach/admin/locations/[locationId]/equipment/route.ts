// app/api/coach/admin/locations/[locationId]/equipment/route.ts
// Business admin: Manage equipment at a location

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireBusinessAdminRole } from '@/lib/auth-utils'
import { z } from 'zod'

const addEquipmentSchema = z.object({
  equipmentId: z.string().uuid('Invalid equipment ID'),
  quantity: z.number().int().positive().default(1),
  condition: z.string().optional(),
  notes: z.string().optional(),
  isAvailable: z.boolean().default(true),
  availableFrom: z.string().datetime().optional(),
  availableTo: z.string().datetime().optional(),
})

interface RouteParams {
  params: Promise<{ locationId: string }>
}

// GET all equipment at a location
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireBusinessAdminRole()
    const businessId = admin.businessId
    const { locationId } = await params

    // Verify location belongs to business
    const location = await prisma.location.findFirst({
      where: { id: locationId, businessId }
    })

    if (!location) {
      return NextResponse.json(
        { success: false, error: 'Location not found' },
        { status: 404 }
      )
    }

    const locationEquipment = await prisma.locationEquipment.findMany({
      where: { locationId },
      include: {
        equipment: true
      },
      orderBy: {
        equipment: { category: 'asc' }
      }
    })

    // Group by category
    const grouped = locationEquipment.reduce((acc, item) => {
      const category = item.equipment.category
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(item)
      return acc
    }, {} as Record<string, typeof locationEquipment>)

    return NextResponse.json({
      success: true,
      data: {
        equipment: locationEquipment,
        grouped,
        total: locationEquipment.length
      }
    })
  } catch (error) {
    console.error('Error fetching location equipment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch location equipment' },
      { status: 500 }
    )
  }
}

// POST add equipment to a location
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireBusinessAdminRole()
    const businessId = admin.businessId
    const { locationId } = await params

    // Verify location belongs to business
    const location = await prisma.location.findFirst({
      where: { id: locationId, businessId }
    })

    if (!location) {
      return NextResponse.json(
        { success: false, error: 'Location not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const data = addEquipmentSchema.parse(body)

    // Verify equipment exists
    const equipment = await prisma.equipment.findUnique({
      where: { id: data.equipmentId }
    })

    if (!equipment) {
      return NextResponse.json(
        { success: false, error: 'Equipment not found in catalog' },
        { status: 404 }
      )
    }

    // Check if already exists
    const existing = await prisma.locationEquipment.findFirst({
      where: { locationId, equipmentId: data.equipmentId }
    })

    if (existing) {
      // Update quantity instead
      const updated = await prisma.locationEquipment.update({
        where: { id: existing.id },
        data: {
          quantity: existing.quantity + data.quantity,
          condition: data.condition || existing.condition,
          notes: data.notes || existing.notes,
          isAvailable: data.isAvailable,
        },
        include: { equipment: true }
      })

      return NextResponse.json({
        success: true,
        data: updated,
        message: 'Equipment quantity updated'
      })
    }

    const locationEquipment = await prisma.locationEquipment.create({
      data: {
        locationId,
        equipmentId: data.equipmentId,
        quantity: data.quantity,
        condition: data.condition,
        notes: data.notes,
        isAvailable: data.isAvailable,
        availableFrom: data.availableFrom ? new Date(data.availableFrom) : null,
        availableTo: data.availableTo ? new Date(data.availableTo) : null,
      },
      include: { equipment: true }
    })

    // Update location capabilities based on equipment
    await updateLocationCapabilities(locationId)

    return NextResponse.json({
      success: true,
      data: locationEquipment
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error adding equipment to location:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to add equipment' },
      { status: 500 }
    )
  }
}

// Helper to update location capabilities based on equipment
async function updateLocationCapabilities(locationId: string) {
  const locationEquipment = await prisma.locationEquipment.findMany({
    where: { locationId, isAvailable: true },
    include: { equipment: true }
  })

  // Collect all enabled tests and exercises
  const capabilities = new Set<string>()

  for (const le of locationEquipment) {
    for (const test of le.equipment.enablesTests) {
      capabilities.add(test)
    }
    for (const exercise of le.equipment.enablesExercises) {
      capabilities.add(exercise)
    }
  }

  // Add category-based capabilities
  const categories = new Set(locationEquipment.map(le => le.equipment.category))
  if (categories.has('CARDIO_MACHINE')) capabilities.add('cardio_training')
  if (categories.has('STRENGTH_MACHINE') || categories.has('FREE_WEIGHTS')) capabilities.add('strength_training')
  if (categories.has('TESTING')) capabilities.add('testing')
  if (categories.has('RECOVERY')) capabilities.add('recovery')

  await prisma.location.update({
    where: { id: locationId },
    data: { capabilities: Array.from(capabilities) }
  })
}
