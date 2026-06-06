'use client'

import { useState, useMemo, useCallback, Fragment } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import {
  ChevronDown, ChevronUp, ArrowUpDown, Trash2, Download, Edit2,
  CheckCircle2, CircleAlert,
} from 'lucide-react'
import { useLocale, useTranslations } from '@/i18n/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SearchInput } from '@/components/ui/search-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { usePageContextOptional } from '@/components/ai-studio/PageContextProvider'
import type { PageContext } from '@/components/ai-studio/FloatingAIChat'
import { getOptionalExerciseDisplayName } from '@/lib/exercises/display-name'
import { exportClientTestsToCSV } from '@/lib/utils/csv-export'
import { ProgressionChart } from '@/components/charts/ProgressionChart'
import { SportSpecificAthleteView } from '@/components/coach/sport-views'
import { PaceValidationDashboard } from '@/components/coach/pace-zones/PaceValidationDashboard'
import { AnalyzeTestButton } from '@/components/ai/performance-analysis'
import { ClientVideoAnalyses } from '@/components/coach/video-analysis/ClientVideoAnalyses'
import { VBTProgressionWidget } from '@/components/athlete/VBTProgressionWidget'
import { Concept2SummaryWidget } from '@/components/athlete/Concept2SummaryWidget'
import { ZoneDistributionChart } from '@/components/athlete/ZoneDistributionChart'
import { WeeklyZoneSummary } from '@/components/athlete/WeeklyZoneSummary'
import { YearlyTrainingOverview } from '@/components/athlete/YearlyTrainingOverview'
import { StrengthPRTable } from '@/components/coach/strength/StrengthPRTable'
import { PendingPRFeedSingle } from '@/components/coach/strength/PendingPRFeed'
import { ProgressionDashboard } from '@/components/coach/progression/ProgressionDashboard'
import { AssessmentTimeline } from './AssessmentTimeline'
import { WellnessTrends } from './WellnessTrends'
import { TrainingStats } from './TrainingStats'
import { RecurringExercises } from './RecurringExercises'
import { HockeyTeamRank } from './HockeyTeamRank'
import type { Test, TestType, TrainingZone } from '@/types'
import type {
  ClientWithTests,
  SportProfileSummary,
  ThresholdSummary,
  SortField,
  SortDirection,
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
  /** Whether to show the legacy endurance-only test table (hidden for team/racket athletes with no endurance tests). */
  showEnduranceTable: boolean
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
  showEnduranceTable,
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
  const dateFnsLocale = locale === 'sv' ? sv : enUS

  const { toast } = useToast()
  const pageContextApi = usePageContextOptional()

  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [filterTestType, setFilterTestType] = useState<TestType | 'ALL'>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [testToDelete, setTestToDelete] = useState<Test | null>(null)
  const [deleting, setDeleting] = useState(false)

  const testTypeLabels: Record<TestType, string> = {
    RUNNING: t('testTypes.running'),
    CYCLING: t('testTypes.cycling'),
    SKIING: t('testTypes.skiing'),
  }
  const testStatusLabels: Record<string, string> = {
    COMPLETED: t('testStatus.completed'),
    DRAFT: t('testStatus.draft'),
    ARCHIVED: t('testStatus.archived'),
  }

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

  const sortedAndFilteredTests = useMemo(() => {
    if (!client.tests) return []

    let filtered = [...client.tests]

    if (filterTestType !== 'ALL') {
      filtered = filtered.filter((test) => test.testType === filterTestType)
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter((test) => {
        const dateString = format(new Date(test.testDate), 'PPP', { locale: dateFnsLocale }).toLowerCase()
        const notes = test.notes?.toLowerCase() || ''
        return dateString.includes(search) || notes.includes(search)
      })
    }

    filtered.sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'date':
          comparison = new Date(a.testDate).getTime() - new Date(b.testDate).getTime()
          break
        case 'type':
          comparison = a.testType.localeCompare(b.testType)
          break
        case 'vo2max':
          comparison = (a.vo2max || 0) - (b.vo2max || 0)
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [client.tests, filterTestType, searchTerm, sortField, sortDirection, dateFnsLocale])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const toggleExpandTest = (testId: string) => {
    setExpandedTestId(expandedTestId === testId ? null : testId)
  }

  const handleDeleteClick = (test: Test, e: React.MouseEvent) => {
    e.stopPropagation()
    setTestToDelete(test)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!testToDelete) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/tests/${testToDelete.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: t('toasts.testDeletedTitle'),
          description: t('toasts.testDeletedDescription'),
        })
        await onRefetchClient()
        await onRefetchRecentTests()
        if (expandedTestId === testToDelete.id) {
          setExpandedTestId(null)
        }
      } else {
        throw new Error(result.error || 'Failed to delete test')
      }
    } catch (error) {
      console.error('Error deleting test:', error)
      toast({
        title: t('toasts.errorTitle'),
        description: t('toasts.testDeleteFailed'),
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
      setTestToDelete(null)
    }
  }

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
      const testsToExport = sortedAndFilteredTests.length > 0
        ? sortedAndFilteredTests
        : client.tests

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

      <AssessmentTimeline clientId={id} basePath={basePath} />

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

  const testsContent = (
    <>
      <div className="bg-white dark:bg-slate-900/50 rounded-lg shadow-md dark:border dark:border-white/10 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold dark:text-white">{t('tests.title')}</h2>
              {(searchTerm || filterTestType !== 'ALL') && client.tests && (
                <p className="text-sm text-muted-foreground mt-1">
                  {t('tests.showingFiltered', { filtered: sortedAndFilteredTests.length, total: client.tests.length })}
                </p>
              )}
            </div>

            <Link
              href={newTestHref}
              className="px-4 py-2 gradient-primary text-white rounded-lg hover:opacity-90 transition self-end sm:self-auto"
            >
              {t('tests.newTest')}
            </Link>
          </div>

          {client.tests && client.tests.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 sm:max-w-sm">
                <SearchInput
                  placeholder={t('tests.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClear={() => setSearchTerm('')}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <div className="w-full sm:w-auto">
                  <Select
                    value={filterTestType}
                    onValueChange={(value) => setFilterTestType(value as TestType | 'ALL')}
                  >
                    <SelectTrigger id="test-type-filter" className="w-full sm:w-[180px]">
                      <SelectValue placeholder={t('tests.filterPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">{t('tests.allTestTypes')}</SelectItem>
                      <SelectItem value="RUNNING">{testTypeLabels.RUNNING}</SelectItem>
                      <SelectItem value="CYCLING">{testTypeLabels.CYCLING}</SelectItem>
                      <SelectItem value="SKIING">{testTypeLabels.SKIING}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  onClick={handleExportTests}
                  className="w-full sm:w-auto"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t('actions.exportCsv')}
                </Button>
              </div>
            </div>
          )}
        </div>

        {!client.tests || client.tests.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-slate-400">
            <p className="mb-4">{t('tests.emptyTitle')}</p>
            <Link
              href={newTestHref}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              {t('tests.createFirst')}
            </Link>
          </div>
        ) : sortedAndFilteredTests.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-slate-400">
            <p className="mb-4">{t('tests.noMatches')}</p>
            <button
              onClick={() => {
                setFilterTestType('ALL')
                setSearchTerm('')
              }}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              {t('tests.resetFilters')}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 dark:ring-white/10 sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300 dark:divide-white/10">
                  <thead className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-white/10">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <button
                          onClick={() => handleSort('date')}
                          className="flex items-center gap-1 text-sm font-semibold text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white"
                        >
                          {t('tests.table.date')}
                          {sortField === 'date' ? (
                            sortDirection === 'asc' ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )
                          ) : (
                            <ArrowUpDown className="w-4 h-4 opacity-30" />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left">
                        <button
                          onClick={() => handleSort('type')}
                          className="flex items-center gap-1 text-sm font-semibold text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white"
                        >
                          {t('tests.table.type')}
                          {sortField === 'type' ? (
                            sortDirection === 'asc' ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )
                          ) : (
                            <ArrowUpDown className="w-4 h-4 opacity-30" />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left">
                        <button
                          onClick={() => handleSort('status')}
                          className="flex items-center gap-1 text-sm font-semibold text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white"
                        >
                          Status
                          {sortField === 'status' ? (
                            sortDirection === 'asc' ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )
                          ) : (
                            <ArrowUpDown className="w-4 h-4 opacity-30" />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left">
                        <button
                          onClick={() => handleSort('vo2max')}
                          className="flex items-center gap-1 text-sm font-semibold text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white"
                        >
                          VO2max
                          {sortField === 'vo2max' ? (
                            sortDirection === 'asc' ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )
                          ) : (
                            <ArrowUpDown className="w-4 h-4 opacity-30" />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-slate-300">
                        {t('tests.table.aerobicThreshold')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-slate-300">
                        {t('tests.table.anaerobicThreshold')}
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-slate-300">
                        {t('tests.table.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                    {sortedAndFilteredTests.map((test, index) => {
                      const aerobicThreshold = test.aerobicThreshold as ThresholdSummary | null
                      const anaerobicThreshold = test.anaerobicThreshold as ThresholdSummary | null

                      const isExpanded = expandedTestId === test.id
                      const trainingZones = test.trainingZones as TrainingZone[] | null
                      const previousTest = sortedAndFilteredTests[index + 1]

                      return (
                        <Fragment key={test.id}>
                          <tr
                            className="hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer"
                            onClick={() => toggleExpandTest(test.id)}
                          >
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-slate-200">
                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-gray-400" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-gray-400" />
                                )}
                                {format(new Date(test.testDate), 'PPP', { locale: dateFnsLocale })}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                              {testTypeLabels[test.testType]}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  test.status === 'COMPLETED'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                    : test.status === 'DRAFT'
                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                    : 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {test.status === 'COMPLETED'
                                  ? testStatusLabels.COMPLETED
                                  : test.status === 'DRAFT'
                                  ? testStatusLabels.DRAFT
                                  : testStatusLabels.ARCHIVED}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                              {test.vo2max ? `${test.vo2max.toFixed(1)}` : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                              {aerobicThreshold?.heartRate ? `${aerobicThreshold.heartRate} bpm` : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                              {anaerobicThreshold?.heartRate ? `${anaerobicThreshold.heartRate} bpm` : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-2">
                                <Link
                                  href={`${basePath}/tests/${test.id}`}
                                  className="text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  {t('actions.view')}
                                </Link>
                                <AnalyzeTestButton
                                  testId={test.id}
                                  clientId={id}
                                  previousTestId={previousTest?.id}
                                  className="h-8 text-xs"
                                />
                                <Link
                                  href={`${basePath}/tests/${test.id}/edit`}
                                  className="text-blue-600 hover:text-blue-800"
                                  title={t('actions.editTest')}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Link>
                                <button
                                  onClick={(e) => handleDeleteClick(test, e)}
                                  className="text-red-600 hover:text-red-800 transition"
                                  title={t('actions.deleteTest')}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${test.id}-expanded`} className="bg-gray-50 dark:bg-slate-800/30">
                              <td colSpan={7} className="px-4 py-4">
                                <div className="space-y-4">
                                  <h4 className="font-semibold text-sm text-gray-700 dark:text-slate-300">
                                    {t('tests.details.title')}
                                  </h4>

                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                      <p className="text-xs text-gray-500 dark:text-slate-400">{t('tests.details.maxHr')}</p>
                                      <p className="text-sm font-medium dark:text-slate-200">
                                        {test.maxHR ? `${test.maxHR} bpm` : '-'}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500 dark:text-slate-400">{t('tests.details.maxLactate')}</p>
                                      <p className="text-sm font-medium dark:text-slate-200">
                                        {test.maxLactate ? `${test.maxLactate.toFixed(1)} mmol/L` : '-'}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500 dark:text-slate-400">VO2max</p>
                                      <p className="text-sm font-medium dark:text-slate-200">
                                        {test.vo2max ? `${test.vo2max.toFixed(1)} ml/kg/min` : '-'}
                                      </p>
                                    </div>
                                  </div>

                                  {trainingZones && trainingZones.length > 0 && (
                                    <div className="mt-4">
                                      <h5 className="font-semibold text-sm text-gray-700 dark:text-slate-300 mb-2">
                                        {t('tests.details.trainingZones')}
                                      </h5>
                                      <div className="overflow-x-auto">
                                        <table className="min-w-full text-sm">
                                          <thead className="bg-gray-100 dark:bg-slate-700/50">
                                            <tr>
                                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-slate-400">
                                                {t('tests.details.zone')}
                                              </th>
                                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-slate-400">
                                                {t('tests.details.heartRateBpm')}
                                              </th>
                                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-slate-400">
                                                {t('tests.details.percentOfMax')}
                                              </th>
                                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 dark:text-slate-400">
                                                {t('tests.details.description')}
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                                            {trainingZones.map((zone, idx) => (
                                              <tr key={idx}>
                                                <td className="px-3 py-2 font-medium dark:text-slate-200">{zone.zone}</td>
                                                <td className="px-3 py-2 dark:text-slate-300">
                                                  {zone.hrMin} - {zone.hrMax}
                                                </td>
                                                <td className="px-3 py-2 dark:text-slate-300">
                                                  {zone.percentMin}% - {zone.percentMax}%
                                                </td>
                                                <td className="px-3 py-2 text-gray-600 dark:text-slate-400">
                                                  {zone.effect}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}

                                  {test.notes && (
                                    <div className="mt-4">
                                      <h5 className="font-semibold text-sm text-gray-700 dark:text-slate-300 mb-1">
                                        {t('fields.notes')}
                                      </h5>
                                      <p className="text-sm text-gray-600 dark:text-slate-400">{test.notes}</p>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )

  return (
    <div className="space-y-4 sm:space-y-6">
      {developmentContent}
      {showEnduranceTable && testsContent}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDialog.description', {
                date: testToDelete ? format(new Date(testToDelete.testDate), 'PPP', { locale: dateFnsLocale }) : '',
              })}
              <br />
              <br />
              {t('deleteDialog.cannotUndo')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleting ? t('actions.deleting') : t('actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
