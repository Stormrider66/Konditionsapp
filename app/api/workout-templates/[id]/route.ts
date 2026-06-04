import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale: AppLocale = resolveRequestLocale(req)
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    const { user } = resolved
    locale = resolveRequestLocale(req, user.language)
    const { id } = await params

    const template = await prisma.workoutTemplate.findUnique({
      where: { id },
      include: {
        favorites: {
          where: { userId: user.id },
          select: { id: true },
        },
      },
    })

    if (!template) {
      return NextResponse.json({ error: t(locale, 'Template not found', 'Mallen hittades inte') }, { status: 404 })
    }

    const { favorites, ...rest } = template

    return NextResponse.json({
      ...rest,
      isFavorite: favorites.length > 0,
    })
  } catch (error) {
    console.error('Error fetching workout template:', error)
    return NextResponse.json({ error: t(locale, 'Internal server error', 'Internt serverfel') }, { status: 500 })
  }
}
