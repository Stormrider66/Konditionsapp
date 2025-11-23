// app/api/exercises/[id]/progression-path/route.ts
/**
 * Exercise Progression Path API
 *
 * GET /api/exercises/:id/progression-path
 *
 * Returns:
 * - Easier variation (one level down)
 * - Current exercise
 * - Harder variation (one level up)
 *
 * Useful for progressive overload and regression options
 */

import { NextRequest, NextResponse } from 'next/server'
import { getProgressionPath } from '@/lib/training-engine/generators/exercise-selector'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const exerciseId = params.id

    const progressionPath = await getProgressionPath(exerciseId)

    return NextResponse.json(progressionPath, { status: 200 })
  } catch (error: any) {
    console.error('Error fetching progression path:', error)

    if (error.message === 'Exercise not found') {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 })
    }

    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
