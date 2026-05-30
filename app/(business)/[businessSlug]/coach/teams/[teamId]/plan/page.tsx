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
import { CreateTeamPlanDialog } from '@/components/coach/teams/CreateTeamPlanDialog'
import { AthletePlanSummaryCard } from '@/components/athlete-plans/AthletePlanSummaryCard'
import { TeamNotesCard, type TeamNoteSummary, type TeamNoteTag } from '@/components/coach/teams/TeamNotesCard'
import { getTranslations } from '@/i18n/server'

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
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight dark:text-white">
            {t('teamPlan.title')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('teamPlan.description')}
          </p>
        </div>
        <CreateTeamPlanDialog
          teamId={teamId}
          teamName={team.name}
          businessSlug={businessSlug}
        />
      </div>

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
              <GlassCardTitle className="dark:text-white">{t('teamPlan.emptyTitle')}</GlassCardTitle>
              <GlassCardDescription>
                {t('teamPlan.emptyDescription')}
              </GlassCardDescription>
            </GlassCardHeader>
          </GlassCard>
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
    </div>
  )
}
