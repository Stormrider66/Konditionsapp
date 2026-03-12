import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolved = await resolveAthleteClientId()
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { user } = resolved
    const { id } = await params

    const template = await prisma.workoutTemplate.findUnique({
      where: { id },
      include: {
        favorites: {
          where: { userId: user.id },
          select: { id: true },
        },
      },
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const { favorites, ...rest } = template

    return NextResponse.json({
      ...rest,
      isFavorite: favorites.length > 0,
    })
  } catch (error) {
    console.error('Error fetching workout template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
