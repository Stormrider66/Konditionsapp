import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { Badge } from '@/components/ui/badge'
import { Activity } from 'lucide-react'
import { TeamTestTabs } from '@/components/coach/teams/TeamTestTabs'
import { TeamAnalysisSubNav } from '@/components/coach/teams/TeamAnalysisSubNav'
import { getTranslations } from '@/i18n/server'
import { RolePageFrame, RolePageHeader } from '@/components/layouts/role-shell/RolePage'

interface TestsPageProps {
  params: Promise<{
    businessSlug: string
    teamId: string
  }>
}

export default async function TeamTestsPage({ params }: TestsPageProps) {
  const { businessSlug, teamId } = await params
  const user = await requireCoach()
  const t = await getTranslations('coach.pages.teamTests')

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const team = await getAccessibleTeam(user.id, teamId, businessSlug)

  if (!team) {
    notFound()
  }

  const basePath = `/${businessSlug}/coach`
  const teamBase = `/${businessSlug}/coach/teams/${teamId}`

  return (
    <RolePageFrame>
      <RolePageHeader
        eyebrow={team.name}
        title={(
          <span className="inline-flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md border border-violet-100 bg-violet-50 text-violet-600 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300">
              <Activity className="h-5 w-5" />
            </span>
            {t('title')}
          </span>
        )}
        description={t('description')}
        actions={<Badge variant="secondary">{team.name}</Badge>}
      />

      <TeamAnalysisSubNav base={teamBase} />

      <TeamTestTabs teamId={teamId} teamName={team.name} basePath={basePath} businessSlug={businessSlug} />
    </RolePageFrame>
  )
}
