import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { Badge } from '@/components/ui/badge'
import { BarChart3 } from 'lucide-react'
import { TeamAnalysisClient } from '@/components/coach/teams/TeamAnalysisClient'
import { TeamAnalysisSubNav } from '@/components/coach/teams/TeamAnalysisSubNav'
import { getTranslations } from '@/i18n/server'

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
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="flex items-center gap-3 mb-2">
        <BarChart3 className="h-6 w-6 text-blue-500" />
        <h1 className="text-2xl sm:text-3xl font-bold dark:text-white">{t('title')}</h1>
        <Badge variant="secondary">{team.name}</Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        {t('description')}
      </p>

      <TeamAnalysisSubNav base={teamBase} />

      <TeamAnalysisClient teamId={teamId} basePath={basePath} businessSlug={businessSlug} />
    </div>
  )
}
