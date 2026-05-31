import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { Badge } from '@/components/ui/badge'
import { Activity } from 'lucide-react'
import { TeamTestTabs } from '@/components/coach/teams/TeamTestTabs'
import { TeamAnalysisSubNav } from '@/components/coach/teams/TeamAnalysisSubNav'
import { getTranslations } from '@/i18n/server'

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
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="flex items-center gap-3 mb-2">
        <Activity className="h-6 w-6 text-purple-500" />
        <h1 className="text-2xl sm:text-3xl font-bold dark:text-white">{t('title')}</h1>
        <Badge variant="secondary">{team.name}</Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        {t('description')}
      </p>

      <TeamAnalysisSubNav base={teamBase} />

      <TeamTestTabs teamId={teamId} teamName={team.name} basePath={basePath} businessSlug={businessSlug} />
    </div>
  )
}
