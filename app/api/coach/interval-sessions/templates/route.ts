/**
 * Interval Session Templates API
 *
 * GET  - List coach's templates
 * POST - Save a new template
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  sportType: z.string().max(50).optional(),
  protocol: z.object({
    intervalCount: z.number().int().min(1).max(100).optional(),
    targetDurationSeconds: z.number().min(1).max(7200).optional(),
    restDurationSeconds: z.number().min(0).max(3600).optional(),
    description: z.string().max(500).optional(),
  }),
})

export async function GET() {
  try {
    const user = await requireCoach()

    const templates = await prisma.intervalSessionTemplate.findMany({
      where: { coachId: user.id },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ templates })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error listing templates:', error)
    return NextResponse.json({ error: 'Failed to list templates' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireCoach()

    const body = await req.json()
    const parsed = createTemplateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const template = await prisma.intervalSessionTemplate.create({
      data: {
        coachId: user.id,
        name: parsed.data.name,
        sportType: parsed.data.sportType,
        protocol: JSON.parse(JSON.stringify(parsed.data.protocol)),
      },
    })

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error creating template:', error)
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
  }
}
