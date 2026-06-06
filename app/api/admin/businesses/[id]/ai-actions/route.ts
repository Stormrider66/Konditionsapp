import { NextRequest, NextResponse } from 'next/server'
import { AIActionDraftStatus, Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminRole } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-error'

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  status: z.nativeEnum(AIActionDraftStatus).or(z.literal('ALL')).default('ALL'),
})

function unique(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))))
}

function countByStatus(
  grouped: Array<{ status: AIActionDraftStatus; _count: { status: number } }>
): Record<AIActionDraftStatus, number> {
  return Object.values(AIActionDraftStatus).reduce((acc, status) => {
    acc[status] = grouped.find((row) => row.status === status)?._count.status ?? 0
    return acc
  }, {} as Record<AIActionDraftStatus, number>)
}

// GET /api/admin/businesses/[id]/ai-actions - Recent AI action drafts/runs for one business
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT'])
    const { id } = await params
    const parsedQuery = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams))

    const business = await prisma.business.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true },
    })

    if (!business) {
      return NextResponse.json({
        success: false,
        error: 'Business not found',
      }, { status: 404 })
    }

    const where: Prisma.AIActionDraftWhereInput = {
      businessId: id,
      ...(parsedQuery.status === 'ALL' ? {} : { status: parsedQuery.status }),
    }

    const [actions, groupedStatuses] = await Promise.all([
      prisma.aIActionDraft.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parsedQuery.limit,
        select: {
          id: true,
          capabilityId: true,
          actorUserId: true,
          actorRole: true,
          surface: true,
          actionType: true,
          riskLevel: true,
          status: true,
          businessId: true,
          businessSlug: true,
          clientId: true,
          teamId: true,
          conversationId: true,
          preview: true,
          result: true,
          errorMessage: true,
          expiresAt: true,
          confirmedAt: true,
          executedAt: true,
          cancelledAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.aIActionDraft.groupBy({
        by: ['status'],
        where: { businessId: id },
        _count: { status: true },
      }),
    ])

    const actorIds = unique(actions.map((action) => action.actorUserId))
    const clientIds = unique(actions.map((action) => action.clientId))
    const teamIds = unique(actions.map((action) => action.teamId))

    const [actors, clients, teams] = await Promise.all([
      actorIds.length
        ? prisma.user.findMany({
            where: { id: { in: actorIds } },
            select: { id: true, name: true, email: true, role: true },
          })
        : Promise.resolve([]),
      clientIds.length
        ? prisma.client.findMany({
            where: { id: { in: clientIds } },
            select: { id: true, name: true, email: true },
          })
        : Promise.resolve([]),
      teamIds.length
        ? prisma.team.findMany({
            where: { id: { in: teamIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
    ])

    const actorById = new Map(actors.map((actor) => [actor.id, actor]))
    const clientById = new Map(clients.map((client) => [client.id, client]))
    const teamById = new Map(teams.map((team) => [team.id, team]))

    return NextResponse.json({
      success: true,
      data: {
        business,
        summary: countByStatus(groupedStatuses),
        actions: actions.map((action) => {
          const actor = actorById.get(action.actorUserId)
          const client = action.clientId ? clientById.get(action.clientId) : null
          const team = action.teamId ? teamById.get(action.teamId) : null

          return {
            ...action,
            actorName: actor?.name ?? actor?.email ?? action.actorUserId,
            actorEmail: actor?.email ?? null,
            actorUserRole: actor?.role ?? null,
            clientName: client?.name ?? null,
            clientEmail: client?.email ?? null,
            teamName: team?.name ?? null,
          }
        }),
      },
    })
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/businesses/[id]/ai-actions')
  }
}
