// app/api/care-team/threads/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, canAccessClient, canAccessAthleteAsPhysio } from '@/lib/auth-utils'
import { z } from 'zod'

// Validation schema for creating a care team thread
const createThreadSchema = z.object({
  clientId: z.string().uuid(),
  subject: z.string().min(1).max(255),
  description: z.string().optional(),
  injuryId: z.string().uuid().optional(),
  rehabProgramId: z.string().uuid().optional(),
  restrictionId: z.string().uuid().optional(),
  priority: z.enum(['URGENT', 'HIGH', 'NORMAL', 'LOW']).default('NORMAL'),
  participantUserIds: z.array(z.string().uuid()).default([]),
  initialMessage: z.string().optional(),
})

/**
 * GET /api/care-team/threads
 * List care team threads for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const clientId = searchParams.get('clientId')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause - show threads where user is a participant
    const where: Record<string, unknown> = {
      participants: {
        some: {
          userId: user.id,
          isActive: true,
        },
      },
    }

    if (clientId) {
      // Verify access to this client
      if (user.role === 'PHYSIO') {
        const hasAccess = await canAccessAthleteAsPhysio(user.id, clientId)
        if (!hasAccess) {
          return NextResponse.json(
            { error: 'You do not have access to this athlete' },
            { status: 403 }
          )
        }
      } else if (user.role === 'COACH') {
        const hasAccess = await canAccessClient(user.id, clientId)
        if (!hasAccess) {
          return NextResponse.json(
            { error: 'You do not have access to this athlete' },
            { status: 403 }
          )
        }
      }
      where.clientId = clientId
    }

    if (status) {
      where.status = status
    }

    if (priority) {
      where.priority = priority
    }

    const [threads, total] = await Promise.all([
      prisma.careTeamThread.findMany({
        where,
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
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              content: true,
              createdAt: true,
              sender: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
        orderBy: [
          { priority: 'asc' }, // URGENT first
          { lastMessageAt: 'desc' },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.careTeamThread.count({ where }),
    ])

    // Calculate unread count for each thread
    const threadsWithUnread = threads.map(thread => {
      const participant = thread.participants.find(p => p.userId === user.id)
      const lastReadAt = participant?.lastReadAt
      const lastMessage = thread.messages[0]

      let unreadCount = 0
      if (lastMessage && (!lastReadAt || new Date(lastMessage.createdAt) > new Date(lastReadAt))) {
        unreadCount = 1 // Simplified - in production you'd count messages after lastReadAt
      }

      return {
        ...thread,
        unreadCount,
        lastMessage: thread.messages[0] || null,
      }
    })

    return NextResponse.json({
      threads: threadsWithUnread,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching care team threads:', error)
    return NextResponse.json(
      { error: 'Failed to fetch care team threads' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/care-team/threads
 * Create a new care team thread
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createThreadSchema.parse(body)

    // Verify access to the client
    let hasAccess = false
    if (user.role === 'ADMIN') {
      hasAccess = true
    } else if (user.role === 'PHYSIO') {
      hasAccess = await canAccessAthleteAsPhysio(user.id, validatedData.clientId)
    } else if (user.role === 'COACH') {
      hasAccess = await canAccessClient(user.id, validatedData.clientId)
    } else if (user.role === 'ATHLETE') {
      hasAccess = await canAccessClient(user.id, validatedData.clientId)
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have access to create a thread for this athlete' },
        { status: 403 }
      )
    }

    // Get the athlete's user ID to auto-add them
    const athleteAccount = await prisma.athleteAccount.findFirst({
      where: { clientId: validatedData.clientId },
      select: { userId: true },
    })

    // Get the coach's user ID to auto-add them
    const client = await prisma.client.findUnique({
      where: { id: validatedData.clientId },
      select: { userId: true },
    })

    // Build participant list
    const participantUserIds = new Set([
      user.id, // Creator is always a participant
      ...validatedData.participantUserIds,
    ])

    // Auto-add coach if not already included
    if (client?.userId) {
      participantUserIds.add(client.userId)
    }

    // Create thread with participants and optional initial message
    const thread = await prisma.$transaction(async (tx) => {
      // Create the thread
      const newThread = await tx.careTeamThread.create({
        data: {
          clientId: validatedData.clientId,
          createdById: user.id,
          subject: validatedData.subject,
          description: validatedData.description,
          injuryId: validatedData.injuryId,
          rehabProgramId: validatedData.rehabProgramId,
          restrictionId: validatedData.restrictionId,
          priority: validatedData.priority,
          status: 'OPEN',
        },
      })

      // Add participants
      const participantData = Array.from(participantUserIds).map(userId => ({
        threadId: newThread.id,
        userId,
        role: userId === user.id ? 'OWNER' :
              userId === athleteAccount?.userId ? 'ATHLETE' :
              userId === client?.userId ? 'COACH' : 'PARTICIPANT',
        notifyEmail: true,
        notifyPush: true,
      }))

      await tx.careTeamParticipant.createMany({
        data: participantData,
      })

      // Add initial message if provided
      if (validatedData.initialMessage) {
        await tx.careTeamMessage.create({
          data: {
            threadId: newThread.id,
            senderId: user.id,
            content: validatedData.initialMessage,
          },
        })

        // Update last message timestamp
        await tx.careTeamThread.update({
          where: { id: newThread.id },
          data: { lastMessageAt: new Date() },
        })
      }

      return newThread
    })

    // Fetch the full thread with relations
    const fullThread = await prisma.careTeamThread.findUnique({
      where: { id: thread.id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        participants: {
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
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
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

    return NextResponse.json(fullThread, { status: 201 })
  } catch (error) {
    console.error('Error creating care team thread:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create care team thread' },
      { status: 500 }
    )
  }
}
