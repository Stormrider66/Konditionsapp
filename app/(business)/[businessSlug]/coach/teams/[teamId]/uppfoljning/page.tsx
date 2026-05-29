import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { prisma } from '@/lib/prisma'
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
} from '@/components/ui/GlassCard'
import { Progress } from '@/components/ui/progress'
import { TeamWorkoutMonitor } from '@/components/coach/teams/TeamWorkoutMonitor'
import { TeamLeaderboard } from '@/components/coach/leaderboards'
import { getTranslations } from '@/i18n/server'

interface TeamFollowUpPageProps {
  params: Promise<{
    businessSlug: string
    teamId: string
  }>
}

export default async function TeamFollowUpPage({ params }: TeamFollowUpPageProps) {
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
    select: {
      id: true,
      members: {
        select: {
          id: true,
          businessId: true,
          athleteAccount: { select: { id: true } },
        },
      },
    },
  })

  if (!team) {
    notFound()
  }

  // Last 30 days of team-broadcast assignments, scoped to athletes in this business.
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const activeWorkoutMembers = team.members.filter((member) => (
    Boolean(member.athleteAccount) && member.businessId === membership.businessId
  ))

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

      return {
        assignedCount: strengthAssigned + cardioAssigned + hybridAssigned,
        completedCount: strengthCompleted + cardioCompleted + hybridCompleted,
      }
    })
  )

  const totalWorkoutsAssigned = memberStats.reduce((sum, m) => sum + m.assignedCount, 0)
  const totalWorkoutsCompleted = memberStats.reduce((sum, m) => sum + m.completedCount, 0)
  const overallCompletionRate =
    totalWorkoutsAssigned > 0
      ? Math.round((totalWorkoutsCompleted / totalWorkoutsAssigned) * 100)
      : 0

  return (
    <div className="container mx-auto py-8 px-4">
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

      <div className="mt-8">
        <TeamLeaderboard teamId={teamId} />
      </div>
    </div>
  )
}
