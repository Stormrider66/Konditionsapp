import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimitJsonResponse } from '@/lib/api/rate-limit'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'

const createCanvasTaskSchema = z.object({
  businessSlug: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1200).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  dueDate: z.string().datetime().optional(),
})

function isNextRedirectError(error: unknown): boolean {
  return error instanceof Error && (
    error.message === 'NEXT_REDIRECT' ||
    'digest' in error && typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')
  )
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach()

    const rateLimited = await rateLimitJsonResponse('ai:canvas:create-task', user.id, {
      limit: 20,
      windowSeconds: 60,
    })
    if (rateLimited) return rateLimited

    const parsed = createCanvasTaskSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Ogiltig uppgiftsdata.', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const membership = await validateBusinessMembership(user.id, parsed.data.businessSlug)
    if (!membership) {
      return NextResponse.json({ error: 'Business not found or access denied' }, { status: 404 })
    }

    const task = await prisma.coachTask.create({
      data: {
        businessId: membership.businessId,
        createdById: user.id,
        title: parsed.data.title,
        description: parsed.data.description || null,
        priority: parsed.data.priority,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      },
      select: {
        id: true,
        title: true,
      },
    })

    return NextResponse.json({ success: true, task })
  } catch (error) {
    if (isNextRedirectError(error) || (error instanceof Error && error.message === 'Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.error('Create AI canvas task failed', {}, error)
    return NextResponse.json({ error: 'Jag kunde inte skapa uppgiften just nu.' }, { status: 500 })
  }
}
