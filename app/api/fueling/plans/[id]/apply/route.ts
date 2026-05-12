import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { canAccessClient, getCurrentUser } from '@/lib/auth-utils'
import { refreshFuelingPrescriptionsForActivePrograms } from '@/lib/fueling/workout-prescriptions'
import { logger } from '@/lib/logger'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const plan = await prisma.raceFuelingPlan.findUnique({
      where: { id },
      select: { id: true, clientId: true },
    })
    if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

    const hasAccess = await canAccessClient(user.id, plan.clientId)
    if (!hasAccess) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

    const updatedCount = await refreshFuelingPrescriptionsForActivePrograms(prisma, plan.clientId, plan.id)
    return NextResponse.json({ success: true, updatedCount })
  } catch (error) {
    logger.error('Error applying fueling plan to workouts', {}, error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
