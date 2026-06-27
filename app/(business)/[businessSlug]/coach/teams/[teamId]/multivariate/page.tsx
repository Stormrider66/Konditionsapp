import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { hasProTierAccess } from '@/lib/subscription/require-feature-access'
import { loadLatestModel, loadLatestPLSModel } from '@/lib/mva/model-storage'
import { MVAAnalysisClient } from '@/components/mva/MVAAnalysisClient'
import { TeamAnalysisSubNav } from '@/components/coach/teams/TeamAnalysisSubNav'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BarChart3, Lock } from 'lucide-react'
import { getLocale, getTranslations } from '@/i18n/server'
import { RolePageFrame, RolePageHeader, RolePanel } from '@/components/layouts/role-shell/RolePage'

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

  // Check subscription tier (platform admins bypass subscription gates)
  const hasPro = await hasProTierAccess(user.id)

  if (!hasPro) {
    return (
      <RolePageFrame contentClassName="max-w-2xl">
        <RolePanel className="p-8 text-center sm:p-10">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-md border border-violet-100 bg-violet-50 text-violet-600 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{t('title')}</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            {t('upgradeDescription')}
          </p>
          <div className="mt-6">
            <Button asChild>
              <Link href={`/${businessSlug}/coach/subscription`}>
                {t('upgradeCta')}
              </Link>
            </Button>
          </div>
        </RolePanel>
      </RolePageFrame>
    )
  }

  // Load latest models
  const [latestModel, latestPLSModel] = await Promise.all([
    loadLatestModel(teamId, locale),
    loadLatestPLSModel(teamId, locale),
  ])

  return (
    <RolePageFrame>
      <RolePageHeader
        eyebrow={team.name}
        title={(
          <span className="inline-flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md border border-violet-100 bg-violet-50 text-violet-600 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300">
              <BarChart3 className="h-5 w-5" />
            </span>
            {t('title')}
          </span>
        )}
        description={t('upgradeDescription')}
        actions={<Badge variant="secondary">{team.name}</Badge>}
      />

      <TeamAnalysisSubNav base={`/${businessSlug}/coach/teams/${teamId}`} />

      <MVAAnalysisClient
        teamId={teamId}
        teamName={team.name}
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
          dmodxLimit99: latestModel.dmodxLimit99,
          warnings: latestModel.warnings,
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
          warnings: latestPLSModel.warnings,
          xVariableIds: latestPLSModel.xVariableIds,
          xVariableNames: latestPLSModel.xVariableNames,
          variableCategories: latestPLSModel.variableCategories,
          athleteNames: latestPLSModel.athleteNames,
        } : null}
      />
    </RolePageFrame>
  )
}
