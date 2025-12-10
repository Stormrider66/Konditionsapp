/**
 * Single AI Conversation API
 *
 * GET /api/ai/conversations/[id] - Get conversation with messages
 * PUT /api/ai/conversations/[id] - Update conversation
 * DELETE /api/ai/conversations/[id] - Delete conversation
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

// GET - Get conversation with messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireCoach()
    const { id } = await params

    const conversation = await prisma.aIConversation.findFirst({
      where: {
        id,
        coachId: user.id,
      },
      include: {
        athlete: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      conversation,
      messages: conversation.messages,
    })
  } catch (error) {
    console.error('Get conversation error:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Failed to get conversation' },
      { status: 500 }
    )
  }
}

// PUT - Update conversation
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireCoach()
    const { id } = await params

    const body = await request.json()
    const { title, status } = body

    // Verify ownership
    const existing = await prisma.aIConversation.findFirst({
      where: {
        id,
        coachId: user.id,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    const conversation = await prisma.aIConversation.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(status !== undefined ? { status } : {}),
      },
    })

    return NextResponse.json({
      success: true,
      conversation,
    })
  } catch (error) {
    console.error('Update conversation error:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    )
  }
}

// DELETE - Delete conversation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireCoach()
    const { id } = await params

    // Verify ownership
    const existing = await prisma.aIConversation.findFirst({
      where: {
        id,
        coachId: user.id,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Delete conversation (messages cascade)
    await prisma.aIConversation.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Conversation deleted',
    })
  } catch (error) {
    console.error('Delete conversation error:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    )
  }
}
