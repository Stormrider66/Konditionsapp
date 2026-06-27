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
import { RolePageFrame, RolePageHeader } from '@/components/layouts/role-shell/RolePage'

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
    <RolePageFrame>
      <RolePageHeader
        eyebrow={team.name}
        title={(
          <span className="inline-flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">
              <Calendar className="h-5 w-5" />
            </span>
            {t('title', { teamName: team.name })}
          </span>
        )}
        description={t('description')}
        actions={previewRole !== 'MEMBER' ? (
          <ManageAssistantsDialog teamId={team.id} teamName={team.name} />
        ) : undefined}
      />

      <TeamCalendarView
        teamId={team.id}
        teamName={team.name}
        businessSlug={businessSlug}
        initialTeamPlans={serializedTeamPlans}
      />
    </RolePageFrame>
  )
}
