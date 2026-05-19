// app/(business)/[businessSlug]/coach/clients/[id]/page.tsx
'use client'

import { useEffect, useState, useMemo, Fragment, useCallback, Suspense } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import { useLocale, useTranslations } from '@/i18n/client'
import type { Client, Team, Test, TestType, TrainingZone } from '@/types'
import { ProgressionChart } from '@/components/charts/ProgressionChart'
import { SportSpecificAthleteView } from '@/components/coach/sport-views'
import { VisualReportCard } from '@/components/visual-reports/VisualReportCard'
import { PaceValidationDashboard } from '@/components/coach/pace-zones/PaceValidationDashboard'
import { AIContextButton } from '@/components/ai-studio/AIContextButton'
import { AnalyzeTestButton } from '@/components/ai/performance-analysis'
import { ClientVideoAnalyses } from '@/components/coach/video-analysis/ClientVideoAnalyses'
import { VBTProgressionWidget } from '@/components/athlete/VBTProgressionWidget'
import { Concept2SummaryWidget } from '@/components/athlete/Concept2SummaryWidget'
import { ZoneDistributionChart } from '@/components/athlete/ZoneDistributionChart'
import { WeeklyZoneSummary } from '@/components/athlete/WeeklyZoneSummary'
import { YearlyTrainingOverview } from '@/components/athlete/YearlyTrainingOverview'
import { usePageContextOptional } from '@/components/ai-studio/PageContextProvider'
import type { PageContext } from '@/components/ai-studio/FloatingAIChat'
import { ClientDetailTabs } from '@/components/client/ClientDetailTabs'
import { UnifiedCalendar } from '@/components/calendar'
import { StrengthPRTable } from '@/components/coach/strength/StrengthPRTable'
import { PendingPRFeedSingle } from '@/components/coach/strength/PendingPRFeed'
import { ProgressionDashboard } from '@/components/coach/progression/ProgressionDashboard'
import { ClientLoadSummary } from '@/components/coach/clients/ClientLoadSummary'
import { ClientFuelingSummary } from '@/components/coach/clients/ClientFuelingSummary'
import { RecentTestsCard } from '@/components/coach/clients/RecentTestsCard'
import { SportProfileEditor } from '@/components/coach/clients/SportProfileEditor'
import { ReadinessDashboard } from '@/components/athlete/ReadinessDashboard'
import { RaceFuelingCard } from '@/components/athlete/fueling/RaceFuelingCard'
import { ChevronDown, ChevronUp, ArrowUpDown, Trash2, Download, Edit2, ExternalLink, Loader2, UserPlus, ClipboardList, CheckCircle2, KeyRound, CircleAlert, CalendarDays } from 'lucide-react'
import { CreateAthleteAccountDialog } from '@/components/client/CreateAthleteAccountDialog'
import { exportClientTestsToCSV } from '@/lib/utils/csv-export'
import { cn } from '@/lib/utils'
import type { HockeySettings } from '@/components/onboarding/HockeyOnboarding'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SearchInput } from '@/components/ui/search-input'
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

interface ClientWithTests extends Client {
  tests?: Test[]
  athleteAccount?: {
    id: string
    userId: string
    user?: {
      email: string
      createdAt: string | Date
    }
    authStatus?: {
      isActive: boolean
      hasLoggedIn: boolean
      hasSetPasswordAndLoggedIn: boolean
      lastSignInAt: string | null
      passwordUpdatedAt: string | null
    } | null
  } | null
  team?: Team | null
  position?: string | null
}

interface ProgramSummary {
  id: string
  name: string
  goalType: string
  startDate: string | Date
  endDate: string | Date
  _count?: {
    weeks?: number
  }
}

interface SportProfileSummary {
  id: string
  primarySport: string
  secondarySports: string[]
  hockeySettings?: Record<string, unknown>
  [key: string]: unknown
}

interface ThresholdSummary {
  heartRate?: number | null
}

type SortField = 'date' | 'type' | 'vo2max' | 'status'
type SortDirection = 'asc' | 'desc'
type CoachSnapshotTone = 'good' | 'caution' | 'setup'
type CoachSnapshotAction = {
  id: string
  title: string
  description: string
  href?: string
  dialog?: 'createAccount' | 'sendInvite'
}

