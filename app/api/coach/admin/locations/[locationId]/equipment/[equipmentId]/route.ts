// app/api/coach/admin/locations/[locationId]/equipment/[equipmentId]/route.ts
// Business admin: Manage single equipment item at a location

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireBusinessAdminRole } from '@/lib/auth-utils'
import { z } from 'zod'

const updateEquipmentSchema = z.object({
  quantity: z.number().int().positive().optional(),
  condition: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isAvailable: z.boolean().optional(),
  availableFrom: z.string().datetime().optional().nullable(),
  availableTo: z.string().datetime().optional().nullable(),
})

interface RouteParams {
  params: Promise<{ locationId: string; equipmentId: string }>
}

// PUT update equipment at location
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireBusinessAdminRole()
    const businessId = admin.businessId
    const { locationId, equipmentId } = await params

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

    // Find the location equipment record
    const existing = await prisma.locationEquipment.findFirst({
      where: { locationId, equipmentId }
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Equipment not found at this location' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const data = updateEquipmentSchema.parse(body)

    const updated = await prisma.locationEquipment.update({
      where: { id: existing.id },
      data: {
        ...(data.quantity !== undefined && { quantity: data.quantity }),
        ...(data.condition !== undefined && { condition: data.condition }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.isAvailable !== undefined && { isAvailable: data.isAvailable }),
        ...(data.availableFrom !== undefined && {
          availableFrom: data.availableFrom ? new Date(data.availableFrom) : null
        }),
        ...(data.availableTo !== undefined && {
          availableTo: data.availableTo ? new Date(data.availableTo) : null
        }),
      },
      include: { equipment: true }
    })

    // Update location capabilities if availability changed
    if (data.isAvailable !== undefined) {
      await updateLocationCapabilities(locationId)
    }

    return NextResponse.json({
      success: true,
      data: updated
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating location equipment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update equipment' },
      { status: 500 }
    )
  }
}

// DELETE remove equipment from location
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireBusinessAdminRole()
    const businessId = admin.businessId
    const { locationId, equipmentId } = await params

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

    // Find the location equipment record
    const existing = await prisma.locationEquipment.findFirst({
      where: { locationId, equipmentId }
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Equipment not found at this location' },
        { status: 404 }
      )
    }

    await prisma.locationEquipment.delete({
      where: { id: existing.id }
    })

    // Update location capabilities
    await updateLocationCapabilities(locationId)

    return NextResponse.json({
      success: true,
      message: 'Equipment removed from location'
    })
  } catch (error) {
    console.error('Error removing equipment from location:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to remove equipment' },
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
