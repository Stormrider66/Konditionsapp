import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, canAccessClient, canAccessAthleteAsPhysio } from '@/lib/auth-utils'
import { canAccessCoachPlatform, canAccessPhysioPlatform } from '@/lib/user-capabilities'

const updateInjurySchema = z.object({
  status: z.enum(['ACTIVE', 'MONITORING', 'RESOLVED']).optional(),
  resolved: z.boolean().optional(),
  notes: z.string().optional(),
  clearRestrictions: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const data = updateInjurySchema.parse(body)

    const injury = await prisma.injuryAssessment.findUnique({
      where: { id },
      select: { id: true, clientId: true, resolved: true },
    })

    if (!injury) {
      return NextResponse.json({ error: 'Injury not found' }, { status: 404 })
    }

    const [hasCoachAccess, hasPhysioAccess] = await Promise.all([
      canAccessCoachPlatform(user.id),
      canAccessPhysioPlatform(user.id),
    ])

    const hasAccess =
      user.role === 'ADMIN' ||
      (hasPhysioAccess && (await canAccessAthleteAsPhysio(user.id, injury.clientId))) ||
      (hasCoachAccess && (await canAccessClient(user.id, injury.clientId)))

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const shouldResolve = data.resolved === true || data.status === 'RESOLVED'

    const [updated] = await prisma.$transaction([
      prisma.injuryAssessment.update({
        where: { id },
        data: {
          status: shouldResolve ? 'RESOLVED' : data.status,
          resolved: shouldResolve ? true : data.resolved,
          resolvedDate: shouldResolve ? new Date() : undefined,
          notes: data.notes,
        },
        include: {
          client: { select: { id: true, name: true } },
          trainingRestrictions: {
            where: { isActive: true },
            select: { id: true, type: true, severity: true },
          },
          rehabPrograms: {
            where: { status: 'ACTIVE' },
            select: { id: true, name: true, currentPhase: true },
          },
        },
      }),
      ...(shouldResolve && data.clearRestrictions
        ? [
            prisma.trainingRestriction.updateMany({
              where: { injuryId: id, isActive: true },
              data: {
                isActive: false,
                clearedAt: new Date(),
                clearedById: user.id,
              },
            }),
          ]
        : []),
    ])

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating injury:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update injury' }, { status: 500 })
  }
}
