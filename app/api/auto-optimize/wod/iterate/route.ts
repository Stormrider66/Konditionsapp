/**
 * POST /api/auto-optimize/wod/iterate
 *
 * Runs one self-learning WOD strategy iteration. Admin/coach only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { runWODAutoresearchIteration } from '@/lib/ai/wod-autoresearch'
import { logger } from '@/lib/logger'

async function isAuthorizedRequest(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  })

  return !!profile && ['ADMIN', 'COACH'].includes(profile.role)
}

export async function POST(request: NextRequest) {
  try {
    const authorized = await isAuthorizedRequest(request)
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const run = await runWODAutoresearchIteration()
    return NextResponse.json({ success: true, run })
  } catch (error) {
    logger.error('WOD autoresearch iteration failed', {}, error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to run WOD autoresearch' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return POST(request)
}

export const maxDuration = 120
export const dynamic = 'force-dynamic'
