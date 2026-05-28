// app/(business)/[businessSlug]/coach/teams/[teamId]/page.tsx
import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  ArrowLeft,
  Users,
  Calendar,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react'
import { TeamDashboardClient } from '@/components/coach/teams/TeamDashboardClient'
import { TeamDayPrintButton } from '@/components/coach/teams/TeamDayPrintButton'
import { CreateTeamPlanDialog } from '@/components/coach/teams/CreateTeamPlanDialog'
import { AthletePlanSummaryCard } from '@/components/athlete-plans/AthletePlanSummaryCard'
import { TeamLeaderboard } from '@/components/coach/leaderboards'
import { AddPlayersDialog } from '@/components/coach/teams/AddPlayersDialog'
import { TeamRosterTable } from '@/components/coach/teams/TeamRosterTable'
import { TeamNotesCard, type TeamNoteSummary, type TeamNoteTag } from '@/components/coach/teams/TeamNotesCard'
import { TeamWorkoutMonitor } from '@/components/coach/teams/TeamWorkoutMonitor'
import { AssignmentStatus } from '@prisma/client'
import { getTranslations } from '@/i18n/server'
import { getSportLabelKey } from '@/lib/sports/catalog'

interface TeamPageProps {
  params: Promise<{
    businessSlug: string
    teamId: string
  }>
}

