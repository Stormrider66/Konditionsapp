/**
 * Custom Test Protocols API
 *
 * GET  - List protocols for the business
 * POST - Create a new custom protocol
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const metricSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  unit: z.string(),
  type: z.enum(['number', 'time', 'array', 'ladder']),
  category: z.enum(['ice', 'power', 'jump', 'endurance', 'flexibility', 'other']),
  min: z.number().optional(),
  max: z.number().optional(),
  required: z.boolean().default(false),
  ladderLoads: z.array(z.number()).optional(), // For ladder type: [20, 40, 60, 80, 100]
  arraySize: z.number().optional(), // For array type: how many values (e.g., 7 for 7x40m)
})

const createProtocolSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  sportType: z.string().max(50).optional(),
  metrics: z.array(metricSchema).min(1),
  isPublished: z.boolean().default(false),
})

export async function GET() {
  try {
    const user = await requireCoach()

    const membership = await prisma.businessMember.findFirst({
      where: { userId: user.id, isActive: true },
      select: { businessId: true },
    })

    if (!membership) return NextResponse.json({ protocols: [] })

    const protocols = await prisma.customTestProtocol.findMany({
      where: {
        businessId: membership.businessId,
        OR: [
          { createdById: user.id },
          { isPublished: true },
        ],
      },
      include: {
        createdBy: { select: { name: true } },
        _count: { select: { results: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ protocols })
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
    const parsed = createProtocolSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Ogiltig indata', details: parsed.error.flatten() }, { status: 400 })
    }

    const membership = await prisma.businessMember.findFirst({
      where: { userId: user.id, isActive: true },
      select: { businessId: true },
    })

    if (!membership) {
      return NextResponse.json({ error: 'Ingen verksamhet' }, { status: 400 })
    }

    const protocol = await prisma.customTestProtocol.create({
      data: {
        businessId: membership.businessId,
        createdById: user.id,
        name: parsed.data.name,
        description: parsed.data.description,
        sportType: parsed.data.sportType,
        metrics: JSON.parse(JSON.stringify(parsed.data.metrics)),
        isPublished: parsed.data.isPublished,
      },
    })

    return NextResponse.json({ protocol }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error creating test protocol:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
