import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const user = await requireCoach()

    // Get business membership
    const membership = await prisma.businessMember.findFirst({
      where: { userId: user.id, isActive: true },
      select: { businessId: true, role: true },
    })

    if (!membership) {
      return NextResponse.json({ tasks: [] })
    }

    const isOwnerOrAdmin = membership.role === 'OWNER' || membership.role === 'ADMIN'

    // Fetch tasks: own tasks + shared tasks (+ all tasks if owner/admin)
    const tasks = await prisma.coachTask.findMany({
      where: {
        businessId: membership.businessId,
        OR: [
          { createdById: user.id },
          { assignedToId: user.id },
          { isShared: true },
          ...(isOwnerOrAdmin ? [{ businessId: membership.businessId }] : []),
        ],
      },
      select: {
        id: true,
        title: true,
        description: true,
        priority: true,
        status: true,
        dueDate: true,
        completedAt: true,
        isShared: true,
        createdById: true,
        assignedToId: true,
        createdAt: true,
        createdBy: { select: { name: true } },
        assignedTo: { select: { name: true } },
      },
      orderBy: [
        { status: 'asc' }, // PENDING first, COMPLETED last
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 50,
    })

    return NextResponse.json({ tasks })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach()
    const body = await request.json()

    const membership = await prisma.businessMember.findFirst({
      where: { userId: user.id, isActive: true },
      select: { businessId: true },
    })

    if (!membership) {
      return NextResponse.json({ error: 'No business membership' }, { status: 400 })
    }

    const task = await prisma.coachTask.create({
      data: {
        businessId: membership.businessId,
        createdById: user.id,
        title: body.title,
        description: body.description || null,
        priority: body.priority || 'NORMAL',
        isShared: body.isShared || false,
        assignedToId: body.assignedToId || null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
      },
      select: {
        id: true,
        title: true,
        description: true,
        priority: true,
        status: true,
        dueDate: true,
        isShared: true,
        createdById: true,
        assignedToId: true,
        createdAt: true,
        createdBy: { select: { name: true } },
        assignedTo: { select: { name: true } },
      },
    })

    return NextResponse.json({ task })
  } catch {
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireCoach()
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    // Verify the task belongs to user's business
    const membership = await prisma.businessMember.findFirst({
      where: { userId: user.id, isActive: true },
      select: { businessId: true, role: true },
    })

    if (!membership) {
      return NextResponse.json({ error: 'No business membership' }, { status: 400 })
    }

    const existing = await prisma.coachTask.findFirst({
      where: { id, businessId: membership.businessId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Only creator, assignee, or owner/admin can update
    const canUpdate =
      existing.createdById === user.id ||
      existing.assignedToId === user.id ||
      membership.role === 'OWNER' ||
      membership.role === 'ADMIN'

    if (!canUpdate) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const data: Record<string, unknown> = {}
    if (updates.title !== undefined) data.title = updates.title
    if (updates.description !== undefined) data.description = updates.description
    if (updates.priority !== undefined) data.priority = updates.priority
    if (updates.isShared !== undefined) data.isShared = updates.isShared
    if (updates.assignedToId !== undefined) data.assignedToId = updates.assignedToId || null
    if (updates.dueDate !== undefined) data.dueDate = updates.dueDate ? new Date(updates.dueDate) : null
    if (updates.status !== undefined) {
      data.status = updates.status
      if (updates.status === 'COMPLETED') {
        data.completedAt = new Date()
      } else {
        data.completedAt = null
      }
    }

    const task = await prisma.coachTask.update({
      where: { id },
      data,
      select: {
        id: true,
        title: true,
        description: true,
        priority: true,
        status: true,
        dueDate: true,
        completedAt: true,
        isShared: true,
        createdById: true,
        assignedToId: true,
        createdAt: true,
        createdBy: { select: { name: true } },
        assignedTo: { select: { name: true } },
      },
    })

    return NextResponse.json({ task })
  } catch {
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireCoach()
    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const membership = await prisma.businessMember.findFirst({
      where: { userId: user.id, isActive: true },
      select: { businessId: true, role: true },
    })

    if (!membership) {
      return NextResponse.json({ error: 'No business membership' }, { status: 400 })
    }

    const existing = await prisma.coachTask.findFirst({
      where: { id, businessId: membership.businessId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const canDelete =
      existing.createdById === user.id ||
      membership.role === 'OWNER' ||
      membership.role === 'ADMIN'

    if (!canDelete) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    await prisma.coachTask.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
  }
}
