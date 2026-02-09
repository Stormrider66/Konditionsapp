/**
 * Athlete Preferred Location Settings
 *
 * GET /api/athlete/settings/preferred-location
 *   - Returns available locations for the athlete's business
 *   - Returns current preferred location
 *
 * PATCH /api/athlete/settings/preferred-location
 *   - Updates the athlete's preferred gym location
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const resolved = await resolveAthleteClientId()

    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user, clientId } = resolved

    // Get athlete's account with preferred location
    const athleteAccount = await prisma.athleteAccount.findFirst({
      where: { clientId },
      select: {
        id: true,
        preferredLocationId: true,
        preferredLocation: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
      },
    })

    if (!athleteAccount) {
      return NextResponse.json({
        success: true,
        hasLocations: false,
        preferredLocation: null,
        availableLocations: [],
      })
    }

    // Get business membership to find available locations
    const membership = await prisma.businessMember.findFirst({
      where: {
        userId: user.id,
        isActive: true,
      },
      select: {
        businessId: true,
        business: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!membership) {
      // No business membership - no locations available
      return NextResponse.json({
        success: true,
        hasLocations: false,
        preferredLocation: null,
        availableLocations: [],
      })
    }

    // Get all active locations for the business
    const locations = await prisma.location.findMany({
      where: {
        businessId: membership.businessId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        city: true,
        address: true,
        isPrimary: true,
        _count: {
          select: {
            equipment: {
              where: { isAvailable: true },
            },
          },
        },
      },
      orderBy: [
        { isPrimary: 'desc' },
        { name: 'asc' },
      ],
    })

    return NextResponse.json({
      success: true,
      hasLocations: locations.length > 0,
      business: membership.business,
      preferredLocation: athleteAccount.preferredLocation,
      availableLocations: locations.map(loc => ({
        id: loc.id,
        name: loc.name,
        city: loc.city,
        address: loc.address,
        isPrimary: loc.isPrimary,
        equipmentCount: loc._count.equipment,
      })),
    })
  } catch (error) {
    logger.error('Get preferred location error', {}, error)

    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Failed to get location settings' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const resolved = await resolveAthleteClientId()

    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user, clientId } = resolved
    const body = await request.json()
    const { locationId } = body

    // Get athlete's account
    const athleteAccount = await prisma.athleteAccount.findFirst({
      where: { clientId },
      select: { id: true },
    })

    if (!athleteAccount) {
      return NextResponse.json(
        { error: 'Athlete account not found' },
        { status: 404 }
      )
    }

    // If locationId is null, clear the preference
    if (locationId === null) {
      await prisma.athleteAccount.update({
        where: { id: athleteAccount.id },
        data: { preferredLocationId: null },
      })

      return NextResponse.json({
        success: true,
        message: 'Preferred location cleared',
        preferredLocation: null,
      })
    }

    // Verify the location belongs to the athlete's business
    const membership = await prisma.businessMember.findFirst({
      where: {
        userId: user.id,
        isActive: true,
      },
      select: { businessId: true },
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'No active business membership' },
        { status: 403 }
      )
    }

    // Verify location exists and is in the same business
    const location = await prisma.location.findFirst({
      where: {
        id: locationId,
        businessId: membership.businessId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        city: true,
      },
    })

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found or not accessible' },
        { status: 404 }
      )
    }

    // Update the preferred location
    await prisma.athleteAccount.update({
      where: { id: athleteAccount.id },
      data: { preferredLocationId: locationId },
    })

    logger.info('Athlete preferred location updated', {
      userId: user.id,
      locationId,
      locationName: location.name,
    })

    return NextResponse.json({
      success: true,
      message: 'Preferred location updated',
      preferredLocation: location,
    })
  } catch (error) {
    logger.error('Update preferred location error', {}, error)

    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Failed to update preferred location' },
      { status: 500 }
    )
  }
}
