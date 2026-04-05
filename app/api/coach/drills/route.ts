/**
 * Team Drills API
 *
 * GET  - List drills (filterable by team/sport)
 * POST - Create a drill (manual or from AI analysis)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const user = await requireCoach()

    const { searchParams } = new URL(req.url)
    const teamId = searchParams.get('teamId')
    const sportType = searchParams.get('sportType')

    const membership = await prisma.businessMember.findFirst({
      where: { userId: user.id, isActive: true },
      select: { businessId: true },
    })

    if (!membership) {
      return NextResponse.json({ drills: [] })
    }

    const drills = await prisma.teamDrill.findMany({
      where: {
        businessId: membership.businessId,
        ...(teamId ? { teamId } : {}),
        ...(sportType ? { sportType } : {}),
      },
      include: {
        team: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ drills })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireCoach()
    const body = await req.json()

    const membership = await prisma.businessMember.findFirst({
      where: { userId: user.id, isActive: true },
      select: { businessId: true },
    })

    if (!membership) {
      return NextResponse.json({ error: 'No business' }, { status: 400 })
    }

    const drill = await prisma.teamDrill.create({
      data: {
        businessId: membership.businessId,
        createdById: user.id,
        teamId: body.teamId || null,
        title: body.title || 'Övning',
        description: body.description || null,
        sportType: body.sportType || 'ICE_HOCKEY',
        structure: body.structure,
        sourceType: body.sourceType || 'MANUAL',
        sourceImageUrl: body.sourceImageUrl || null,
        aiAnalysis: body.aiAnalysis || null,
        isPublished: body.isPublished || false,
        publishedAt: body.isPublished ? new Date() : null,
      },
    })

    return NextResponse.json({ drill }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error creating drill:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
