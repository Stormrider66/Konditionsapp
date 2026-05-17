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
import { HockeyAthleteView } from '@/components/coach/sport-views/HockeyAthleteView'
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
import { ChevronDown, ChevronUp, ArrowUpDown, Trash2, Download, Edit2, UserCircle, ExternalLink, Loader2, UserPlus, ClipboardList, CheckCircle2, KeyRound, CircleAlert } from 'lucide-react'
import { CreateAthleteAccountDialog } from '@/components/client/CreateAthleteAccountDialog'
import { exportClientTestsToCSV } from '@/lib/utils/csv-export'
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

  const overviewContent = (
    <>
      <div className="bg-white dark:bg-slate-900/50 rounded-lg shadow-md dark:border dark:border-white/10 p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg sm:text-xl font-semibold dark:text-white">{t('overview.personalInfo')}</h2>
            <AthletePortalStatusBadge
              athleteAccount={client.athleteAccount}
              labels={{
                passwordReady: t('portalStatus.passwordReady'),
                active: t('portalStatus.active'),
                notLoggedIn: t('portalStatus.notLoggedIn'),
              }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CreateAthleteAccountDialog
              clientId={id}
              clientName={client.name}
              clientEmail={client.email}
              clientPhone={client.phone}
              hasExistingAccount={!!client.athleteAccount}
              onAccountCreated={fetchClient}
            />
            <Link href={`${basePath}/clients/${id}/profile`}>
              <Button variant="outline" size="sm">
                <UserCircle className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('actions.fullProfile')}</span>
              </Button>
            </Link>
            <AIContextButton
              athleteId={id}
              athleteName={client.name}
            />
            <Link href={`${basePath}/clients/${id}/edit`}>
              <Button variant="outline" size="sm">
                <Edit2 className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('actions.edit')}</span>
              </Button>
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">{t('fields.age')}</p>
            <p className="text-base sm:text-lg font-medium dark:text-slate-200">{t('ageYears', { age: calculateAge(client.birthDate) })}</p>
          </div>
          <div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">{t('fields.gender')}</p>
            <p className="text-base sm:text-lg font-medium dark:text-slate-200">
              {client.gender === 'MALE' ? t('gender.male') : t('gender.female')}
            </p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">{t('fields.birthDate')}</p>
            <p className="text-base sm:text-lg font-medium dark:text-slate-200">
              {format(new Date(client.birthDate), 'PPP', { locale: dateFnsLocale })}
            </p>
          </div>
          <div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">{t('fields.height')}</p>
            <p className="text-base sm:text-lg font-medium dark:text-slate-200">{client.height} cm</p>
          </div>
          <div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">{t('fields.weight')}</p>
            <p className="text-base sm:text-lg font-medium dark:text-slate-200">{client.weight} kg</p>
          </div>
          <div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">BMI</p>
            <p className="text-base sm:text-lg font-medium dark:text-slate-200">
              {calculateBMI(client.weight, client.height)}
            </p>
          </div>
          {client.email && (
            <div className="col-span-2 sm:col-span-1">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">{t('fields.email')}</p>
              <p className="text-base sm:text-lg font-medium dark:text-slate-200 truncate">{client.email}</p>
            </div>
          )}
          {client.phone && (
            <div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">{t('fields.phone')}</p>
              <p className="text-base sm:text-lg font-medium dark:text-slate-200">{client.phone}</p>
            </div>
          )}
          {client.team && (
            <div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">{t('fields.team')}</p>
              <p className="text-base sm:text-lg font-medium dark:text-slate-200">{client.team.name}</p>
            </div>
          )}
        </div>
        {client.notes && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
            <p className="text-sm text-gray-500 dark:text-slate-400">{t('fields.notes')}</p>
            <p className="mt-1 text-gray-700 dark:text-slate-300">{client.notes}</p>
          </div>
        )}
      </div>

      {!sportProfileLoading && (
        <div className="bg-white dark:bg-slate-900/50 rounded-lg shadow-md dark:border dark:border-white/10 p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-xl font-semibold mb-4 dark:text-white">{t('overview.sportSpecificData')}</h2>
          <SportProfileEditor
            key={sportProfile?.id ?? id}
            clientId={id}
            sportProfile={sportProfile}
            onUpdated={(updatedProfile) => setSportProfile(updatedProfile as SportProfileSummary | null)}
          />
          <SportSpecificAthleteView
            clientId={id}
            clientName={client.name}
            sportProfile={sportProfile}
          />
        </div>
      )}

      {/* Training Summary Visual Report */}
      <div className="mb-6">
        <VisualReportCard
          clientId={id}
          reportType="training-summary"
        />
      </div>

      <div className="mb-6">
        <RaceFuelingCard
          clientId={id}
          detailBasePath={`${basePath}/clients/${id}/fueling`}
          listHref={`${basePath}/clients/${id}/fueling`}
        />
      </div>

      {!sportProfileLoading && sportProfile?.primarySport === 'RUNNING' && (
        <div className="bg-white dark:bg-slate-900/50 rounded-lg shadow-md dark:border dark:border-white/10 p-6 mb-6">
          <PaceValidationDashboard
            clientId={id}
            clientName={client.name}
          />
        </div>
      )}

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
    </>
  )

  const calendarContent = (
    <div className="bg-white dark:bg-slate-900/50 rounded-lg shadow-md dark:border dark:border-white/10 p-4 lg:p-6">
      <UnifiedCalendar
        clientId={id}
        clientName={client.name}
        isCoachView={true}
      />
    </div>
  )

  const genericAnalysisContent = client.athleteAccount ? (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <ClientLoadSummary clientId={id} />
        <ReadinessDashboard clientId={id} />
        <ClientFuelingSummary clientId={id} plansHref={`${basePath}/clients/${id}/fueling`} />
      </div>

      <PendingPRFeedSingle clientId={id} />

      <StrengthPRTable clientId={id} clientName={client.name} />

      <RecentTestsCard
        clientId={id}
        testsHref={`${basePath}/clients/${id}?tab=tests`}
      />

      <ProgressionDashboard clientId={id} clientName={client.name} />

      <div className="bg-white dark:bg-slate-900/50 rounded-lg shadow-md dark:border dark:border-white/10 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <h3 className="font-semibold text-sm flex items-center gap-2 dark:text-white">
              <ClipboardList className="h-4 w-4 text-blue-500" />
              {t('analysis.trainingLogs.title')}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {t('analysis.trainingLogs.description')}
            </p>
          </div>
          <Link href={`${basePath}/athletes/${id}/logs`}>
            <Button size="sm" variant="outline" className="w-full sm:w-auto">
              <ExternalLink className="w-4 h-4 mr-2" />
              {t('analysis.trainingLogs.cta')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  ) : (
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

  const hockeyAnalysisContent = hockeySettings ? (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <ClientLoadSummary clientId={id} />
        <ReadinessDashboard clientId={id} />
      </div>

      <HockeyAthleteView
        clientId={id}
        clientName={client.name}
        settings={hockeySettings}
      />

      <PendingPRFeedSingle clientId={id} />

      <div className="grid gap-4 lg:grid-cols-2">
        <VBTProgressionWidget clientId={id} />
        <RecentTestsCard
          clientId={id}
          testsHref={`${basePath}/clients/${id}?tab=tests`}
        />
      </div>

      <StrengthPRTable clientId={id} clientName={client.name} />

      <ProgressionDashboard clientId={id} clientName={client.name} />

      <div className="bg-white dark:bg-slate-900/50 rounded-lg shadow-md dark:border dark:border-white/10 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <h3 className="font-semibold text-sm flex items-center gap-2 dark:text-white">
              <ClipboardList className="h-4 w-4 text-blue-500" />
              {t('analysis.hockeyLogs.title')}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {t('analysis.hockeyLogs.description')}
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
    </div>
  ) : null

  const analysisContent = hockeyAnalysisContent ?? genericAnalysisContent

  const programsContent = (
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
            calendar: calendarContent,
            analysis: analysisContent,
            programs: programsContent,
            tests: testsContent,
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
