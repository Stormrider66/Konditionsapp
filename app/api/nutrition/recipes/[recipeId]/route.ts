import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

// DELETE /api/nutrition/recipes/[recipeId] - Remove one saved recipe template.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  let locale: AppLocale = resolveRequestLocale(request)
  try {
    const { recipeId } = await params
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ success: false, error: t(locale, 'Unauthorized', 'Obehörig') }, { status: 401 })
    }
    locale = resolveRequestLocale(request, resolved.user?.language)

    const existing = await prisma.nutritionRecipe.findFirst({
      where: { id: recipeId, clientId: resolved.clientId },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json({ success: false, error: t(locale, 'Recipe not found', 'Receptet hittades inte') }, { status: 404 })
    }

    await prisma.nutritionRecipe.delete({ where: { id: recipeId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error deleting nutrition recipe', {}, error)
    return NextResponse.json(
      { success: false, error: t(locale, 'Failed to delete recipe', 'Kunde inte radera recept') },
      { status: 500 }
    )
  }
}

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}
