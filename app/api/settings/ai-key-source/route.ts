/**
 * AI Key Source
 *
 * GET /api/settings/ai-key-source - Get where the current user's AI keys come from
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-utils'
import { getAiKeySource } from '@/lib/user-api-keys'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await getAiKeySource(user.id)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    logger.error('GET /api/settings/ai-key-source error', {}, error)
    return NextResponse.json(
      { error: 'Failed to check AI key source' },
      { status: 500 }
    )
  }
}
