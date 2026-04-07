/**
 * Hidden Exercises API
 *
 * GET  /api/exercises/hidden - Get user's hidden exercise IDs
 * POST /api/exercises/hidden - Toggle hidden on/off
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
      const hidden = await prisma.hiddenExercise.findMany({
        where: { userId: user.id },
        select: { exerciseId: true },
      })
      return NextResponse.json({
        success: true,
        data: hidden.map((h) => h.exerciseId),
      })
    } catch {
      // Table may not exist yet — return empty list
      return NextResponse.json({ success: true, data: [] })
    }
  } catch (error) {
    logger.error('Error fetching hidden exercises', {}, error)
    return NextResponse.json(
      { error: 'Failed to fetch hidden exercises' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { exerciseId } = body

    if (!exerciseId || typeof exerciseId !== 'string') {
      return NextResponse.json(
        { error: 'exerciseId is required' },
        { status: 400 }
      )
    }

    const existing = await prisma.hiddenExercise.findUnique({
      where: {
        userId_exerciseId: {
          userId: user.id,
          exerciseId,
        },
      },
    })

    if (existing) {
      await prisma.hiddenExercise.delete({
        where: { id: existing.id },
      })
      return NextResponse.json({ success: true, hidden: false })
    } else {
      await prisma.hiddenExercise.create({
        data: { userId: user.id, exerciseId },
      })
      return NextResponse.json({ success: true, hidden: true })
    }
  } catch (error) {
    logger.error('Error toggling hidden exercise', {}, error)
    return NextResponse.json(
      { error: 'Failed to toggle hidden exercise' },
      { status: 500 }
    )
  }
}
