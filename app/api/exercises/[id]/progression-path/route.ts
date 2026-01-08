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
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { canAccessExercise } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id: exerciseId } = await params

    const hasAccess = await canAccessExercise(user.id, exerciseId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const progressionPath = await getProgressionPath(exerciseId)

    return NextResponse.json(progressionPath, { status: 200 })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}
