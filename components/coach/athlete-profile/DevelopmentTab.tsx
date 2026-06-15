'use client'

import { useCallback } from 'react'
import Link from 'next/link'
import { CheckCircle2, CircleAlert } from 'lucide-react'
import { useLocale, useTranslations } from '@/i18n/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { usePageContextOptional } from '@/components/ai-studio/PageContextProvider'
import type { PageContext } from '@/components/ai-studio/FloatingAIChat'
import { getOptionalExerciseDisplayName } from '@/lib/exercises/display-name'
import { exportClientTestsToCSV } from '@/lib/utils/csv-export'
import { ProgressionChart } from '@/components/charts/ProgressionChart'
import { SportSpecificAthleteView } from '@/components/coach/sport-views'
import { PaceValidationDashboard } from '@/components/coach/pace-zones/PaceValidationDashboard'
import { ClientVideoAnalyses } from '@/components/coach/video-analysis/ClientVideoAnalyses'
import { VBTProgressionWidget } from '@/components/athlete/VBTProgressionWidget'
import { Concept2SummaryWidget } from '@/components/athlete/Concept2SummaryWidget'
import { ZoneDistributionChart } from '@/components/athlete/ZoneDistributionChart'
import { WeeklyZoneSummary } from '@/components/athlete/WeeklyZoneSummary'
import { YearlyTrainingOverview } from '@/components/athlete/YearlyTrainingOverview'
import { StrengthPRTable } from '@/components/coach/strength/StrengthPRTable'
import { PendingPRFeedSingle } from '@/components/coach/strength/PendingPRFeed'
import { ProgressionDashboard } from '@/components/coach/progression/ProgressionDashboard'
import { CoachQuickErgDevelopmentPanel } from '@/components/coach/quick-erg/CoachQuickErgWidgets'
import { AssessmentTimeline } from './AssessmentTimeline'
import { WellnessTrends } from './WellnessTrends'
import { TrainingStats } from './TrainingStats'
import { RecurringExercises } from './RecurringExercises'
import { HockeyTeamRank } from './HockeyTeamRank'
import type {
  ClientWithTests,
  SportProfileSummary,
  CoachSnapshotTone,
} from './types'

interface DevelopmentTabProps {
  id: string
  basePath: string
  businessSlug: string
  client: ClientWithTests
  sportProfile: SportProfileSummary | null
  sportProfileLoading: boolean
  showPaceZones: boolean
  /** Team id when this is a hockey team athlete; null otherwise (gates team benchmarking). */
  hockeyTeamId: string | null
  newTestHref: string
  developmentStatusTone: CoachSnapshotTone
  latestTestLabel: string
  aggregatedTestCount: number
  developmentTrendLabel: string
  developmentPrimarySportLabel: string
  developmentChangeTitle: string
  developmentChangeDescription: string
  hasRecentTest: boolean
  onRefetchClient: () => Promise<void>
  onRefetchRecentTests: () => Promise<void>
}

