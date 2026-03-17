import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth, handleApiError } from '@/lib/api/utils'
import { requireBusinessMembership } from '@/lib/auth-utils'
import { getMuscleGroupData } from '@/lib/strength/muscle-group-data'

const querySchema = z.object({
  clientId: z.string().uuid(),
  period: z.enum(['week', 'month']).default('week'),
  count: z.coerce.number().int().min(1).max(52).default(8),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth()
    const { id: businessId } = await params

    await requireBusinessMembership(user.id, businessId)

    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const parsed = querySchema.safeParse(searchParams)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { clientId, period, count } = parsed.data

    // Verify athlete belongs to this business
    const client = await prisma.client.findFirst({
      where: { id: clientId, businessId },
      select: { id: true },
    })

    if (!client) {
      return NextResponse.json({ error: 'Athlete not found' }, { status: 404 })
    }

    const data = await getMuscleGroupData(clientId, period, count)
    return NextResponse.json(data)
  } catch (error) {
    return handleApiError(error)
  }
}
