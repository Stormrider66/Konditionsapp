import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { Badge } from '@/components/ui/badge'
import { BarChart3 } from 'lucide-react'
import { TeamAnalysisClient } from '@/components/coach/teams/TeamAnalysisClient'
import { TeamAnalysisSubNav } from '@/components/coach/teams/TeamAnalysisSubNav'
import { getTranslations } from '@/i18n/server'
import { RolePageFrame, RolePageHeader } from '@/components/layouts/role-shell/RolePage'

interface AnalysisPageProps {
  params: Promise<{
    businessSlug: string
    teamId: string
  }>
}

export default async function TeamAnalysisPage({ params }: AnalysisPageProps) {
  const { businessSlug, teamId } = await params
  const user = await requireCoach()
  const t = await getTranslations('coach.pages.teamAnalysis')

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
            <span className="flex h-10 w-10 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">
              <BarChart3 className="h-5 w-5" />
            </span>
            {t('title')}
          </span>
        )}
        description={t('description')}
        actions={<Badge variant="secondary">{team.name}</Badge>}
      />

      <TeamAnalysisSubNav base={teamBase} />

      <TeamAnalysisClient teamId={teamId} basePath={basePath} businessSlug={businessSlug} />
    </RolePageFrame>
  )
}