export function DevelopmentTab({
  id,
  basePath,
  businessSlug,
  client,
  sportProfile,
  sportProfileLoading,
  showPaceZones,
  hockeyTeamId,
  newTestHref,
  developmentStatusTone,
  latestTestLabel,
  aggregatedTestCount,
  developmentTrendLabel,
  developmentPrimarySportLabel,
  developmentChangeTitle,
  developmentChangeDescription,
  hasRecentTest,
  onRefetchClient,
  onRefetchRecentTests,
}: DevelopmentTabProps) {
  const t = useTranslations('coach.pages.clientDetail')
  const locale = useLocale()

  const { toast } = useToast()
  const pageContextApi = usePageContextOptional()

  const handleLoadVideoAnalysisToAI = useCallback((analysis: {
    id: string
    videoType: string
    formScore: number | null
    aiAnalysis: string | null
    issuesDetected: Array<{ issue: string; severity: string; description: string }> | null
    recommendations: Array<{ priority: number; recommendation: string; explanation: string }> | null
    exercise: { name: string; nameSv: string | null; nameEn?: string | null } | null
  }) => {
    if (!pageContextApi?.setPageContext) {
      toast({
        title: t('toasts.aiStudioUnavailableTitle'),
        description: t('toasts.aiStudioUnavailableDescription'),
        variant: 'destructive',
      })
      return
    }

    const exerciseName = getOptionalExerciseDisplayName(analysis.exercise, locale)
    const context: PageContext = {
      type: 'video-analysis',
      title: t('aiContext.title', { exercise: exerciseName || analysis.videoType }),
      data: {
        analysisId: analysis.id,
        videoType: analysis.videoType,
        formScore: analysis.formScore,
        exercise: exerciseName,
        issues: analysis.issuesDetected,
        recommendations: analysis.recommendations,
      },
      summary: t('aiContext.summary', {
        athlete: client.name || t('aiContext.athleteFallback'),
        exercise: exerciseName || analysis.videoType,
        score: analysis.formScore ?? t('aiContext.notAssessed'),
        count: analysis.issuesDetected?.length || 0,
      }),
    }

    pageContextApi.setPageContext(context)
  }, [pageContextApi, client.name, locale, t, toast])

  const handleExportTests = () => {
    if (!client || !client.tests || client.tests.length === 0) {
      toast({
        title: t('toasts.noExportDataTitle'),
        description: t('toasts.noExportDataDescription'),
        variant: 'destructive',
      })
      return
    }

    try {
      const testsToExport = [...client.tests].sort(
        (a, b) => new Date(b.testDate).getTime() - new Date(a.testDate).getTime()
      )

      exportClientTestsToCSV(testsToExport, client.name, locale)

      toast({
        title: t('toasts.exportSuccessTitle'),
        description: t('toasts.exportSuccessDescription', { count: testsToExport.length }),
      })
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: t('toasts.exportErrorTitle'),
        description: t('toasts.exportErrorDescription'),
        variant: 'destructive',
      })
    }
  }

  const developmentContent = (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white dark:bg-slate-900/50 rounded-lg shadow-md dark:border dark:border-white/10 p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-semibold dark:text-white">{t('development.title')}</h2>
              <Badge
                variant="outline"
                className={cn(
                  'border font-medium',
                  developmentStatusTone === 'good' && 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
                  developmentStatusTone === 'caution' && 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
                  developmentStatusTone === 'setup' && 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200',
                )}
              >
                {developmentStatusTone === 'good' ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : <CircleAlert className="mr-1 h-3.5 w-3.5" />}
                {t(`development.status.${developmentStatusTone}`)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {t(`development.summary.${developmentStatusTone}`)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={newTestHref}>
              <Button size="sm">{t('tests.newTest')}</Button>
            </Link>
            <Link href={`${basePath}/clients/${id}?tab=profile`}>
              <Button variant="outline" size="sm">{t('development.editProfile')}</Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4 mt-5">
          <div className="rounded-lg border border-gray-200 dark:border-white/10 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('development.latestTest')}</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1 truncate">{latestTestLabel}</p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-white/10 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('development.testDepth')}</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
              {t('development.completedTests', { count: aggregatedTestCount })}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-white/10 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('development.vo2Trend')}</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1 truncate">{developmentTrendLabel}</p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-white/10 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('development.sportContext')}</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1 truncate">{developmentPrimarySportLabel}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('development.change.label')}</p>
            <h3 className="mt-1 text-base font-semibold text-gray-900 dark:text-white">{developmentChangeTitle}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{developmentChangeDescription}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('development.coachPrompt.label')}</p>
            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
              {developmentStatusTone === 'good'
                ? t('development.coachPrompt.good')
                : developmentStatusTone === 'caution'
                  ? t('development.coachPrompt.caution')
                  : t('development.coachPrompt.setup')}
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3 mt-5">
          <Link href={`${basePath}/clients/${id}?tab=development`}>
            <Button variant="outline" className="h-auto w-full justify-start p-3">
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('development.reviewTests')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('development.reviewTestsDescription')}</p>
              </div>
            </Button>
          </Link>
          <Link href={newTestHref}>
            <Button variant="outline" className="h-auto w-full justify-start p-3">
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{hasRecentTest ? t('development.planNextTest') : t('development.updateTest')}</p>
                <p className="text-xs text-muted-foreground mt-1">{hasRecentTest ? t('development.planNextTestDescription') : t('development.updateTestDescription')}</p>
              </div>
            </Button>
          </Link>
          <Link href={`${basePath}/clients/${id}?tab=profile#sport-profile`}>
            <Button variant="outline" className="h-auto w-full justify-start p-3">
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('development.completeSportContext')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('development.completeSportContextDescription')}</p>
              </div>
            </Button>
          </Link>
          <Link href={`${basePath}/ai-studio?athleteId=${id}&prompt=Analysera+utvecklingen`}>
            <Button variant="outline" className="h-auto w-full justify-start p-3">
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('development.askAi')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('development.askAiDescription')}</p>
              </div>
            </Button>
          </Link>
        </div>
      </div>

      {!sportProfileLoading && (
        <SportSpecificAthleteView
          clientId={id}
          clientName={client.name}
          sportProfile={sportProfile}
          basePath={`/${businessSlug}`}
        />
      )}

      {!sportProfileLoading && showPaceZones && (
        <div className="bg-white dark:bg-slate-900/50 rounded-lg shadow-md dark:border dark:border-white/10 p-6 mb-6">
          <PaceValidationDashboard
            clientId={id}
            clientName={client.name}
          />
        </div>
      )}

      {hockeyTeamId && <HockeyTeamRank clientId={id} teamId={hockeyTeamId} />}

      <TrainingStats clientId={id} />

      <CoachQuickErgDevelopmentPanel clientId={id} basePath={basePath} />

      <AssessmentTimeline
        clientId={id}
        basePath={basePath}
        onExportCsv={handleExportTests}
        onEnduranceTestDeleted={() => {
          void onRefetchClient()
          void onRefetchRecentTests()
        }}
      />

      <PendingPRFeedSingle clientId={id} />

      <StrengthPRTable clientId={id} clientName={client.name} />

      <ProgressionDashboard clientId={id} clientName={client.name} />

      <RecurringExercises clientId={id} />

      <ClientVideoAnalyses
        clientId={id}
        clientName={client.name}
        onLoadToAI={handleLoadVideoAnalysisToAI}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <VBTProgressionWidget clientId={id} />
        <Concept2SummaryWidget clientId={id} />
      </div>

      <WellnessTrends clientId={id} />

      <div className="bg-white dark:bg-slate-900/50 rounded-lg shadow-md dark:border dark:border-white/10 p-4 sm:p-6 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-4 dark:text-white">{t('overview.heartRateZoneAnalysis')}</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-1">
            <WeeklyZoneSummary clientId={id} />
          </div>
          <div className="lg:col-span-2">
            <ZoneDistributionChart clientId={id} />
          </div>
        </div>
      </div>

      <div className="mb-6">
        <YearlyTrainingOverview clientId={id} />
      </div>

      {client.tests && client.tests.length >= 2 && (
        <ProgressionChart tests={client.tests} />
      )}
    </div>
  )

  return developmentContent
}
