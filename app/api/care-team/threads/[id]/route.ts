// app/api/care-team/threads/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-utils'
import { z } from 'zod'

const updateThreadSchema = z.object({
  subject: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['URGENT', 'HIGH', 'NORMAL', 'LOW']).optional(),
})

/**
 * GET /api/care-team/threads/[id]
 * Get a specific care team thread with messages
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const messageLimit = parseInt(searchParams.get('messageLimit') || '50')
    const messageOffset = parseInt(searchParams.get('messageOffset') || '0')

    const thread = await prisma.careTeamThread.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        injury: {
          select: {
            id: true,
            injuryType: true,
            bodyPart: true,
            phase: true,
            painLevel: true,
          },
        },
        rehabProgram: {
          select: {
            id: true,
            name: true,
            currentPhase: true,
            status: true,
          },
        },
        restriction: {
          select: {
            id: true,
            type: true,
            severity: true,
            isActive: true,
          },
        },
        participants: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true,
                email: true,
              },
            },
          },
        },
      },
    })

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    // Check if user is a participant
    const isParticipant = thread.participants.some(p => p.userId === user.id)
    if (!isParticipant && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get messages separately with pagination
    const [messages, messageCount] = await Promise.all([
      prisma.careTeamMessage.findMany({
        where: { threadId: id },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        take: messageLimit,
        skip: messageOffset,
      }),
      prisma.careTeamMessage.count({ where: { threadId: id } }),
    ])

    // Update last read timestamp for this user
    await prisma.careTeamParticipant.updateMany({
      where: {
        threadId: id,
        userId: user.id,
      },
      data: {
        lastReadAt: new Date(),
      },
    })

    return NextResponse.json({
      ...thread,
      messages,
      messageCount,
      messageLimit,
      messageOffset,
    })
  } catch (error) {
    console.error('Error fetching care team thread:', error)
    return NextResponse.json(
      { error: 'Failed to fetch care team thread' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/care-team/threads/[id]
 * Update a care team thread
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = updateThreadSchema.parse(body)

    // Check if thread exists
    const existingThread = await prisma.careTeamThread.findUnique({
      where: { id },
      include: {
        participants: {
          where: { userId: user.id, isActive: true },
        },
      },
    })

    if (!existingThread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
    }

    // Check if user is a participant or admin
    const isParticipant = existingThread.participants.length > 0
    if (!isParticipant && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Build update data
    const updateData: Record<string, unknown> = { ...validatedData }

    // Set resolved/closed timestamps
    if (validatedData.status === 'RESOLVED' && existingThread.status !== 'RESOLVED') {
      updateData.resolvedAt = new Date()
    }
    if (validatedData.status === 'CLOSED' && existingThread.status !== 'CLOSED') {
      updateData.closedAt = new Date()
    }

    const thread = await prisma.careTeamThread.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        participants: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(thread)
  } catch (error) {
    console.error('Error updating care team thread:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update care team thread' },
      { status: 500 }
    )
  }
}
