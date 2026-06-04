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
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'
import { logger } from '@/lib/logger'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

function resolveLocale(request?: Request, userLanguage?: string | null): AppLocale {
  return request ? resolveRequestLocale(request, userLanguage) : userLanguage === 'sv' ? 'sv' : 'en'
}

export async function GET(request?: Request) {
  let locale: AppLocale = resolveLocale(request)

  try {
    const resolved = await resolveAthleteClientId()

    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    locale = resolveLocale(request, resolved.user.language)
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
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    return NextResponse.json(
      { error: t(locale, 'Failed to get location settings', 'Kunde inte hämta platsinställningar') },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  let locale: AppLocale = resolveRequestLocale(request)

  try {
    const resolved = await resolveAthleteClientId()

    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    locale = resolveRequestLocale(request, resolved.user.language)
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
        { error: t(locale, 'Athlete account not found', 'Atletkontot hittades inte') },
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
        message: t(locale, 'Preferred location cleared', 'Föredragen plats rensades'),
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
        { error: t(locale, 'No active business membership', 'Inget aktivt verksamhetsmedlemskap') },
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
        { error: t(locale, 'Location not found or not accessible', 'Platsen hittades inte eller är inte tillgänglig') },
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
      message: t(locale, 'Preferred location updated', 'Föredragen plats uppdaterades'),
      preferredLocation: location,
    })
  } catch (error) {
    logger.error('Update preferred location error', {}, error)

    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }

    return NextResponse.json(
      { error: t(locale, 'Failed to update preferred location', 'Kunde inte uppdatera föredragen plats') },
      { status: 500 }
    )
  }
}
