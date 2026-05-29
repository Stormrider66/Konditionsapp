import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { prisma } from '@/lib/prisma'
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
} from '@/components/ui/GlassCard'
import { Users } from 'lucide-react'
import { TeamRosterTable } from '@/components/coach/teams/TeamRosterTable'
import { AssignmentStatus } from '@prisma/client'
import { getTranslations } from '@/i18n/server'

interface TeamRosterPageProps {
  params: Promise<{
    businessSlug: string
    teamId: string
  }>
}

export default async function TeamRosterPage({ params }: TeamRosterPageProps) {
  const { businessSlug, teamId } = await params
  const t = await getTranslations('coach.pages.teamDetail')
  const user = await requireCoach()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const accessibleTeam = await getAccessibleTeam(user.id, teamId, businessSlug)
  if (!accessibleTeam) {
    notFound()
  }

  const team = await prisma.team.findFirst({
    where: { id: teamId },
    include: {
      members: {
        select: {
          id: true,
          name: true,
          email: true,
          birthDate: true,
          height: true,
          weight: true,
          businessId: true,
          jerseyNumber: true,
          position: true,
          photoUrl: true,
          athleteAccount: { select: { id: true } },
        },
      },
    },
  })

  if (!team) {
    notFound()
  }

  const memberIds = team.members.map((member) => member.id)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const upcomingUntil = new Date(today)
  upcomingUntil.setDate(upcomingUntil.getDate() + 7)

  const activeAssignmentStatuses = [
    AssignmentStatus.PENDING,
    AssignmentStatus.SCHEDULED,
    AssignmentStatus.MODIFIED,
  ]

  const [
    strengthToday,
    cardioToday,
    hybridToday,
    strengthUpcoming,
    cardioUpcoming,
    hybridUpcoming,
    activeInjuries,
    activeRestrictions,
  ] = await Promise.all([
    prisma.strengthSessionAssignment.groupBy({
      by: ['athleteId'],
      where: {
        athleteId: { in: memberIds },
        status: { in: activeAssignmentStatuses },
        assignedDate: { gte: today, lt: tomorrow },
      },
      _count: { id: true },
    }),
    prisma.cardioSessionAssignment.groupBy({
      by: ['athleteId'],
      where: {
        athleteId: { in: memberIds },
        status: { in: activeAssignmentStatuses },
        assignedDate: { gte: today, lt: tomorrow },
      },
      _count: { id: true },
    }),
    prisma.hybridWorkoutAssignment.groupBy({
      by: ['athleteId'],
      where: {
        athleteId: { in: memberIds },
        status: { in: activeAssignmentStatuses },
        assignedDate: { gte: today, lt: tomorrow },
      },
      _count: { id: true },
    }),
    prisma.strengthSessionAssignment.groupBy({
      by: ['athleteId'],
      where: {
        athleteId: { in: memberIds },
        status: { in: activeAssignmentStatuses },
        assignedDate: { gte: today, lte: upcomingUntil },
      },
      _count: { id: true },
    }),
    prisma.cardioSessionAssignment.groupBy({
      by: ['athleteId'],
      where: {
        athleteId: { in: memberIds },
        status: { in: activeAssignmentStatuses },
        assignedDate: { gte: today, lte: upcomingUntil },
      },
      _count: { id: true },
    }),
    prisma.hybridWorkoutAssignment.groupBy({
      by: ['athleteId'],
      where: {
        athleteId: { in: memberIds },
        status: { in: activeAssignmentStatuses },
        assignedDate: { gte: today, lte: upcomingUntil },
      },
      _count: { id: true },
    }),
    prisma.injuryAssessment.groupBy({
      by: ['clientId'],
      where: {
        clientId: { in: memberIds },
        status: { in: ['ACTIVE', 'MONITORING'] },
        resolved: false,
      },
      _count: { id: true },
    }),
    prisma.trainingRestriction.findMany({
      where: {
        clientId: { in: memberIds },
        isActive: true,
        OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
      },
      select: {
        clientId: true,
        type: true,
        severity: true,
        source: true,
        bodyParts: true,
        reason: true,
      },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    }),
  ])

  const todayWorkoutCounts = new Map<string, number>()
  const upcomingWorkoutCounts = new Map<string, number>()
  const addAssignmentCounts = (
    target: Map<string, number>,
    rows: Array<{ athleteId: string; _count: { id: number } }>
  ) => {
    rows.forEach((row) => {
      target.set(row.athleteId, (target.get(row.athleteId) ?? 0) + row._count.id)
    })
  }
  addAssignmentCounts(todayWorkoutCounts, strengthToday)
  addAssignmentCounts(todayWorkoutCounts, cardioToday)
  addAssignmentCounts(todayWorkoutCounts, hybridToday)
  addAssignmentCounts(upcomingWorkoutCounts, strengthUpcoming)
  addAssignmentCounts(upcomingWorkoutCounts, cardioUpcoming)
  addAssignmentCounts(upcomingWorkoutCounts, hybridUpcoming)

  const injuryCounts = new Map<string, number>()
  activeInjuries.forEach((injury) => {
    injuryCounts.set(injury.clientId, injury._count.id)
  })

  const restrictionSummaries = new Map<
    string,
    Array<{
      type: string
      severity: string
      source: string
      bodyParts: string[]
      reason: string | null
    }>
  >()
  activeRestrictions.forEach((restriction) => {
    const current = restrictionSummaries.get(restriction.clientId) ?? []
    current.push({
      type: restriction.type,
      severity: restriction.severity,
      source: restriction.source,
      bodyParts: restriction.bodyParts,
      reason: restriction.reason,
    })
    restrictionSummaries.set(restriction.clientId, current)
  })

  const membersWithRosterStatus = team.members.map((member) => ({
    ...member,
    hasAthleteAccount: Boolean(member.athleteAccount),
    todayWorkoutCount: todayWorkoutCounts.get(member.id) ?? 0,
    upcomingWorkoutCount: upcomingWorkoutCounts.get(member.id) ?? 0,
    activeInjuryCount: injuryCounts.get(member.id) ?? 0,
    activeRestrictionCount: restrictionSummaries.get(member.id)?.length ?? 0,
    restrictionSummaries: restrictionSummaries.get(member.id) ?? [],
  }))

  return (
    <div className="container mx-auto py-8 px-4">
      <GlassCard glow="purple">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2 dark:text-white">
            <Users className="h-5 w-5" />
            {t('roster.title', { count: team.members.length })}
          </GlassCardTitle>
          <GlassCardDescription>
            {t('roster.description')}
          </GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent>
          <TeamRosterTable
            teamId={teamId}
            businessSlug={businessSlug}
            members={membersWithRosterStatus}
          />
        </GlassCardContent>
      </GlassCard>
    </div>
  )
}
