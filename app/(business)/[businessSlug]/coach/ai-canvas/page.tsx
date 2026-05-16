import { notFound } from 'next/navigation'
import { AICanvasClient } from '@/components/ai-canvas/AICanvasClient'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getCoachScopedIds } from '@/lib/coach/scoping'
import { getAccessibleTeamWhere } from '@/lib/coach/team-access'
import { prisma } from '@/lib/prisma'

interface PageProps {
  params: Promise<{
    businessSlug: string
  }>
}

export default async function BusinessAICanvasPage({ params }: PageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()
  const membership = await validateBusinessMembership(user.id, businessSlug)

  if (!membership) {
    notFound()
  }

  const coachIds = await getCoachScopedIds(user.id, membership.businessId, membership.role)
  const teamWhere = await getAccessibleTeamWhere(user.id, businessSlug)

  const [canvases, clients, teams, subscription] = await Promise.all([
    prisma.aICanvas.findMany({
      where: {
        businessId: membership.businessId,
        ownerUserId: user.id,
        status: 'DRAFT',
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { blocks: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 30,
    }),
    prisma.client.findMany({
      where: {
        userId: { in: coachIds },
        businessId: membership.businessId,
      },
      select: {
        id: true,
        name: true,
        teamId: true,
        sportProfile: {
          select: {
            primarySport: true,
          },
        },
      },
      orderBy: { name: 'asc' },
      take: 200,
    }),
    prisma.team.findMany({
      where: teamWhere,
      select: {
        id: true,
        name: true,
        sportType: true,
        _count: {
          select: { members: true },
        },
      },
      orderBy: { name: 'asc' },
      take: 100,
    }),
    prisma.subscription.findUnique({
      where: { userId: user.id },
      select: {
        tier: true,
        status: true,
      },
    }),
  ])

  return (
    <AICanvasClient
      businessSlug={businessSlug}
      initialCanvases={canvases.map((canvas) => ({
        id: canvas.id,
        title: canvas.title,
        createdAt: canvas.createdAt.toISOString(),
        updatedAt: canvas.updatedAt.toISOString(),
        blockCount: canvas._count.blocks,
      }))}
      athletes={clients.map((client) => ({
        id: client.id,
        name: client.name,
        teamId: client.teamId,
        primarySport: client.sportProfile?.primarySport ?? null,
      }))}
      teams={teams.map((team) => ({
        id: team.id,
        name: team.name,
        sportType: team.sportType ?? null,
        athleteCount: team._count.members,
      }))}
      coachTier={subscription?.tier ?? 'FREE'}
      subscriptionStatus={subscription?.status ?? 'TRIAL'}
    />
  )
}
