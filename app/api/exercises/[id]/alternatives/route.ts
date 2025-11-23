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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const exerciseId = params.id
    const searchParams = request.nextUrl.searchParams
    const samePillar = searchParams.get('samePillar') === 'true'

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
  } catch (error: any) {
    console.error('Error fetching alternatives:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