function PilotReadinessItem({
  label,
  ready,
  detail,
  readyLabel,
  pendingLabel,
}: {
  label: string
  ready: boolean
  detail: string
  readyLabel: string
  pendingLabel: string
}) {
  return (
    <div className="rounded-md border bg-background/70 p-3 dark:bg-slate-950/40 dark:border-white/10">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium dark:text-slate-100">{label}</p>
        <Badge variant={ready ? 'default' : 'secondary'} className="text-[10px]">
          {ready ? readyLabel : pendingLabel}
        </Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}

export default async function BusinessTeamDashboardPage({ params }: TeamPageProps) {
  const { businessSlug, teamId } = await params
  const t = await getTranslations('coach.pages.teamDetail')
  const tSports = await getTranslations('sports')
  const user = await requireCoach()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const basePath = `/${businessSlug}/coach/teams`

  // Verify team access inside the business workspace
  const accessibleTeam = await getAccessibleTeam(user.id, teamId, businessSlug)
  if (!accessibleTeam) {
    notFound()
  }

  const team = await prisma.team.findFirst({
    where: {
      id: teamId,
    },
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
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  if (!team) {
    notFound()
  }
  const sportLabelKey = getSportLabelKey(team.sportType)

  // Fetch dashboard data (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const hockeyTestCount = await prisma.hockeyPhysicalTest.count({
    where: { teamId },
  })

  const memberIds = team.members.map((member) => member.id)
  const activeWorkoutMembers = team.members.filter((member) => (
    Boolean(member.athleteAccount) && member.businessId === membership.businessId
  ))
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const upcomingUntil = new Date(today)
  upcomingUntil.setDate(upcomingUntil.getDate() + 7)
  const activeTeamPlan = await prisma.teamPlan.findFirst({
    where: {
      teamId,
      status: 'ACTIVE',
      startDate: { lte: today },
      endDate: { gte: today },
    },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      startDate: true,
      endDate: true,
      blocks: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          title: true,
          focus: true,
          description: true,
          order: true,
          startDate: true,
          endDate: true,
        },
      },
    },
    orderBy: { startDate: 'desc' },
  })
  const teamNotes = await prisma.teamNote.findMany({
    where: { teamId },
    select: {
      id: true,
      body: true,
      tag: true,
      authorId: true,
      createdAt: true,
      updatedAt: true,
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
  const initialTeamNotes: TeamNoteSummary[] = teamNotes.map((note) => ({
    ...note,
    tag: note.tag as TeamNoteTag,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  }))
  const canManageAllTeamNotes = ['OWNER', 'ADMIN', 'COACH'].includes(membership.role)
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

  // Calculate member stats
  const memberStats = await Promise.all(
    activeWorkoutMembers.map(async (member) => {
      const strengthAssigned = await prisma.strengthSessionAssignment.count({
        where: {
          athleteId: member.id,
          teamBroadcastId: { not: null },
          assignedDate: { gte: thirtyDaysAgo },
        },
      })
      const strengthCompleted = await prisma.strengthSessionAssignment.count({
        where: {
          athleteId: member.id,
          teamBroadcastId: { not: null },
          assignedDate: { gte: thirtyDaysAgo },
          status: 'COMPLETED',
        },
      })

      const cardioAssigned = await prisma.cardioSessionAssignment.count({
        where: {
          athleteId: member.id,
          teamBroadcastId: { not: null },
          assignedDate: { gte: thirtyDaysAgo },
        },
      })
      const cardioCompleted = await prisma.cardioSessionAssignment.count({
        where: {
          athleteId: member.id,
          teamBroadcastId: { not: null },
          assignedDate: { gte: thirtyDaysAgo },
          status: 'COMPLETED',
        },
      })

      const hybridAssigned = await prisma.hybridWorkoutAssignment.count({
        where: {
          athleteId: member.id,
          teamBroadcastId: { not: null },
          assignedDate: { gte: thirtyDaysAgo },
        },
      })
      const hybridCompleted = await prisma.hybridWorkoutAssignment.count({
        where: {
          athleteId: member.id,
          teamBroadcastId: { not: null },
          assignedDate: { gte: thirtyDaysAgo },
          status: 'COMPLETED',
        },
      })

      const totalAssigned = strengthAssigned + cardioAssigned + hybridAssigned
      const totalCompleted = strengthCompleted + cardioCompleted + hybridCompleted

      return {
        athleteId: member.id,
        name: member.name,
        email: member.email,
        assignedCount: totalAssigned,
        completedCount: totalCompleted,
        completionRate:
          totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0,
      }
    })
  )

  memberStats.sort((a, b) => b.completionRate - a.completionRate)

  const totalWorkoutsAssigned = memberStats.reduce((sum, m) => sum + m.assignedCount, 0)
  const totalWorkoutsCompleted = memberStats.reduce((sum, m) => sum + m.completedCount, 0)
  const overallCompletionRate =
    totalWorkoutsAssigned > 0
      ? Math.round((totalWorkoutsCompleted / totalWorkoutsAssigned) * 100)
      : 0

  const missingProfileCount = team.members.filter(
    (member) =>
      !member.email ||
      !member.position ||
      !member.birthDate ||
      !member.height ||
      !member.weight
  ).length
  const athleteAccountCount = team.members.filter((member) => member.athleteAccount).length
  const rosterReady = team.members.length > 0 && missingProfileCount === 0
  const athletePortalReady =
    team.members.length > 0 && athleteAccountCount === team.members.length

  return (
    <div className="container mx-auto py-8 px-4">
      <Link href={basePath}>
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('backToTeams')}
        </Button>
      </Link>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold dark:text-white">{team.name}</h1>
            {team.sportType && (
              <Badge variant="secondary" className="text-sm">
                {sportLabelKey ? tSports(sportLabelKey) : team.sportType}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {t('playerCount', { count: team.members.length })}
            </span>
            {team.organization && (
              <span className="flex items-center gap-1">
                <span className="text-sm">{team.organization.name}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href={`/${businessSlug}/coach/teams/${teamId}/medical`}>
              <ShieldAlert className="mr-2 h-4 w-4" />
              Medical
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/${businessSlug}/coach/teams/${teamId}/calendar`}>
              <Calendar className="mr-2 h-4 w-4" />
              {t('actions.teamCalendar')}
            </Link>
          </Button>
          <TeamDayPrintButton
            teamId={teamId}
            teamName={team.name}
            coachBasePath={`/${businessSlug}/coach`}
          />
          <AddPlayersDialog
            teamId={teamId}
            teamName={team.name}
            basePath={`/${businessSlug}/coach`}
            importPath={`/${businessSlug}/coach/teams/${teamId}/import`}
          />
          <CreateTeamPlanDialog
            teamId={teamId}
            teamName={team.name}
            businessSlug={businessSlug}
          />
          <TeamDashboardClient teamId={teamId} basePath={`/${businessSlug}`} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <GlassCard glow="blue">
          <GlassCardHeader className="pb-2">
            <GlassCardDescription>{t('stats.players')}</GlassCardDescription>
            <GlassCardTitle className="text-2xl dark:text-white">{team.members.length}</GlassCardTitle>
          </GlassCardHeader>
        </GlassCard>
        <GlassCard glow="purple">
          <GlassCardHeader className="pb-2">
            <GlassCardDescription>{t('stats.assignedWorkouts')}</GlassCardDescription>
            <GlassCardTitle className="text-2xl dark:text-white">{totalWorkoutsAssigned}</GlassCardTitle>
          </GlassCardHeader>
        </GlassCard>
        <GlassCard glow="emerald">
          <GlassCardHeader className="pb-2">
            <GlassCardDescription>{t('stats.completedWorkouts')}</GlassCardDescription>
            <GlassCardTitle className="text-2xl dark:text-white">{totalWorkoutsCompleted}</GlassCardTitle>
          </GlassCardHeader>
        </GlassCard>
        <GlassCard glow="amber">
          <GlassCardHeader className="pb-2">
            <GlassCardDescription>{t('stats.completionRate')}</GlassCardDescription>
            <GlassCardTitle className="text-2xl flex items-center gap-2 dark:text-white">
              {overallCompletionRate}%
              <Progress value={overallCompletionRate} className="w-16 h-2" />
            </GlassCardTitle>
          </GlassCardHeader>
        </GlassCard>
      </div>

      <TeamWorkoutMonitor teamId={teamId} businessSlug={businessSlug} />

      <GlassCard glow="teal" className="mb-8">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2 dark:text-white">
            <CheckCircle2 className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            {t('readiness.title')}
          </GlassCardTitle>
          <GlassCardDescription>
            {t('readiness.description')}
          </GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <PilotReadinessItem
              label={t('readiness.roster')}
              ready={team.members.length > 0}
              detail={t('playerCount', { count: team.members.length })}
              readyLabel={t('readiness.ready')}
              pendingLabel={t('readiness.pending')}
            />
            <PilotReadinessItem
              label={t('readiness.profiles')}
              ready={rosterReady}
              detail={missingProfileCount === 0 ? t('readiness.completeFields') : t('readiness.missingFields', { count: missingProfileCount })}
              readyLabel={t('readiness.ready')}
              pendingLabel={t('readiness.pending')}
            />
            <PilotReadinessItem
              label={t('readiness.athletePortal')}
              ready={athletePortalReady}
              detail={t('readiness.accountCount', { active: athleteAccountCount, total: team.members.length })}
              readyLabel={t('readiness.ready')}
              pendingLabel={t('readiness.pending')}
            />
            <PilotReadinessItem
              label={t('readiness.testFlow')}
              ready={hockeyTestCount > 0}
              detail={hockeyTestCount > 0 ? t('readiness.hockeyTests', { count: hockeyTestCount }) : t('readiness.runFirstHockeyTest')}
              readyLabel={t('readiness.ready')}
              pendingLabel={t('readiness.pending')}
            />
          </div>
        </GlassCardContent>
      </GlassCard>

      <div className="mb-8">
        {activeTeamPlan ? (
          <AthletePlanSummaryCard
            plan={activeTeamPlan}
            now={today}
            variant="team"
            action={
              <CreateTeamPlanDialog
                teamId={teamId}
                teamName={team.name}
                businessSlug={businessSlug}
                initialPlan={activeTeamPlan}
              />
            }
          />
        ) : (
          <GlassCard glow="blue">
            <GlassCardHeader>
              <GlassCardTitle className="dark:text-white">{t('teamPlan.title')}</GlassCardTitle>
              <GlassCardDescription>
                {t('teamPlan.description')}
              </GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent>
              <CreateTeamPlanDialog
                teamId={teamId}
                teamName={team.name}
                businessSlug={businessSlug}
              />
            </GlassCardContent>
          </GlassCard>
        )}
      </div>

      <div className="mb-8">
        <TeamNotesCard
          teamId={teamId}
          businessSlug={businessSlug}
          currentUserId={user.id}
          canManageAllNotes={canManageAllTeamNotes}
          initialNotes={initialTeamNotes}
        />
      </div>

      <div className="mb-8">
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

      <div className="mt-8">
        <TeamLeaderboard teamId={teamId} />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <GlassCard glow="blue">
          <GlassCardHeader>
            <GlassCardTitle className="dark:text-white">{t('quickLinks.analysis.title')}</GlassCardTitle>
            <GlassCardDescription>
              {t('quickLinks.analysis.description')}
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            <Link href={`/${businessSlug}/coach/teams/${teamId}/analysis`}>
              <Button>{t('quickLinks.analysis.cta')}</Button>
            </Link>
          </GlassCardContent>
        </GlassCard>

        <GlassCard glow="emerald">
          <GlassCardHeader>
            <GlassCardTitle className="dark:text-white">{t('quickLinks.tests.title')}</GlassCardTitle>
            <GlassCardDescription>
              {t('quickLinks.tests.description')}
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            <Link href={`/${businessSlug}/coach/teams/${teamId}/tests`}>
              <Button variant="outline">{t('quickLinks.tests.cta')}</Button>
            </Link>
          </GlassCardContent>
        </GlassCard>

        <GlassCard glow="purple">
          <GlassCardHeader>
            <GlassCardTitle className="dark:text-white">{t('quickLinks.multivariate.title')}</GlassCardTitle>
            <GlassCardDescription>
              {t('quickLinks.multivariate.description')}
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent>
            <Link href={`/${businessSlug}/coach/teams/${teamId}/multivariate`}>
              <Button variant="outline">{t('quickLinks.multivariate.cta')}</Button>
            </Link>
          </GlassCardContent>
        </GlassCard>
      </div>
    </div>
  )
}
