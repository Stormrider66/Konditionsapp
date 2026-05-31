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
      select: { businessId: true },
    })

    if (!membership) {
      return NextResponse.json({ accounts: [] })
    }

    const accounts = await prisma.socialMediaAccount.findMany({
      where: { businessId: membership.businessId },
      select: {
        id: true,
        platform: true,
        accountName: true,
        isActive: true,
        lastPostAt: true,
        createdAt: true,
      },
      orderBy: { platform: 'asc' },
    })

    return NextResponse.json({ accounts })
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
      select: { businessId: true, role: true },
    })

    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
      return NextResponse.json(
        { error: t(locale, 'Only owner/admin can manage accounts', 'Endast ägare/admin kan hantera konton') },
        { status: 403 }
      )
    }

    const account = await prisma.socialMediaAccount.upsert({
      where: {
        businessId_platform: {
          businessId: membership.businessId,
          platform: body.platform,
        },
      },
      update: {
        accountName: body.accountName,
        accessToken: body.accessToken,
        refreshToken: body.refreshToken || null,
        tokenExpiresAt: body.tokenExpiresAt ? new Date(body.tokenExpiresAt) : null,
        externalId: body.externalId || null,
        isActive: true,
      },
      create: {
        businessId: membership.businessId,
        platform: body.platform,
        accountName: body.accountName,
        accessToken: body.accessToken,
        refreshToken: body.refreshToken || null,
        tokenExpiresAt: body.tokenExpiresAt ? new Date(body.tokenExpiresAt) : null,
        externalId: body.externalId || null,
      },
      select: {
        id: true,
        platform: true,
        accountName: true,
        isActive: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ account })
  } catch {
    return NextResponse.json({ error: t(locale, 'Failed to save account', 'Kunde inte spara kontot') }, { status: 500 })
  }
}
