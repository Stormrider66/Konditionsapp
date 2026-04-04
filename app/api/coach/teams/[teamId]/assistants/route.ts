/**
 * Team Assistant Coaches API
 *
 * GET  - List assistant coaches for a team
 * POST - Add an assistant coach to a team (by email)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

interface RouteContext {
  params: Promise<{ teamId: string }>
}

const addAssistantSchema = z.object({
  email: z.string().email(),
  canRunTests: z.boolean().default(true),
  canRunIntervals: z.boolean().default(true),
  canCreateEvents: z.boolean().default(true),
})

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const { teamId } = await context.params

    // Verify coach owns this team
    const team = await prisma.team.findFirst({
      where: { id: teamId, userId: user.id },
    })
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const assignments = await prisma.teamCoachAssignment.findMany({
      where: { teamId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json({
      assistants: assignments.map((a) => ({
        id: a.id,
        userId: a.userId,
        name: a.user.name,
        email: a.user.email,
        canRunTests: a.canRunTests,
        canRunIntervals: a.canRunIntervals,
        canCreateEvents: a.canCreateEvents,
        createdAt: a.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireCoach()
    const { teamId } = await context.params

    // Verify coach owns this team
    const team = await prisma.team.findFirst({
      where: { id: teamId, userId: user.id },
      include: { user: { select: { id: true } } },
    })
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const body = await req.json()
    const parsed = addAssistantSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
    }

    // Find user by email
    const targetUser = await prisma.user.findFirst({
      where: { email: parsed.data.email },
      select: { id: true, name: true, email: true },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'Användare med denna e-post hittades inte' }, { status: 404 })
    }

    if (targetUser.id === user.id) {
      return NextResponse.json({ error: 'Du kan inte lägga till dig själv som assistent' }, { status: 400 })
    }

    // Get the business for this coach
    const coachMembership = await prisma.businessMember.findFirst({
      where: { userId: user.id, isActive: true },
      select: { businessId: true },
    })

    if (coachMembership) {
      // Ensure assistant has a business membership with ASSISTANT_COACH role
      await prisma.businessMember.upsert({
        where: {
          businessId_userId: {
            businessId: coachMembership.businessId,
            userId: targetUser.id,
          },
        },
        update: {
          role: 'ASSISTANT_COACH',
          isActive: true,
        },
        create: {
          businessId: coachMembership.businessId,
          userId: targetUser.id,
          role: 'ASSISTANT_COACH',
          isActive: true,
        },
      })
    }

    // Create team assignment
    try {
      await prisma.teamCoachAssignment.create({
        data: {
          teamId,
          userId: targetUser.id,
          canRunTests: parsed.data.canRunTests,
          canRunIntervals: parsed.data.canRunIntervals,
          canCreateEvents: parsed.data.canCreateEvents,
        },
      })
    } catch {
      return NextResponse.json({ error: 'Denna coach är redan tillagd i laget' }, { status: 409 })
    }

    return NextResponse.json({
      success: true,
      assistant: {
        userId: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
      },
    }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error adding assistant coach:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
