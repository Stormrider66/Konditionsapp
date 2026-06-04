import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function GET(request: NextRequest) {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(request, user.language)

    const membership = await prisma.businessMember.findFirst({
      where: { userId: user.id, isActive: true },
      select: { businessId: true },
    })

    if (!membership) {
      return NextResponse.json({ competitions: [] })
    }

    const competitions = await prisma.competition.findMany({
      where: { businessId: membership.businessId },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        metric: true,
        unit: true,
        startDate: true,
        endDate: true,
        isActive: true,
        imageUrl: true,
        createdAt: true,
        createdBy: { select: { name: true } },
        entries: {
          select: {
            id: true,
            currentValue: true,
            rank: true,
            client: { select: { id: true, name: true } },
            lastUpdatedAt: true,
          },
          orderBy: { currentValue: 'desc' },
          take: 10,
        },
        _count: { select: { entries: true } },
      },
      orderBy: { startDate: 'desc' },
      take: 20,
    })

    return NextResponse.json({ competitions })
  } catch {
    return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(request, user.language)
    const body = await request.json()

    const membership = await prisma.businessMember.findFirst({
      where: { userId: user.id, isActive: true },
      select: { businessId: true },
    })

    if (!membership) {
      return NextResponse.json({ error: t(locale, 'No business found', 'Ingen verksamhet hittades') }, { status: 400 })
    }

    const competition = await prisma.competition.create({
      data: {
        businessId: membership.businessId,
        createdById: user.id,
        name: body.name,
        description: body.description || null,
        type: body.type || 'CUSTOM',
        metric: body.metric,
        unit: body.unit || null,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        rules: body.rules || null,
        prizes: body.prizes || null,
        imageUrl: body.imageUrl || null,
      },
      select: {
        id: true,
        name: true,
        type: true,
        metric: true,
        startDate: true,
        endDate: true,
        isActive: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ competition })
  } catch {
    return NextResponse.json({ error: t(locale, 'Failed to create competition', 'Kunde inte skapa tävlingen') }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    locale = resolveRequestLocale(request, user.language)
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: t(locale, 'id required', 'id är obligatoriskt') }, { status: 400 })
    }

    const membership = await prisma.businessMember.findFirst({
      where: { userId: user.id, isActive: true },
      select: { businessId: true },
    })

    if (!membership) {
      return NextResponse.json({ error: t(locale, 'No business found', 'Ingen verksamhet hittades') }, { status: 400 })
    }

    const existing = await prisma.competition.findFirst({
      where: { id, businessId: membership.businessId },
    })

    if (!existing) {
      return NextResponse.json({ error: t(locale, 'Competition not found', 'Tävlingen hittades inte') }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (updates.name !== undefined) data.name = updates.name
    if (updates.description !== undefined) data.description = updates.description
    if (updates.isActive !== undefined) data.isActive = updates.isActive
    if (updates.endDate !== undefined) data.endDate = new Date(updates.endDate)

    // Handle adding/updating entries
    if (updates.addEntry) {
      const { clientId, value } = updates.addEntry
      await prisma.competitionEntry.upsert({
        where: {
          competitionId_clientId: { competitionId: id, clientId },
        },
        update: {
          currentValue: value,
          lastUpdatedAt: new Date(),
        },
        create: {
          competitionId: id,
          clientId,
          currentValue: value,
        },
      })

      // Recalculate ranks
      const allEntries = await prisma.competitionEntry.findMany({
        where: { competitionId: id },
        orderBy: { currentValue: 'desc' },
      })
      for (let i = 0; i < allEntries.length; i++) {
        await prisma.competitionEntry.update({
          where: { id: allEntries[i].id },
          data: { rank: i + 1 },
        })
      }
    }

    if (Object.keys(data).length > 0) {
      await prisma.competition.update({ where: { id }, data })
    }

    // Return updated competition with entries
    const competition = await prisma.competition.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        type: true,
        metric: true,
        unit: true,
        startDate: true,
        endDate: true,
        isActive: true,
        entries: {
          select: {
            id: true,
            currentValue: true,
            rank: true,
            client: { select: { id: true, name: true } },
          },
          orderBy: { rank: 'asc' },
          take: 10,
        },
        _count: { select: { entries: true } },
      },
    })

    return NextResponse.json({ competition })
  } catch {
    return NextResponse.json({ error: t(locale, 'Failed to update competition', 'Kunde inte uppdatera tävlingen') }, { status: 500 })
  }
}
