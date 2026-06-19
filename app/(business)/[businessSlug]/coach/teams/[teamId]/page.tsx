// app/(business)/[businessSlug]/coach/teams/[teamId]/page.tsx
//
// The "Idag" landing tab. The persistent team header + tab bar live in the
// sibling layout.tsx. This currently shows the phase + attention strips on top
// of an interim body (plan summary + setup readiness + a schedule placeholder);
// the two-pane cockpit body (schedule timeline + roster rail) replaces the
// placeholder in the next slice.
import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { getTeamRosterStatus } from '@/lib/coach/team-roster-status'
import { rosterDotLevel, isHighAcwr } from '@/lib/coach/roster-dot-status'
import { prisma } from '@/lib/prisma'
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
} from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2 } from 'lucide-react'
import { TeamPhaseStrip } from '@/components/coach/teams/cockpit/TeamPhaseStrip'
import { type RailMember } from '@/components/coach/teams/cockpit/TeamRosterRail'
import { TeamCockpit } from '@/components/coach/teams/cockpit/TeamCockpit'
import { getTranslations } from '@/i18n/server'

interface TeamPageProps {
  params: Promise<{
    businessSlug: string
    teamId: string
  }>
}

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000

function computePhase(
  plan: {
    startDate: Date
    endDate: Date
    blocks: Array<{ title: string; focus: string | null; startDate: Date; endDate: Date }>
  },
  now: Date
) {
  const currentIndex = plan.blocks.findIndex(
    (block) => now >= block.startDate && now <= block.endDate
  )
  const current = currentIndex >= 0 ? plan.blocks[currentIndex] : null
  const blockTotal = plan.blocks.length
  const weekTotal = Math.max(
    1,
    Math.round((plan.endDate.getTime() - plan.startDate.getTime()) / MS_PER_WEEK)
  )
  const elapsedWeeks = Math.floor((now.getTime() - plan.startDate.getTime()) / MS_PER_WEEK) + 1
  const weekIndex = Math.min(weekTotal, Math.max(1, elapsedWeeks))

  return {
    blockTitle: current?.title ?? null,
    focus: current?.focus ?? null,
    blockIndex: currentIndex >= 0 ? currentIndex + 1 : 0,
    blockTotal,
    weekIndex,
    weekTotal,
    progress: blockTotal > 0 && currentIndex >= 0 ? (currentIndex + 1) / blockTotal : 0,
  }
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
  const locale: 'en' | 'sv' = user.language === 'sv' ? 'sv' : 'en'

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const team = await getAccessibleTeam(user.id, teamId, businessSlug)
  if (!team) {
    notFound()
  }

  const members = await getTeamRosterStatus(teamId)

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

  const memberCount = members.length
  const missingProfileCount = members.filter(
    (member) =>
      !member.email ||
      !member.position ||
      !member.birthDate ||
      !member.height ||
      !member.weight
  ).length
  const athleteAccountCount = members.filter((member) => member.athleteAccount).length
  const rosterReady = memberCount > 0 && missingProfileCount === 0
  const athletePortalReady = memberCount > 0 && athleteAccountCount === memberCount
  const setupComplete = rosterReady && athletePortalReady && hockeyTestCount > 0

  const injuredPlayers = members
    .filter((member) => member.activeInjuryCount > 0)
    .map((member) => member.name)
  const limitedPlayers = members
    .filter((member) => member.activeInjuryCount === 0 && member.activeRestrictionCount > 0)
    .map((member) => member.name)
  const withoutWorkoutPlayers = members
    .filter(
      (member) =>
        member.hasAthleteAccount &&
        member.todayWorkoutCount === 0 &&
        member.todayCompletedCount === 0
    )
    .map((member) => member.name)
  const highAcwrPlayers = members
    .filter((member) => isHighAcwr(member.acwrZone))
    .map((member) => member.name)

  const phase = activeTeamPlan ? computePhase(activeTeamPlan, today) : null

  const railMembers: RailMember[] = members.map((member) => ({
    id: member.id,
    jerseyNumber: member.jerseyNumber,
    name: member.name,
    position: member.position,
    statusLevel: rosterDotLevel(member),
    activeRestrictionCount: member.activeRestrictionCount,
  }))

  return (
    <div className="container mx-auto pb-8 px-4">
      <div className="mt-2 mb-6 space-y-3">
        {phase && (
          <TeamPhaseStrip
            href={`/${businessSlug}/coach/teams/${teamId}/plan`}
            blockTitle={phase.blockTitle}
            focus={phase.focus}
            blockIndex={phase.blockIndex}
            blockTotal={phase.blockTotal}
            weekIndex={phase.weekIndex}
            weekTotal={phase.weekTotal}
            progress={phase.progress}
          />
        )}
      </div>

      {/* Two-pane cockpit body (schedule timeline | roster rail). The client
          shell owns the day fetch + cross-pane interaction state. */}
      <TeamCockpit
        teamId={teamId}
        teamName={team.name}
        businessSlug={businessSlug}
        locale={locale}
        members={railMembers}
        actionSignals={{
          injuredPlayers,
          limitedPlayers,
          withoutWorkoutPlayers,
          highAcwrPlayers,
        }}
      />

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
