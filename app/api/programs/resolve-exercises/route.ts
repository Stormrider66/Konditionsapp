/**
 * Program Importer — Resolve Exercises (HTTP surface)
 *
 * Thin wrapper over `lib/ai/exercise-resolver.ts`. The service function is
 * also invoked directly by /api/programs/import-parse so a single-shot
 * import returns parse + resolutions in one round-trip.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { canAccessCoachPlatform } from '@/lib/user-capabilities'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import {
  deriveExerciseResolverScope,
  resolveExercises,
} from '@/lib/ai/exercise-resolver'

export const runtime = 'nodejs'

interface ResolveRequestBody {
  names: string[]
  categoryHint?: string
  pillarHint?: string
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const hasCoachAccess =
      user.role === 'ADMIN' ||
      user.role === 'COACH' ||
      (await canAccessCoachPlatform(user.id))

    const body = (await request.json().catch(() => ({}))) as ResolveRequestBody
    const rawNames = Array.isArray(body?.names) ? body.names : []

    let athleteClientId: string | null = null
    if (user.role === 'ATHLETE') {
      const resolved = await resolveAthleteClientId()
      athleteClientId = resolved?.clientId ?? null
    }

    const { accessWhere, aliasOwnerId } = await deriveExerciseResolverScope({
      userId: user.id,
      userRole: user.role,
      hasCoachAccess,
      athleteClientId,
    })

    const result = await resolveExercises({
      names: rawNames,
      aliasOwnerId,
      accessWhere,
      hints: {
        categoryHint: body?.categoryHint,
        pillarHint: body?.pillarHint,
      },
    })

    return NextResponse.json(result)
  } catch (error) {
    return handleApiError(error)
  }
}
