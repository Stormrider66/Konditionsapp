// app/api/exercises/[id]/alternatives/route.ts
/**
 * Exercise Alternatives API
 *
 * GET /api/exercises/:id/alternatives?samePillar=true
 *
 * Returns alternative exercises for swapping:
 * - Same biomechanical pillar (by default)
 * - Similar progression level
 * - Same category
 * - Similarity score
 */

import { NextRequest, NextResponse } from 'next/server'
import { getExerciseAlternatives } from '@/lib/training-engine/generators/exercise-selector'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { canAccessExercise } from '@/lib/auth-utils'
import { resolveRequestLocale, type AppLocale } from '@/lib/i18n/request-locale'

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let locale = resolveRequestLocale(request)

  try {
    const user = await requireAuth()
    locale = resolveRequestLocale(request, user.language)
    const { id: exerciseId } = await params
    const searchParams = request.nextUrl.searchParams
    const samePillar = searchParams.get('samePillar') === 'true'

    const hasAccess = await canAccessExercise(user.id, exerciseId)
    if (!hasAccess) {
      return NextResponse.json({ error: t(locale, 'Forbidden', 'Saknar behörighet') }, { status: 403 })
    }

    const alternatives = await getExerciseAlternatives(exerciseId, samePillar)

    return NextResponse.json(
      {
        exerciseId,
        samePillar,
        alternatives,
        count: alternatives.length,
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
