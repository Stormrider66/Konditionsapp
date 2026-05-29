import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { getStaffRolePreview } from '@/lib/permissions/role-preview-server'
import { prisma } from '@/lib/prisma'
import { TeamCalendarView } from '@/components/coach/team-calendar/TeamCalendarView'
import { ManageAssistantsDialog } from '@/components/coach/team-calendar/ManageAssistantsDialog'
import { Calendar } from 'lucide-react'
import { getTranslations } from '@/i18n/server'

interface PageProps {
  params: Promise<{
    businessSlug: string
    teamId: string
  }>
}

export default async function TeamCalendarPage({ params }: PageProps) {
  const { businessSlug, teamId } = await params
  const user = await requireCoach()
  const t = await getTranslations('coach.pages.teamCalendar')

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) notFound()
  const previewRole = await getStaffRolePreview(user.id)

  const team = await getAccessibleTeam(user.id, teamId, businessSlug)

  if (!team) notFound()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const activeTeamPlans = await prisma.teamPlan.findMany({
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
  const serializedTeamPlans = activeTeamPlans.map((plan) => ({
    ...plan,
    startDate: plan.startDate.toISOString(),
    endDate: plan.endDate.toISOString(),
    blocks: plan.blocks.map((block) => ({
      ...block,
      startDate: block.startDate.toISOString(),
      endDate: block.endDate.toISOString(),
    })),
  }))

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-7xl">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 dark:text-white">
            <Calendar className="h-5 w-5 sm:h-6 sm:w-6" />
            {t('title', { teamName: team.name })}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('description')}
          </p>
        </div>
        {previewRole !== 'MEMBER' && (
          <ManageAssistantsDialog teamId={team.id} teamName={team.name} />
        )}
      </div>

      <TeamCalendarView
        teamId={team.id}
        teamName={team.name}
        businessSlug={businessSlug}
        initialTeamPlans={serializedTeamPlans}
      />
    </div>
  )
}