const DEFAULT_PLAYER_HOCKEY_SETTINGS: HockeySettings = {
  position: 'center',
  teamName: '',
  leagueLevel: 'recreational',
  seasonPhase: 'in_season',
  averageIceTimeMinutes: null,
  shiftsPerGame: null,
  yearsPlaying: 0,
  playStyle: 'two_way',
  strengthFocus: [],
  weaknesses: [],
  injuryHistory: [],
  weeklyOffIceSessions: 3,
  hasAccessToIce: true,
  hasAccessToGym: true,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function normalizeHockeyPosition(position?: string | null): HockeySettings['position'] {
  const normalized = position?.trim().toLowerCase() ?? ''
  if (['goalie', 'målvakt', 'malvakt', 'keeper'].some((value) => normalized.includes(value))) return 'goalie'
  if (normalized === 'd' || ['defense', 'defence', 'back'].some((value) => normalized.includes(value))) return 'defense'
  if (['wing', 'forward', 'lw', 'rw', 'ytter'].some((value) => normalized.includes(value))) return 'wing'
  return 'center'
}

function normalizeHockeyLeagueLevel(value?: string | null, teamName?: string | null): HockeySettings['leagueLevel'] {
  const normalizedValue = value?.trim().toLowerCase() ?? ''
  const validLevels = new Set<HockeySettings['leagueLevel']>([
    'recreational',
    'junior',
    'division_3',
    'division_2',
    'division_1',
    'shl',
    'hockeyallsvenskan',
    'hockeyettan',
  ])
  if (validLevels.has(normalizedValue as HockeySettings['leagueLevel'])) {
    return normalizedValue as HockeySettings['leagueLevel']
  }

  const normalized = teamName?.trim().toLowerCase() ?? ''
  if (/shl/.test(normalized)) return 'shl'
  if (/allsvenskan/.test(normalized)) return 'hockeyallsvenskan'
  if (/ettan|division 1|div 1/.test(normalized)) return 'hockeyettan'
  if (/j20|u20|j18|u18|junior/.test(normalized)) return 'junior'
  return 'recreational'
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function buildHockeySettings(
  client: ClientWithTests,
  sportProfile: SportProfileSummary | null,
): HockeySettings {
  const stored = isRecord(sportProfile?.hockeySettings) ? sportProfile.hockeySettings : {}
  const teamName = typeof stored.teamName === 'string' && stored.teamName.trim()
    ? stored.teamName
    : client.team?.name ?? ''

  return {
    ...DEFAULT_PLAYER_HOCKEY_SETTINGS,
    ...(stored as Partial<HockeySettings>),
    position: typeof stored.position === 'string'
      ? normalizeHockeyPosition(stored.position)
      : normalizeHockeyPosition(client.position),
    teamName,
    leagueLevel: normalizeHockeyLeagueLevel(
      typeof stored.leagueLevel === 'string' ? stored.leagueLevel : null,
      teamName,
    ),
    strengthFocus: stringArray(stored.strengthFocus),
    weaknesses: stringArray(stored.weaknesses),
    injuryHistory: stringArray(stored.injuryHistory),
  }
}

export default function BusinessClientDetailPage() {
  const t = useTranslations('coach.pages.clientDetail')
  const locale = useLocale()
  const dateFnsLocale = locale === 'sv' ? sv : enUS
  const params = useParams()
  const id = params.id as string
  const businessSlug = params.businessSlug as string
  const basePath = `/${businessSlug}/coach`

  const [client, setClient] = useState<ClientWithTests | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [programs, setPrograms] = useState<ProgramSummary[]>([])
  const [programsLoading, setProgramsLoading] = useState(true)
  const [sportProfile, setSportProfile] = useState<SportProfileSummary | null>(null)
  const [sportProfileLoading, setSportProfileLoading] = useState(true)

  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [filterTestType, setFilterTestType] = useState<TestType | 'ALL'>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [testToDelete, setTestToDelete] = useState<Test | null>(null)
  const [deleting, setDeleting] = useState(false)
  const clientTests = client?.tests

  const { toast } = useToast()
  const pageContextApi = usePageContextOptional()

  const handleLoadVideoAnalysisToAI = useCallback((analysis: {
    id: string
    videoType: string
    formScore: number | null
    aiAnalysis: string | null
    issuesDetected: Array<{ issue: string; severity: string; description: string }> | null
    recommendations: Array<{ priority: number; recommendation: string; explanation: string }> | null
    exercise: { name: string; nameSv: string | null } | null
  }) => {
    if (!pageContextApi?.setPageContext) {
      toast({
        title: t('toasts.aiStudioUnavailableTitle'),
        description: t('toasts.aiStudioUnavailableDescription'),
        variant: 'destructive',
      })
      return
    }

    const context: PageContext = {
      type: 'video-analysis',
      title: t('aiContext.title', { exercise: analysis.exercise?.nameSv || analysis.exercise?.name || analysis.videoType }),
      data: {
        analysisId: analysis.id,
        videoType: analysis.videoType,
        formScore: analysis.formScore,
        exercise: analysis.exercise?.nameSv || analysis.exercise?.name,
        issues: analysis.issuesDetected,
        recommendations: analysis.recommendations,
      },
      summary: t('aiContext.summary', {
        athlete: client?.name || t('aiContext.athleteFallback'),
        exercise: analysis.exercise?.nameSv || analysis.exercise?.name || analysis.videoType,
        score: analysis.formScore ?? t('aiContext.notAssessed'),
        count: analysis.issuesDetected?.length || 0,
      }),
    }

    pageContextApi.setPageContext(context)
  }, [pageContextApi, client?.name, t, toast])

  const fetchClient = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (businessSlug) params.set('businessSlug', businessSlug)
      const response = await fetch(`/api/clients/${id}${params.size ? `?${params}` : ''}`, {
        headers: businessSlug ? { 'x-business-slug': businessSlug } : {},
      })
      const result = await response.json()

      if (result.success) {
        setClient(result.data)
      } else {
        setError(result.error || 'Failed to fetch client')
      }
    } catch (err) {
      setError('Network error')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [id, businessSlug])

  const fetchPrograms = useCallback(async () => {
    try {
      setProgramsLoading(true)
      const response = await fetch(`/api/programs?clientId=${id}`)
      const result = await response.json()

      if (result.success) {
        setPrograms(result.data || [])
      } else {
        setPrograms([])
      }
    } catch (err) {
      console.error('Error fetching programs:', err)
      setPrograms([])
    } finally {
      setProgramsLoading(false)
    }
  }, [id])

  const fetchSportProfile = useCallback(async () => {
    try {
      setSportProfileLoading(true)
      const response = await fetch(`/api/sport-profile/${id}`)
      const result = await response.json()

      if (result.success && result.data) {
        setSportProfile(result.data)
      } else {
        setSportProfile(null)
      }
    } catch (err) {
      console.error('Error fetching sport profile:', err)
      setSportProfile(null)
    } finally {
      setSportProfileLoading(false)
    }
  }, [id])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchClient()
      void fetchPrograms()
      void fetchSportProfile()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [fetchClient, fetchPrograms, fetchSportProfile])

  const calculateAge = (birthDate: Date) => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const calculateBMI = (weight: number, height: number) => {
    const heightInMeters = height / 100
    return (weight / (heightInMeters * heightInMeters)).toFixed(1)
  }

  const sortedAndFilteredTests = useMemo(() => {
    if (!clientTests) return []

    let filtered = [...clientTests]

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
  }, [clientTests, filterTestType, searchTerm, sortField, sortDirection, dateFnsLocale])

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
        await fetchClient()
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

      exportClientTestsToCSV(testsToExport, client.name)

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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-12">
        <div className="text-center dark:text-slate-300">{t('loading')}</div>
      </div>
    )
  }

  if (error || !client) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-12">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-300">{t('errors.inlinePrefix')} {error || t('errors.clientNotFound')}</p>
        </div>
        <Link
          href={`${basePath}/clients`}
          className="mt-4 inline-block text-blue-600 hover:text-blue-800"
        >
          {t('backToClientList')}
        </Link>
      </div>
    )
  }

  const isHockeyAthlete = client.team?.sportType === 'TEAM_ICE_HOCKEY'
    || sportProfile?.primarySport === 'TEAM_ICE_HOCKEY'
    || sportProfile?.secondarySports?.includes('TEAM_ICE_HOCKEY') === true
  const hockeySettings = isHockeyAthlete
    ? buildHockeySettings(client, sportProfile)
    : null
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
  const programGoalLabels: Record<string, string> = {
    marathon: 'Marathon',
    half_marathon: t('programGoals.halfMarathon'),
    '10k': '10K',
    '5k': '5K',
    fitness: t('programGoals.fitness'),
    cycling: t('programGoals.cycling'),
    skiing: t('programGoals.skiing'),
    triathlon: 'Triathlon',
    custom: t('programGoals.custom'),
  }

  const portalStatusLabels = {
    passwordReady: t('portalStatus.passwordReady'),
    active: t('portalStatus.active'),
    notLoggedIn: t('portalStatus.notLoggedIn'),
  }
  const athletePortalStatus = client.athleteAccount?.authStatus
  const formatProfileDate = (value?: string | Date | null) => value
    ? format(new Date(value), 'PPP', { locale: dateFnsLocale })
    : t('profile.notAvailable')
  const now = new Date()
  const completedTests = (client.tests ?? [])
    .filter((test) => test.status === 'COMPLETED')
    .sort((a, b) => new Date(b.testDate).getTime() - new Date(a.testDate).getTime())
  const latestCompletedTest = completedTests[0] ?? null
  const latestTestAgeDays = latestCompletedTest
    ? Math.max(0, Math.floor((now.getTime() - new Date(latestCompletedTest.testDate).getTime()) / 86_400_000))
    : null
  const activeProgram = programs.find((program) => {
    const startDate = new Date(program.startDate)
    const endDate = new Date(program.endDate)
    return startDate <= now && endDate >= now
  }) ?? null
  const upcomingProgram = programs
    .filter((program) => new Date(program.startDate) > now)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0] ?? null
  const referenceProgram = activeProgram ?? upcomingProgram
  const daysUntilUpcomingProgram = upcomingProgram
    ? Math.max(0, Math.ceil((new Date(upcomingProgram.startDate).getTime() - now.getTime()) / 86_400_000))
    : null
  const daysRemainingInActiveProgram = activeProgram
    ? Math.max(0, Math.ceil((new Date(activeProgram.endDate).getTime() - now.getTime()) / 86_400_000))
    : null
  const hasRecentTest = latestTestAgeDays !== null && latestTestAgeDays <= 90
  const hasPortalLogin = athletePortalStatus?.hasLoggedIn === true
  const coachSnapshotTone: CoachSnapshotTone = !client.athleteAccount || !latestCompletedTest || !activeProgram
    ? 'setup'
    : !hasRecentTest || !sportProfile || !hasPortalLogin
      ? 'caution'
      : 'good'
  const coachSnapshotActions: CoachSnapshotAction[] = []

  if (!client.athleteAccount) {
    coachSnapshotActions.push({
      id: 'create-account',
      title: t('overview.snapshotActions.createAccount.title'),
      description: t('overview.snapshotActions.createAccount.description'),
      dialog: 'createAccount',
    })
  } else if (!hasPortalLogin) {
    coachSnapshotActions.push({
      id: 'send-invite',
      title: t('overview.snapshotActions.sendInvite.title'),
      description: t('overview.snapshotActions.sendInvite.description'),
      dialog: 'sendInvite',
    })
  }

  if (!sportProfile) {
    coachSnapshotActions.push({
      id: 'complete-profile',
      title: t('overview.snapshotActions.completeProfile.title'),
      description: t('overview.snapshotActions.completeProfile.description'),
      href: `${basePath}/clients/${id}?tab=profile`,
    })
  }

  if (!latestCompletedTest || !hasRecentTest) {
    coachSnapshotActions.push({
      id: 'schedule-test',
      title: latestCompletedTest
        ? t('overview.snapshotActions.retest.title')
        : t('overview.snapshotActions.firstTest.title'),
      description: latestCompletedTest
        ? t('overview.snapshotActions.retest.description')
        : t('overview.snapshotActions.firstTest.description'),
      href: `${basePath}/test`,
    })
  }

  if (!activeProgram) {
    coachSnapshotActions.push({
      id: 'create-program',
      title: t('overview.snapshotActions.createProgram.title'),
      description: t('overview.snapshotActions.createProgram.description'),
      href: `${basePath}/programs/new`,
    })
  }

  if (coachSnapshotActions.length === 0) {
    coachSnapshotActions.push({
      id: 'review-development',
      title: t('overview.snapshotActions.reviewDevelopment.title'),
      description: t('overview.snapshotActions.reviewDevelopment.description'),
      href: `${basePath}/clients/${id}?tab=development`,
    })
  }

  const visibleCoachSnapshotActions = coachSnapshotActions.slice(0, 3)
  const latestTestLabel = latestCompletedTest
    ? latestTestAgeDays !== null && latestTestAgeDays > 90
      ? t('overview.snapshotMetrics.staleTest', { days: latestTestAgeDays })
      : format(new Date(latestCompletedTest.testDate), 'PPP', { locale: dateFnsLocale })
    : t('overview.snapshotMetrics.noTests')
  const portalMetricLabel = client.athleteAccount
    ? athletePortalStatus?.hasLoggedIn
      ? portalStatusLabels.active
      : portalStatusLabels.notLoggedIn
    : t('overview.snapshotMetrics.noPortal')
  const planningProgramLabel = programsLoading
    ? t('planning.loading')
    : activeProgram?.name ?? upcomingProgram?.name ?? t('planning.noProgram')
  const planningProgramMeta = activeProgram
    ? t('planning.daysRemaining', { days: daysRemainingInActiveProgram ?? 0 })
    : upcomingProgram
      ? t('planning.startsIn', { days: daysUntilUpcomingProgram ?? 0 })
      : t('planning.noProgramDescription')
  const planningLogStatus = client.athleteAccount
    ? hasPortalLogin
      ? t('planning.logsReady')
      : t('planning.logsNeedInvite')
    : t('planning.logsNeedAccount')
  const previousCompletedTest = completedTests[1] ?? null
  const latestVo2max = latestCompletedTest?.vo2max ?? null
  const previousVo2max = previousCompletedTest?.vo2max ?? null
  const vo2Trend = latestVo2max !== null && previousVo2max !== null
    ? latestVo2max - previousVo2max
    : null
  const developmentStatusTone: CoachSnapshotTone = completedTests.length === 0 || !sportProfile
    ? 'setup'
    : !hasRecentTest || completedTests.length < 2
      ? 'caution'
      : 'good'
  const developmentTrendLabel = vo2Trend !== null
    ? `${vo2Trend > 0 ? '+' : ''}${vo2Trend.toFixed(1)} VO2max`
    : t('development.noTrend')
  const developmentPrimarySportLabel = sportProfile?.primarySport
    ? sportProfile.primarySport.replace(/_/g, ' ')
    : t('development.noSportProfile')
  const profileSetupItems = [
    {
      id: 'portal',
      complete: !!client.athleteAccount,
      label: t('profile.statusItems.portal'),
      value: client.athleteAccount ? portalMetricLabel : t('overview.snapshotMetrics.noPortal'),
    },
    {
      id: 'contact',
      complete: !!client.email || !!client.phone,
      label: t('profile.statusItems.contact'),
      value: client.email || client.phone || t('profile.missing'),
    },
    {
      id: 'body',
      complete: !!client.height && !!client.weight,
      label: t('profile.statusItems.body'),
      value: client.height && client.weight ? `${client.height} cm / ${client.weight} kg` : t('profile.missing'),
    },
    {
      id: 'sport',
      complete: !!sportProfile,
      label: t('profile.statusItems.sport'),
      value: developmentPrimarySportLabel,
    },
  ]
  const completedProfileSetupItems = profileSetupItems.filter((item) => item.complete).length
  const profileSetupTone: CoachSnapshotTone = completedProfileSetupItems === profileSetupItems.length
    ? 'good'
    : completedProfileSetupItems >= 2
      ? 'caution'
      : 'setup'

  const noAthleteAccountContent = (
    <div className="bg-white dark:bg-slate-900/50 rounded-lg shadow-md dark:border dark:border-white/10 p-4 sm:p-6">
      <div className="text-center py-12 text-gray-500 dark:text-slate-400">
        <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="mb-2">{t('analysis.noAthleteAccount.title')}</p>
        <p className="text-sm mb-4">
          {t('analysis.noAthleteAccount.description')}
        </p>
        <CreateAthleteAccountDialog
          clientId={id}
          clientName={client.name}
          clientEmail={client.email}
          clientPhone={client.phone}
          hasExistingAccount={false}
          onAccountCreated={fetchClient}
          trigger={
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              {t('actions.createAthleteAccount')}
            </Button>
          }
        />
      </div>
    </div>
  )

  const profileOverviewContent = (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
      <div className="bg-white dark:bg-slate-900/50 rounded-lg shadow-md dark:border dark:border-white/10 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg sm:text-xl font-semibold dark:text-white">{t('overview.personalInfo')}</h2>
            <AthletePortalStatusBadge
              athleteAccount={client.athleteAccount}
              labels={portalStatusLabels}
            />
          </div>
          <Link href={`${basePath}/clients/${id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit2 className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{t('actions.edit')}</span>
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <ProfileField label={t('fields.age')} value={t('ageYears', { age: calculateAge(client.birthDate) })} />
          <ProfileField label={t('fields.gender')} value={client.gender === 'MALE' ? t('gender.male') : t('gender.female')} />
          <ProfileField label={t('fields.birthDate')} value={format(new Date(client.birthDate), 'PPP', { locale: dateFnsLocale })} className="col-span-2 sm:col-span-1" />
          <ProfileField label={t('fields.height')} value={`${client.height} cm`} />
          <ProfileField label={t('fields.weight')} value={`${client.weight} kg`} />
          <ProfileField label="BMI" value={calculateBMI(client.weight, client.height)} />
          {client.email && (
            <ProfileField label={t('fields.email')} value={client.email} className="col-span-2 sm:col-span-1" />
          )}
          {client.phone && (
            <ProfileField label={t('fields.phone')} value={client.phone} />
          )}
          {client.team && (
            <ProfileField label={t('fields.team')} value={client.team.name} />
          )}
        </div>
        {client.notes && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
            <p className="text-sm text-gray-500 dark:text-slate-400">{t('fields.notes')}</p>
            <p className="mt-1 text-gray-700 dark:text-slate-300">{client.notes}</p>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900/50 rounded-lg shadow-md dark:border dark:border-white/10 p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold dark:text-white">{t('profile.portalTitle')}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t('profile.portalDescription')}</p>
          </div>

          {client.athleteAccount ? (
            <>
              <AthletePortalStatusBadge
                athleteAccount={client.athleteAccount}
                labels={portalStatusLabels}
              />
              <div className="space-y-3 text-sm">
                <ProfileField label={t('profile.accountCreated')} value={formatProfileDate(client.athleteAccount.user?.createdAt)} compact />
                <ProfileField label={t('profile.lastSignIn')} value={formatProfileDate(athletePortalStatus?.lastSignInAt)} compact />
                <ProfileField label={t('profile.passwordUpdated')} value={formatProfileDate(athletePortalStatus?.passwordUpdatedAt)} compact />
              </div>
              <CreateAthleteAccountDialog
                clientId={id}
                clientName={client.name}
                clientEmail={client.email}
                clientPhone={client.phone}
                hasExistingAccount
                onAccountCreated={fetchClient}
                trigger={
                  <Button variant="outline" size="sm" className="w-full">
                    <UserPlus className="w-4 h-4 mr-2" />
                    {t('profile.sendInvite')}
                  </Button>
                }
              />
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 dark:border-white/10 p-4 text-sm text-muted-foreground">
              <p className="mb-3">{t('profile.noPortalAccount')}</p>
              <CreateAthleteAccountDialog
                clientId={id}
                clientName={client.name}
                clientEmail={client.email}
                clientPhone={client.phone}
                hasExistingAccount={false}
                onAccountCreated={fetchClient}
                trigger={
                  <Button size="sm" className="w-full">
                    <UserPlus className="w-4 h-4 mr-2" />
                    {t('actions.createAthleteAccount')}
                  </Button>
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const sportProfileContent = !sportProfileLoading ? (
    <div className="bg-white dark:bg-slate-900/50 rounded-lg shadow-md dark:border dark:border-white/10 p-4 sm:p-6">
      <h2 className="text-xl font-semibold mb-4 dark:text-white">{t('overview.sportSpecificData')}</h2>
      <SportProfileEditor
        key={sportProfile?.id ?? id}
        clientId={id}
        sportProfile={sportProfile}
        onUpdated={(updatedProfile) => setSportProfile(updatedProfile as SportProfileSummary | null)}
      />
    </div>
  ) : null

  const overviewContent = (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white dark:bg-slate-900/50 rounded-lg shadow-md dark:border dark:border-white/10 p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-semibold dark:text-white">{t('overview.coachSnapshot')}</h2>
              <Badge
                variant="outline"
                className={cn(
                  'border font-medium',
                  coachSnapshotTone === 'good' && 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
                  coachSnapshotTone === 'caution' && 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
                  coachSnapshotTone === 'setup' && 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200',
                )}
              >
                {coachSnapshotTone === 'good' ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : <CircleAlert className="mr-1 h-3.5 w-3.5" />}
                {t(`overview.snapshotStatus.${coachSnapshotTone}`)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {t(`overview.snapshotSummary.${coachSnapshotTone}`)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AIContextButton athleteId={id} athleteName={client.name} />
            <Link href={`${basePath}/clients/${id}/edit`}>
              <Button variant="outline" size="sm">
                <Edit2 className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('actions.edit')}</span>
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3 mt-5">
          <div className="rounded-lg border border-gray-200 dark:border-white/10 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('overview.snapshotMetrics.nextFocus')}</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1 truncate">
              {activeProgram?.name ?? t('overview.snapshotMetrics.noActiveProgram')}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-white/10 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('overview.snapshotMetrics.latestTest')}</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1 truncate">{latestTestLabel}</p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-white/10 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('overview.snapshotMetrics.portal')}</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1 truncate">{portalMetricLabel}</p>
          </div>
        </div>

        <div className="mt-5 border-t border-gray-200 dark:border-white/10 pt-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('overview.nextActions')}</h3>
          <div className="grid gap-3 lg:grid-cols-3">
            {visibleCoachSnapshotActions.map((action) => {
              const actionBody = (
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{action.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
                </div>
              )

              if (action.dialog) {
                return (
                  <CreateAthleteAccountDialog
                    key={action.id}
                    clientId={id}
                    clientName={client.name}
                    clientEmail={client.email}
                    clientPhone={client.phone}
                    hasExistingAccount={action.dialog === 'sendInvite'}
                    onAccountCreated={fetchClient}
                    trigger={
                      <Button variant="outline" className="h-auto w-full justify-start p-3">
                        {actionBody}
                      </Button>
                    }
                  />
                )
              }

              return (
                <Link key={action.id} href={action.href ?? `${basePath}/clients/${id}`}>
                  <Button variant="outline" className="h-auto w-full justify-start p-3">
                    {actionBody}
                  </Button>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {client.athleteAccount ? (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <ClientLoadSummary clientId={id} />
            <ReadinessDashboard clientId={id} />
            <ClientFuelingSummary clientId={id} plansHref={`${basePath}/clients/${id}/fueling`} />
          </div>

          <RecentTestsCard
            clientId={id}
            testsHref={`${basePath}/clients/${id}?tab=development`}
          />

          <VisualReportCard
            clientId={id}
            reportType="training-summary"
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <VBTProgressionWidget clientId={id} />
            <Concept2SummaryWidget clientId={id} />
          </div>
        </>
      ) : noAthleteAccountContent}
    </div>
  )

  const planningContent = (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white dark:bg-slate-900/50 rounded-lg shadow-md dark:border dark:border-white/10 p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold dark:text-white">{t('planning.title')}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t('planning.description')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`${basePath}/calendar`}>
              <Button variant="outline" size="sm">
                <CalendarDays className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('planning.openCalendar')}</span>
              </Button>
            </Link>
            <Link href={`${basePath}/programs/new`}>
              <Button size="sm">{t('programs.newProgram')}</Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3 mt-5">
          <div className="rounded-lg border border-gray-200 dark:border-white/10 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('planning.currentBlock')}</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1 truncate">{planningProgramLabel}</p>
            <p className="text-xs text-muted-foreground mt-1">{planningProgramMeta}</p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-white/10 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('planning.workoutLogging')}</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1 truncate">{planningLogStatus}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('planning.workoutLoggingDescription')}</p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-white/10 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('planning.programLibrary')}</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
              {programsLoading ? t('planning.loading') : t('planning.programCount', { count: programs.length })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{t('planning.programLibraryDescription')}</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3 mt-5">
          {referenceProgram ? (
            <Link href={`${basePath}/programs/${referenceProgram.id}`}>
              <Button variant="outline" className="h-auto w-full justify-start p-3">
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{activeProgram ? t('planning.viewActiveProgram') : t('planning.viewUpcomingProgram')}</p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{referenceProgram.name}</p>
                </div>
              </Button>
            </Link>
          ) : (
            <Link href={`${basePath}/programs/new`}>
              <Button variant="outline" className="h-auto w-full justify-start p-3">
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('planning.createProgramAction')}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('planning.createProgramActionDescription')}</p>
                </div>
              </Button>
            </Link>
          )}

          {client.athleteAccount ? (
            <Link href={`${basePath}/athletes/${id}/logs`}>
              <Button variant="outline" className="h-auto w-full justify-start p-3">
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('planning.reviewLogs')}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('planning.reviewLogsDescription')}</p>
                </div>
              </Button>
            </Link>
          ) : (
            <CreateAthleteAccountDialog
              clientId={id}
              clientName={client.name}
              clientEmail={client.email}
              clientPhone={client.phone}
              hasExistingAccount={false}
              onAccountCreated={fetchClient}
              trigger={
                <Button variant="outline" className="h-auto w-full justify-start p-3">
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('planning.enableLogs')}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('planning.enableLogsDescription')}</p>
                  </div>
                </Button>
              }
            />
          )}

          <Link href={`${basePath}/clients/${id}/fueling`}>
            <Button variant="outline" className="h-auto w-full justify-start p-3">
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('planning.reviewFueling')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('planning.reviewFuelingDescription')}</p>
              </div>
            </Button>
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900/50 rounded-lg shadow-md dark:border dark:border-white/10 p-4 lg:p-6">
        <UnifiedCalendar
          clientId={id}
          clientName={client.name}
          isCoachView={true}
        />
      </div>

      <div className="bg-white dark:bg-slate-900/50 rounded-lg shadow-md dark:border dark:border-white/10 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <h3 className="font-semibold text-sm flex items-center gap-2 dark:text-white">
              <ClipboardList className="h-4 w-4 text-blue-500" />
              {hockeySettings ? t('analysis.hockeyLogs.title') : t('analysis.trainingLogs.title')}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {hockeySettings ? t('analysis.hockeyLogs.description') : t('analysis.trainingLogs.description')}
            </p>
          </div>
          {client.athleteAccount ? (
            <Link href={`${basePath}/athletes/${id}/logs`}>
              <Button size="sm" variant="outline" className="w-full sm:w-auto">
                <ExternalLink className="w-4 h-4 mr-2" />
                {t('analysis.trainingLogs.cta')}
              </Button>
            </Link>
          ) : (
            <CreateAthleteAccountDialog
              clientId={id}
              clientName={client.name}
              clientEmail={client.email}
              clientPhone={client.phone}
              hasExistingAccount={false}
              onAccountCreated={fetchClient}
              trigger={
                <Button size="sm" variant="outline" className="w-full sm:w-auto">
                  <UserPlus className="w-4 h-4 mr-2" />
                  {t('actions.createAthleteAccount')}
                </Button>
              }
            />
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900/50 rounded-lg shadow-md dark:border dark:border-white/10 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <h2 className="text-lg sm:text-xl font-semibold dark:text-white">{t('programs.title')}</h2>
          <Link href={`${basePath}/programs/new`} className="shrink-0">
            <Button size="sm" className="w-full sm:w-auto">{t('programs.newProgram')}</Button>
          </Link>
        </div>

        {programsLoading ? (
          <div className="flex items-center justify-center py-8 text-gray-500 dark:text-slate-400">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            {t('programs.loading')}
          </div>
        ) : programs.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-slate-400">
            <p className="mb-2">{t('programs.emptyTitle')}</p>
            <Link
              href={`${basePath}/programs/new`}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              {t('programs.createFirst')}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {programs.map((program) => (
              <Link key={program.id} href={`${basePath}/programs/${program.id}`}>
                <div className="border dark:border-white/10 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition cursor-pointer">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg mb-1 dark:text-white">{program.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">
                        {programGoalLabels[program.goalType] ?? program.goalType}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-slate-400">
                        <span>
                          {format(new Date(program.startDate), 'PPP', { locale: dateFnsLocale })} -{' '}
                          {format(new Date(program.endDate), 'PPP', { locale: dateFnsLocale })}
                        </span>
                        {program._count?.weeks && (
                          <span className="text-gray-400">
                            {t('programs.weeks', { count: program._count.weeks })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        {t('actions.viewArrow')}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <RaceFuelingCard
        clientId={id}
        detailBasePath={`${basePath}/clients/${id}/fueling`}
        listHref={`${basePath}/clients/${id}/fueling`}
      />
    </div>
  )

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
            <Link href={`${basePath}/test`}>
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
              {t('development.completedTests', { count: completedTests.length })}
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

        <div className="grid gap-3 md:grid-cols-3 mt-5">
          <Link href={`${basePath}/clients/${id}?tab=development`}>
            <Button variant="outline" className="h-auto w-full justify-start p-3">
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('development.reviewTests')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('development.reviewTestsDescription')}</p>
              </div>
            </Button>
          </Link>
          <Link href={`${basePath}/test`}>
            <Button variant="outline" className="h-auto w-full justify-start p-3">
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{hasRecentTest ? t('development.planNextTest') : t('development.updateTest')}</p>
                <p className="text-xs text-muted-foreground mt-1">{hasRecentTest ? t('development.planNextTestDescription') : t('development.updateTestDescription')}</p>
              </div>
            </Button>
          </Link>
          <Link href={`${basePath}/clients/${id}?tab=profile`}>
            <Button variant="outline" className="h-auto w-full justify-start p-3">
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('development.completeSportContext')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('development.completeSportContextDescription')}</p>
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
        />
      )}

      {!sportProfileLoading && sportProfile?.primarySport === 'RUNNING' && (
        <div className="bg-white dark:bg-slate-900/50 rounded-lg shadow-md dark:border dark:border-white/10 p-6 mb-6">
          <PaceValidationDashboard
            clientId={id}
            clientName={client.name}
          />
        </div>
      )}

      <RecentTestsCard
        clientId={id}
        testsHref={`${basePath}/clients/${id}?tab=development`}
      />

      <PendingPRFeedSingle clientId={id} />

      <StrengthPRTable clientId={id} clientName={client.name} />

      <ProgressionDashboard clientId={id} clientName={client.name} />

      <ClientVideoAnalyses
        clientId={id}
        clientName={client.name}
        onLoadToAI={handleLoadVideoAnalysisToAI}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <VBTProgressionWidget clientId={id} />
        <Concept2SummaryWidget clientId={id} />
      </div>

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

  const profileContent = (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white dark:bg-slate-900/50 rounded-lg shadow-md dark:border dark:border-white/10 p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-semibold dark:text-white">{t('profile.statusTitle')}</h2>
              <Badge
                variant="outline"
                className={cn(
                  'border font-medium',
                  profileSetupTone === 'good' && 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
                  profileSetupTone === 'caution' && 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
                  profileSetupTone === 'setup' && 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200',
                )}
              >
                {profileSetupTone === 'good' ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : <CircleAlert className="mr-1 h-3.5 w-3.5" />}
                {t(`profile.status.${profileSetupTone}`)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {t(`profile.statusSummary.${profileSetupTone}`)}
            </p>
          </div>
          <Link href={`${basePath}/clients/${id}/edit`}>
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              <Edit2 className="w-4 h-4 mr-2" />
              {t('actions.edit')}
            </Button>
          </Link>
        </div>

        <div className="grid gap-3 md:grid-cols-4 mt-5">
          {profileSetupItems.map((item) => (
            <div key={item.id} className="rounded-lg border border-gray-200 dark:border-white/10 p-3">
              <div className="flex items-center gap-2">
                {item.complete ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                ) : (
                  <CircleAlert className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                )}
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.label}</p>
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white mt-2 truncate">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-3 mt-5">
          {!client.athleteAccount ? (
            <CreateAthleteAccountDialog
              clientId={id}
              clientName={client.name}
              clientEmail={client.email}
              clientPhone={client.phone}
              hasExistingAccount={false}
              onAccountCreated={fetchClient}
              trigger={
                <Button variant="outline" className="h-auto w-full justify-start p-3">
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('profile.actions.createAccount')}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('profile.actions.createAccountDescription')}</p>
                  </div>
                </Button>
              }
            />
          ) : (
            <CreateAthleteAccountDialog
              clientId={id}
              clientName={client.name}
              clientEmail={client.email}
              clientPhone={client.phone}
              hasExistingAccount
              onAccountCreated={fetchClient}
              trigger={
                <Button variant="outline" className="h-auto w-full justify-start p-3">
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('profile.actions.sendInvite')}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('profile.actions.sendInviteDescription')}</p>
                  </div>
                </Button>
              }
            />
          )}

          <Link href={`${basePath}/clients/${id}/edit`}>
            <Button variant="outline" className="h-auto w-full justify-start p-3">
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('profile.actions.editDetails')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('profile.actions.editDetailsDescription')}</p>
              </div>
            </Button>
          </Link>

          <Link href={`${basePath}/clients/${id}?tab=profile`}>
            <Button variant="outline" className="h-auto w-full justify-start p-3">
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('profile.actions.sportProfile')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('profile.actions.sportProfileDescription')}</p>
              </div>
            </Button>
          </Link>
        </div>
      </div>
      {profileOverviewContent}
      {sportProfileContent}
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
              href={`${basePath}/test`}
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
              href={`${basePath}/test`}
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
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-12">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{client.name}</h2>
        <p className="text-gray-600 dark:text-slate-400 mt-1 text-xs sm:text-sm lg:text-base">{t('subtitle')}</p>
      </div>

      <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
        <ClientDetailTabs
          clientId={id}
          content={{
            overview: overviewContent,
            planning: planningContent,
            development: (
              <div className="space-y-4 sm:space-y-6">
                {developmentContent}
                {testsContent}
              </div>
            ),
            profile: profileContent,
          }}
        />
      </Suspense>

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

function ProfileField({
  label,
  value,
  className,
  compact = false,
}: {
  label: string
  value: string
  className?: string
  compact?: boolean
}) {
  return (
    <div className={className}>
      <p className={cn(
        'text-xs text-gray-500 dark:text-slate-400',
        compact ? 'sm:text-xs' : 'sm:text-sm',
      )}>
        {label}
      </p>
      <p className={cn(
        'font-medium dark:text-slate-200 truncate',
        compact ? 'text-sm' : 'text-base sm:text-lg',
      )}>
        {value}
      </p>
    </div>
  )
}

function AthletePortalStatusBadge({
  athleteAccount,
  labels,
}: {
  athleteAccount: ClientWithTests['athleteAccount']
  labels: {
    passwordReady: string
    active: string
    notLoggedIn: string
  }
}) {
  if (!athleteAccount) return null

  const status = athleteAccount.authStatus
  if (status?.hasSetPasswordAndLoggedIn) {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800">
        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
        {labels.passwordReady}
      </Badge>
    )
  }

  if (status?.hasLoggedIn || status?.isActive) {
    return (
      <Badge variant="outline" className="text-blue-700 border-blue-200 bg-blue-50 dark:text-blue-300 dark:border-blue-800 dark:bg-blue-900/20">
        <KeyRound className="h-3.5 w-3.5 mr-1" />
        {labels.active}
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50 dark:text-amber-300 dark:border-amber-800 dark:bg-amber-900/20">
      <CircleAlert className="h-3.5 w-3.5 mr-1" />
      {labels.notLoggedIn}
    </Badge>
  )
}
