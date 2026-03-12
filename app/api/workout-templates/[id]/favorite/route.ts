import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveAthleteClientId } from '@/lib/auth-utils'

export async function POST(
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
      select: { id: true },
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const existing = await prisma.workoutTemplateFavorite.findUnique({
      where: {
        userId_templateId: {
          userId: user.id,
          templateId: id,
        },
      },
    })

    if (existing) {
      await prisma.workoutTemplateFavorite.delete({
        where: { id: existing.id },
      })
      return NextResponse.json({ isFavorite: false })
    }

    await prisma.workoutTemplateFavorite.create({
      data: {
        userId: user.id,
        templateId: id,
      },
    })

    return NextResponse.json({ isFavorite: true })
  } catch (error) {
    console.error('Error toggling favorite:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
