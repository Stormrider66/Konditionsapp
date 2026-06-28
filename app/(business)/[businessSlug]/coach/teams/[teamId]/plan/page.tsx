import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { prisma } from '@/lib/prisma'
import { CreateTeamPlanDialog } from '@/components/coach/teams/CreateTeamPlanDialog'
import { AthletePlanSummaryCard } from '@/components/athlete-plans/AthletePlanSummaryCard'
import { TeamNotesCard, type TeamNoteSummary, type TeamNoteTag } from '@/components/coach/teams/TeamNotesCard'
import { TeamIndividualPlansSection, type IndividualPlanEntry } from '@/components/coach/teams/TeamIndividualPlansSection'
import { getTranslations } from '@/i18n/server'
import { ClipboardList } from 'lucide-react'
import { RolePageFrame, RolePageHeader, RolePanel } from '@/components/layouts/role-shell/RolePage'

interface TeamPlanPageProps {
  params: Promise<{
    businessSlug: string
    teamId: string
  }>
}

export default async function TeamPlanPage({ params }: TeamPlanPageProps) {
  const { businessSlug, teamId } = await params
  const t = await getTranslations('coach.pages.teamDetail')
  const user = await requireCoach()
  const locale = user.language === 'sv' ? 'sv' : 'en'

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const team = await getAccessibleTeam(user.id, teamId, businessSlug)
  if (!team) {
    notFound()
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

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

  const activeIndividualPlans = await prisma.athletePlan.findMany({
    where: {
      status: 'ACTIVE',
      startDate: { lte: today },
      endDate: { gte: today },
      client: { teamId },
    },
    select: {
      id: true,
      clientId: true,
      coachId: true,
      name: true,
      description: true,
      status: true,
      planType: true,
      staffPlanNote: true,
      staffPlanNoteVisibleToAthlete: true,
      staffPlanNoteUpdatedAt: true,
      staffPlanNoteAuthorId: true,
      staffPlanNoteAuthor: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      startDate: true,
      endDate: true,
      client: {
        select: {
          name: true,
          jerseyNumber: true,
          position: true,
        },
      },
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
    orderBy: [
      { client: { jerseyNumber: 'asc' } },
      { startDate: 'desc' },
    ],
  })

  // Injury / restriction / rehab context for every team member, so individual
  // plans can be split into special vs injury-recovery, and so injured players
  // without a plan surface as "needs a program". Mirrors the Medical (Hälsa) tab.
  const medicalTeam = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      members: {
        orderBy: [{ jerseyNumber: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          jerseyNumber: true,
          position: true,
          injuryAssessments: {
            where: { resolved: false, status: { in: ['ACTIVE', 'MONITORING'] } },
            orderBy: { date: 'desc' },
            take: 1,
            select: { injuryType: true, bodyPart: true, painLevel: true },
          },
          trainingRestrictions: {
            where: { isActive: true, OR: [{ endDate: null }, { endDate: { gte: today } }] },
            orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
            take: 1,
            select: { type: true, severity: true },
          },
          rehabPrograms: {
            where: { status: 'ACTIVE' },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { name: true, currentPhase: true },
          },
          acuteInjuryReports: {
            where: { status: 'PENDING_REVIEW' },
            select: { id: true },
          },
        },
      },
    },
  })

  const formatEnumLabel = (value?: string | null) =>
    value ? value.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : ''
  const plansByClient = new Map(activeIndividualPlans.map((plan) => [plan.clientId, plan]))
  const individualSpecial: IndividualPlanEntry[] = []
  const individualRecovery: IndividualPlanEntry[] = []
  const individualNeeds: IndividualPlanEntry[] = []

  for (const member of medicalTeam?.members ?? []) {
    const plan = plansByClient.get(member.id) ?? null
    const injuryRow = member.injuryAssessments[0] ?? null
    const restrictionRow = member.trainingRestrictions[0] ?? null
    const rehabRow = member.rehabPrograms[0] ?? null
    const hasPendingReport = member.acuteInjuryReports.length > 0
    const hasInjuryContext = Boolean(injuryRow || restrictionRow || rehabRow || hasPendingReport)

    if (!plan && !hasInjuryContext) continue

    const entry: IndividualPlanEntry = {
      clientId: member.id,
      name: member.name,
      jerseyNumber: member.jerseyNumber,
      position: member.position,
      plan,
      planType: plan?.planType ?? null,
      rehab: rehabRow ? { name: rehabRow.name, phase: rehabRow.currentPhase } : null,
      injury: injuryRow
        ? {
            label: formatEnumLabel(injuryRow.injuryType || injuryRow.bodyPart) || (locale === 'sv' ? 'Skada' : 'Injury'),
            detail: `${locale === 'sv' ? 'Smärta' : 'Pain'} ${injuryRow.painLevel}/10`,
          }
        : restrictionRow
          ? { label: formatEnumLabel(restrictionRow.type), detail: formatEnumLabel(restrictionRow.severity) }
          : null,
      restriction: restrictionRow ? { label: formatEnumLabel(restrictionRow.type) } : null,
      hasPendingReport,
    }

    const isRecovery =
      (plan && (plan.planType === 'INJURY_RECOVERY' || plan.planType === 'RETURN_TO_PLAY')) || hasInjuryContext

    if (plan) {
      if (isRecovery) individualRecovery.push(entry)
      else individualSpecial.push(entry)
    } else if (rehabRow) {
      individualRecovery.push(entry)
    } else {
      individualNeeds.push(entry)
    }
  }

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

  return (
    <RolePageFrame>
      <RolePageHeader
        eyebrow={team.name}
        title={(
          <span className="inline-flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">
              <ClipboardList className="h-5 w-5" />
            </span>
            {t('teamPlan.title')}
          </span>
        )}
        description={t('teamPlan.description')}
        actions={(
          <CreateTeamPlanDialog
            teamId={teamId}
            teamName={team.name}
            businessSlug={businessSlug}
          />
        )}
      />

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
          <RolePanel className="p-5 sm:p-6">
            <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{t('teamPlan.emptyTitle')}</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {t('teamPlan.emptyDescription')}
            </p>
          </RolePanel>
        )}
      </div>

      <div className="mb-8">
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            {locale === 'sv' ? 'Individuella planer' : 'Individual plans'}
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {locale === 'sv'
              ? 'Specialprogram och skadeåterhämtning – en överblick av spelare som behöver särskild planering.'
              : 'Special programs and injury recovery — an overview of players who need special planning.'}
          </p>
        </div>
        <TeamIndividualPlansSection
          businessSlug={businessSlug}
          locale={locale}
          special={individualSpecial}
          recovery={individualRecovery}
          needs={individualNeeds}
        />
      </div>

      <div>
        <TeamNotesCard
          teamId={teamId}
          businessSlug={businessSlug}
          currentUserId={user.id}
          canManageAllNotes={canManageAllTeamNotes}
          initialNotes={initialTeamNotes}
        />
      </div>
    </RolePageFrame>
  )
}
