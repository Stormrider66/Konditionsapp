/**
 * GET/DELETE /api/ai/wod/preferences
 *
 * Athlete-owned learned Dagens pass preferences.
 */

import { NextResponse } from 'next/server'
import { resolveAthleteClientId } from '@/lib/auth-utils'
import { getWODPreferenceProfile, resetWODPreferenceProfile } from '@/lib/ai/wod-learning'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await getWODPreferenceProfile(resolved.clientId)
    return NextResponse.json({ profile })
  } catch (error) {
    logger.error('Failed to fetch WOD preferences', {}, error)
    return NextResponse.json({ error: 'Failed to fetch WOD preferences' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await resetWODPreferenceProfile(resolved.clientId)
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Failed to reset WOD preferences', {}, error)
    return NextResponse.json({ error: 'Failed to reset WOD preferences' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
