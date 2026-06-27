import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { prisma } from '@/lib/prisma'
import { CreateTeamPlanDialog } from '@/components/coach/teams/CreateTeamPlanDialog'
import { AthletePlanSummaryCard } from '@/components/athlete-plans/AthletePlanSummaryCard'
import { AthletePlanStaffNoteCard } from '@/components/coach/player-notes/AthletePlanStaffNoteCard'
import { TeamNotesCard, type TeamNoteSummary, type TeamNoteTag } from '@/components/coach/teams/TeamNotesCard'
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
            {locale === 'sv' ? 'Individuella plananteckningar' : 'Individual plan notes'}
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {locale === 'sv'
              ? 'Delad personaltext för spelare som har en aktiv individuell plan.'
              : 'Shared staff text for players with an active individual plan.'}
          </p>
        </div>
        {activeIndividualPlans.length === 0 ? (
          <RolePanel className="p-5 sm:p-6">
            <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
              {locale === 'sv' ? 'Inga aktiva individuella planer' : 'No active individual plans'}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {locale === 'sv'
                ? 'Skapa en individuell plan från spelarprofilen för att lägga till plananteckningar här.'
                : 'Create an individual plan from the player profile to add plan notes here.'}
            </p>
          </RolePanel>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {activeIndividualPlans.map((plan) => (
              <div key={plan.id} className="space-y-2">
                <div>
                  <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                    {plan.client.jerseyNumber != null ? `#${plan.client.jerseyNumber} ` : ''}{plan.client.name}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {plan.client.position ? `${plan.client.position} · ` : ''}{plan.name}
                  </p>
                </div>
                <AthletePlanStaffNoteCard
                  clientId={plan.clientId}
                  businessSlug={businessSlug}
                  plan={plan}
                  compact
                />
              </div>
            ))}
          </div>
        )}
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
