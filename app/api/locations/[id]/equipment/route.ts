/**
 * Location Equipment API
 *
 * GET /api/locations/[id]/equipment - Get equipment at a location
 *
 * Accessible by any authenticated user who belongs to the same business as the location.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: locationId } = await params

    // Get user's business membership
    const businessMember = await prisma.businessMember.findFirst({
      where: { userId: user.id },
    })

    // Get the location
    const location = await prisma.location.findUnique({
      where: { id: locationId },
    })

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    // Verify access: user must belong to the same business
    if (!businessMember || location.businessId !== businessMember.businessId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Fetch equipment at this location
    const locationEquipment = await prisma.locationEquipment.findMany({
      where: {
        locationId,
        isAvailable: true,
      },
      include: {
        equipment: true,
      },
    })

    const equipment = locationEquipment.map((le) => ({
      id: le.equipment.id,
      name: le.equipment.name,
      nameSv: le.equipment.nameSv,
      category: le.equipment.category,
      enablesExercises: le.equipment.enablesExercises,
      quantity: le.quantity,
      isAvailable: le.isAvailable,
    }))

    return NextResponse.json({ equipment })
  } catch (error) {
    console.error('Error fetching location equipment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
