// app/(business)/[businessSlug]/coach/teams/[teamId]/page.tsx
//
// The "Idag" landing tab. The persistent team header + tab bar live in the
// sibling layout.tsx. This is currently an interim view (phase summary +
// setup readiness + a placeholder for today's schedule); the full two-pane
// cockpit (schedule timeline + roster rail) replaces the body in Phase 2.
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
import { Badge } from '@/components/ui/badge'
import { CalendarClock, CheckCircle2 } from 'lucide-react'
import { CreateTeamPlanDialog } from '@/components/coach/teams/CreateTeamPlanDialog'
import { AthletePlanSummaryCard } from '@/components/athlete-plans/AthletePlanSummaryCard'
import { getTranslations } from '@/i18n/server'

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
      name: true,
      members: {
        select: {
          id: true,
          email: true,
          position: true,
          birthDate: true,
          height: true,
          weight: true,
          athleteAccount: { select: { id: true } },
        },
      },
    },
  })

  if (!team) {
    notFound()
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const hockeyTestCount = await prisma.hockeyPhysicalTest.count({ where: { teamId } })

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

  const memberCount = team.members.length
  const missingProfileCount = team.members.filter(
    (member) =>
      !member.email ||
      !member.position ||
      !member.birthDate ||
      !member.height ||
      !member.weight
  ).length
  const athleteAccountCount = team.members.filter((member) => member.athleteAccount).length
  const rosterReady = memberCount > 0 && missingProfileCount === 0
  const athletePortalReady = memberCount > 0 && athleteAccountCount === memberCount
  const setupComplete = rosterReady && athletePortalReady && hockeyTestCount > 0

  return (
    <div className="container mx-auto pb-8 px-4">
      {/* Today's schedule placeholder — the full two-pane cockpit lands in Phase 2. */}
      <GlassCard glow="blue" className="mt-2 mb-8">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2 dark:text-white">
            <CalendarClock className="h-5 w-5 text-blue-500" />
            {t('cockpit.scheduleComingTitle')}
          </GlassCardTitle>
          <GlassCardDescription>
            {t('cockpit.scheduleComingDescription')}
          </GlassCardDescription>
        </GlassCardHeader>
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

      {!setupComplete && (
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
                ready={memberCount > 0}
                detail={t('playerCount', { count: memberCount })}
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
                detail={t('readiness.accountCount', { active: athleteAccountCount, total: memberCount })}
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
      )}
    </div>
  )
}
