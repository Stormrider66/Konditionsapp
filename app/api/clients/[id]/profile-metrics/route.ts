import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { canAccessClient, getCurrentUser } from '@/lib/auth-utils'
import { logger } from '@/lib/logger'

type RouteParams = {
  params: Promise<{ id: string }>
}

const profileMetricsSchema = z.object({
  height: z.number().min(100, 'Längd måste vara minst 100 cm').max(250, 'Längd kan vara max 250 cm').optional(),
  weight: z.number().min(30, 'Vikt måste vara minst 30 kg').max(300, 'Vikt kan vara max 300 kg').optional(),
  manualVo2max: z.number().min(10, 'VO2max måste vara minst 10').max(100, 'VO2max kan vara max 100').nullable().optional(),
  manualMaxHR: z.number().int().min(100, 'Max puls måste vara minst 100').max(250, 'Max puls kan vara max 250').nullable().optional(),
}).refine(
  (data) =>
    data.height !== undefined ||
    data.weight !== undefined ||
    data.manualVo2max !== undefined ||
    data.manualMaxHR !== undefined,
  { message: 'Inga värden att uppdatera' },
)

// PATCH /api/clients/[id]/profile-metrics
// Coach/professional update for values that may change between lab tests.
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      )
    }

    const { id } = await params
    const hasAccess = await canAccessClient(user.id, id)
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Client not found or unauthorized' },
        { status: 404 },
      )
    }

    const body = await request.json()
    const validation = profileMetricsSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 },
      )
    }

    const updated = await prisma.client.update({
      where: { id },
      data: validation.data,
      select: {
        height: true,
        weight: true,
        manualVo2max: true,
        manualMaxHR: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    logger.error('Error updating client profile metrics', {}, error)
    return NextResponse.json(
      { success: false, error: 'Failed to update profile metrics' },
      { status: 500 },
    )
  }
}
