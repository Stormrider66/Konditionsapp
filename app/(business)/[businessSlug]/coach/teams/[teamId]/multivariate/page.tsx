import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { checkCoachSubscriptionStatus } from '@/lib/subscription/feature-access'
import { loadLatestModel, loadLatestPLSModel } from '@/lib/mva/model-storage'
import { MVAAnalysisClient } from '@/components/mva/MVAAnalysisClient'
import { TeamAnalysisSubNav } from '@/components/coach/teams/TeamAnalysisSubNav'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/badge'
import { Lock } from 'lucide-react'
import { getLocale, getTranslations } from '@/i18n/server'

interface AnalysisPageProps {
  params: Promise<{
    businessSlug: string
    teamId: string
  }>
}

export default async function TeamAnalysisPage({ params }: AnalysisPageProps) {
  const { businessSlug, teamId } = await params
  const user = await requireCoach()
  const t = await getTranslations('coach.pages.teamMultivariate')
  const locale = (await getLocale()) === 'sv' ? 'sv' : 'en'

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  // Verify team access inside the business workspace
  const team = await getAccessibleTeam(user.id, teamId, businessSlug)

  if (!team) {
    notFound()
  }

  // Check subscription tier
  const subscription = await checkCoachSubscriptionStatus(user.id)
  const hasPro = ['PRO', 'ENTERPRISE'].includes(subscription.tier)

  if (!hasPro) {
    return (
      <div className="container mx-auto py-8 px-4">
        <GlassCard glow="purple" className="max-w-lg mx-auto">
          <GlassCardHeader className="text-center">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <GlassCardTitle className="dark:text-white">{t('title')}</GlassCardTitle>
            <GlassCardDescription>
              {t('upgradeDescription')}
            </GlassCardDescription>
          </GlassCardHeader>
          <GlassCardContent className="text-center">
            <Link href={`/${businessSlug}/coach/subscription`}>
              <Button>{t('upgradeCta')}</Button>
            </Link>
          </GlassCardContent>
        </GlassCard>
      </div>
    )
  }

  // Load latest models
  const [latestModel, latestPLSModel] = await Promise.all([
    loadLatestModel(teamId, locale),
    loadLatestPLSModel(teamId, locale),
  ])

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-3xl font-bold dark:text-white">{t('title')}</h1>
        <Badge variant="secondary">{team.name}</Badge>
      </div>

      <TeamAnalysisSubNav base={`/${businessSlug}/coach/teams/${teamId}`} />

      <MVAAnalysisClient
        teamId={teamId}
        teamSportType={team.sportType ?? null}
        initialModel={latestModel ? {
          id: latestModel.id,
          createdAt: latestModel.createdAt.toISOString(),
          nComponents: latestModel.nComponents,
          nObservations: latestModel.nObservations,
          nXVariables: latestModel.nXVariables,
          explainedVariance: latestModel.explainedVariance,
          cumulativeVariance: latestModel.cumulativeVariance,
          loadings: latestModel.loadings,
          variableIds: latestModel.variableIds,
          variableNames: latestModel.variableNames,
          variableCategories: latestModel.variableCategories,
          t2Limit95: latestModel.t2Limit95,
          t2Limit99: latestModel.t2Limit99,
          dmodxLimit: latestModel.dmodxLimit,
          athleteScores: latestModel.athleteScores,
        } : null}
        initialPLSModel={latestPLSModel ? {
          id: latestPLSModel.id,
          createdAt: latestPLSModel.createdAt.toISOString(),
          nComponents: latestPLSModel.nComponents,
          nObservations: latestPLSModel.nObservations,
          nXVariables: latestPLSModel.nXVariables,
          r2Y: latestPLSModel.r2Y,
          q2: latestPLSModel.q2,
          vipScores: latestPLSModel.vipScores,
          yVariableId: latestPLSModel.yVariableId,
          yVariableName: latestPLSModel.yVariableName,
          yObserved: latestPLSModel.yObserved,
          yPredicted: latestPLSModel.yPredicted,
          aiInsight: latestPLSModel.aiInsight,
          xVariableIds: latestPLSModel.xVariableIds,
          xVariableNames: latestPLSModel.xVariableNames,
          variableCategories: latestPLSModel.variableCategories,
          athleteNames: latestPLSModel.athleteNames,
        } : null}
      />
    </div>
  )
}
