/**
 * Exercise Favorites API
 *
 * GET  /api/exercises/favorites - Get user's favorite exercise IDs
 * POST /api/exercises/favorites - Toggle favorite on/off
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

    const favorites = await prisma.exerciseFavorite.findMany({
      where: { userId: user.id },
      select: { exerciseId: true },
    })

    return NextResponse.json({
      success: true,
      data: favorites.map((f) => f.exerciseId),
    })
  } catch (error) {
    logger.error('Error fetching exercise favorites', {}, error)
    return NextResponse.json(
      { error: 'Failed to fetch favorites' },
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

    // Check if already favorited
    const existing = await prisma.exerciseFavorite.findUnique({
      where: {
        userId_exerciseId: {
          userId: user.id,
          exerciseId,
        },
      },
    })

    if (existing) {
      // Remove favorite
      await prisma.exerciseFavorite.delete({
        where: { id: existing.id },
      })
      return NextResponse.json({
        success: true,
        favorited: false,
      })
    } else {
      // Add favorite
      await prisma.exerciseFavorite.create({
        data: {
          userId: user.id,
          exerciseId,
        },
      })
      return NextResponse.json({
        success: true,
        favorited: true,
      })
    }
  } catch (error) {
    logger.error('Error toggling exercise favorite', {}, error)
    return NextResponse.json(
      { error: 'Failed to toggle favorite' },
      { status: 500 }
    )
  }
}
