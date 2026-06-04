import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function POST(
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
      select: { id: true },
    })

    if (!template) {
      return NextResponse.json({ error: t(locale, 'Template not found', 'Mallen hittades inte') }, { status: 404 })
    }

    const existing = await prisma.workoutTemplateFavorite.findUnique({
      where: {
        userId_templateId: {
          userId: user.id,
          templateId: id,
        },
      },
    })

    if (existing) {
      await prisma.workoutTemplateFavorite.delete({
        where: { id: existing.id },
      })
      return NextResponse.json({ isFavorite: false })
    }

    await prisma.workoutTemplateFavorite.create({
      data: {
        userId: user.id,
        templateId: id,
      },
    })

    return NextResponse.json({ isFavorite: true })
  } catch (error) {
    console.error('Error toggling favorite:', error)
    return NextResponse.json({ error: t(locale, 'Internal server error', 'Internt serverfel') }, { status: 500 })
  }
}
