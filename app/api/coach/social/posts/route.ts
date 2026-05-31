import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

type AppLocale = 'en' | 'sv'

function getUserLocale(language: string | null | undefined): AppLocale {
  return language === 'sv' ? 'sv' : 'en'
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function GET() {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    locale = getUserLocale(user.language)

    const membership = await prisma.businessMember.findFirst({
      where: { userId: user.id, isActive: true },
      select: { businessId: true, role: true },
    })

    if (!membership) {
      return NextResponse.json({ posts: [] })
    }

    const posts = await prisma.socialPost.findMany({
      where: { businessId: membership.businessId },
      select: {
        id: true,
        caption: true,
        mediaUrl: true,
        mediaType: true,
        isAiGenerated: true,
        triggerType: true,
        status: true,
        createdAt: true,
        createdBy: { select: { name: true } },
        publishes: {
          select: {
            id: true,
            status: true,
            scheduledAt: true,
            publishedAt: true,
            externalId: true,
            errorMessage: true,
            account: {
              select: { platform: true, accountName: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return NextResponse.json({ posts })
  } catch {
    return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    locale = getUserLocale(user.language)
    const body = await request.json()

    const membership = await prisma.businessMember.findFirst({
      where: { userId: user.id, isActive: true },
      select: { businessId: true },
    })

    if (!membership) {
      return NextResponse.json({ error: t(locale, 'No business', 'Ingen verksamhet') }, { status: 400 })
    }

    const post = await prisma.socialPost.create({
      data: {
        businessId: membership.businessId,
        createdById: user.id,
        caption: body.caption,
        mediaUrl: body.mediaUrl || null,
        mediaType: body.mediaType || null,
        isAiGenerated: body.isAiGenerated || false,
        triggerType: body.triggerType || 'MANUAL',
        triggerData: body.triggerData || null,
        status: body.status || 'DRAFT',
      },
      select: {
        id: true,
        caption: true,
        mediaUrl: true,
        status: true,
        isAiGenerated: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ post })
  } catch {
    return NextResponse.json({ error: t(locale, 'Failed to create post', 'Kunde inte skapa inlägget') }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  let locale: AppLocale = 'en'

  try {
    const user = await requireCoach()
    locale = getUserLocale(user.language)
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: t(locale, 'id required', 'id är obligatoriskt') }, { status: 400 })
    }

    const membership = await prisma.businessMember.findFirst({
      where: { userId: user.id, isActive: true },
      select: { businessId: true, role: true },
    })

    if (!membership) {
      return NextResponse.json({ error: t(locale, 'No business', 'Ingen verksamhet') }, { status: 400 })
    }

    const existing = await prisma.socialPost.findFirst({
      where: { id, businessId: membership.businessId },
    })

    if (!existing) {
      return NextResponse.json({ error: t(locale, 'Post not found', 'Inlägget hittades inte') }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (updates.caption !== undefined) data.caption = updates.caption
    if (updates.mediaUrl !== undefined) data.mediaUrl = updates.mediaUrl
    if (updates.mediaType !== undefined) data.mediaType = updates.mediaType
    if (updates.status !== undefined) {
      data.status = updates.status
      if (updates.status === 'APPROVED') {
        data.approvedById = user.id
        data.approvedAt = new Date()
      }
    }

    const post = await prisma.socialPost.update({
      where: { id },
      data,
      select: {
        id: true,
        caption: true,
        mediaUrl: true,
        status: true,
        isAiGenerated: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ post })
  } catch {
    return NextResponse.json({ error: t(locale, 'Failed to update post', 'Kunde inte uppdatera inlägget') }, { status: 500 })
  }
}
