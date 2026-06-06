// app/(business)/[businessSlug]/coach/clients/[id]/page.tsx
'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import { useLocale, useTranslations } from '@/i18n/client'
import type { TestType } from '@/types'
import { AIContextButton } from '@/components/ai-studio/AIContextButton'
import { ClientDetailTabs } from '@/components/client/ClientDetailTabs'
import { Loader2, CheckCircle2, CircleAlert, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getAthleteProfileConfig } from '@/lib/coach/athlete-profile-config'
import type { TeamPlanContext } from '@/lib/coach/team-plan'
import type { AthletePlanSummary } from '@/components/athlete-plans/AthletePlanSummaryCard'
import type {
  ClientWithTests,
  ProgramSummary,
  SportProfileSummary,
  RecentTestEntry,
  RecentTestCounts,
  CoachSnapshotTone,
  CoachSnapshotAction,
} from '@/components/coach/athlete-profile/types'
import { CoachCockpitCard } from '@/components/coach/athlete-profile/ui'
import { OverviewTab } from '@/components/coach/athlete-profile/OverviewTab'
import { PlanningTab } from '@/components/coach/athlete-profile/PlanningTab'
import { DevelopmentTab } from '@/components/coach/athlete-profile/DevelopmentTab'
import { ProfileTab } from '@/components/coach/athlete-profile/ProfileTab'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

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
  const [recentTests, setRecentTests] = useState<RecentTestEntry[]>([])
  const [recentTestCounts, setRecentTestCounts] = useState<RecentTestCounts>({ test: 0, hockey: 0, custom: 0 })
  const [athletePlans, setAthletePlans] = useState<AthletePlanSummary[]>([])
  const [athletePlansLoading, setAthletePlansLoading] = useState(true)
  const [teamPlan, setTeamPlan] = useState<TeamPlanContext | null>(null)

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

  const fetchRecentTests = useCallback(async () => {
    try {
      const response = await fetch(`/api/clients/${id}/recent-tests`)
      const result = await response.json()

      if (result.success) {
        setRecentTests(result.data || [])
        setRecentTestCounts(result.counts || { test: 0, hockey: 0, custom: 0 })
      } else {
        setRecentTests([])
        setRecentTestCounts({ test: 0, hockey: 0, custom: 0 })
      }
    } catch (err) {
      console.error('Error fetching recent tests:', err)
      setRecentTests([])
      setRecentTestCounts({ test: 0, hockey: 0, custom: 0 })
    }
  }, [id])

  const fetchAthletePlans = useCallback(async () => {
    try {
      setAthletePlansLoading(true)
      const response = await fetch(`/api/clients/${id}/athlete-plans?active=true`)
      const result = await response.json()

      if (result.success) {
        setAthletePlans(result.data || [])
      } else {
        setAthletePlans([])
      }
    } catch (err) {
      console.error('Error fetching athlete plans:', err)
      setAthletePlans([])
    } finally {
      setAthletePlansLoading(false)
    }
  }, [id])

  const fetchTeamPlan = useCallback(async () => {
    try {
      const response = await fetch(`/api/clients/${id}/team-plan`)
      const result = await response.json()
      setTeamPlan(result.success ? result.teamPlan ?? null : null)
    } catch (err) {
      console.error('Error fetching team plan:', err)
      setTeamPlan(null)
    }
  }, [id])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchClient()
      void fetchPrograms()
      void fetchSportProfile()
      void fetchRecentTests()
      void fetchAthletePlans()
      void fetchTeamPlan()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [fetchClient, fetchPrograms, fetchSportProfile, fetchRecentTests, fetchAthletePlans, fetchTeamPlan])

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

  const profileConfig = getAthleteProfileConfig({ team: client.team, sportProfile })
  const isHockeyAthlete = profileConfig.isHockeyAthlete
  const newTestHref = `${basePath}/test?clientId=${id}${isHockeyAthlete ? '&category=hockey' : ''}`
  const newProgramHref = `${basePath}/programs/new?clientId=${id}`
  const testTypeLabels: Record<TestType, string> = {
    RUNNING: t('testTypes.running'),
    CYCLING: t('testTypes.cycling'),
    SKIING: t('testTypes.skiing'),
  }
  const portalStatusLabels = {
    passwordReady: t('portalStatus.passwordReady'),
    active: t('portalStatus.active'),
    notLoggedIn: t('portalStatus.notLoggedIn'),
  }
  const athletePortalStatus = client.athleteAccount?.authStatus
  const now = new Date()
  const completedTests = (client.tests ?? [])
    .filter((test) => test.status === 'COMPLETED')
    .sort((a, b) => new Date(b.testDate).getTime() - new Date(a.testDate).getTime())
  const latestCompletedTest = completedTests[0] ?? null
  const fallbackRecentTests: RecentTestEntry[] = completedTests.slice(0, 5).map((test) => ({
    id: test.id,
    date: new Date(test.testDate).toISOString(),
    kind: 'TEST',
    label: testTypeLabels[test.testType],
    summary: test.vo2max != null
      ? `VO2max ${test.vo2max.toFixed(1)} ml/kg/min`
      : test.maxHR != null
        ? `MaxHR ${test.maxHR} bpm`
        : null,
  }))
  const recentTestEntries = recentTests.length > 0 ? recentTests : fallbackRecentTests
  const latestRecentTest = recentTestEntries[0] ?? null
  const aggregatedTestCountFromEndpoint = recentTestCounts.test + recentTestCounts.hockey + recentTestCounts.custom
  const aggregatedTestCount = Math.max(aggregatedTestCountFromEndpoint, completedTests.length)
  const latestTestDate = latestRecentTest?.date
    ? new Date(latestRecentTest.date)
    : latestCompletedTest
      ? new Date(latestCompletedTest.testDate)
      : null
  const latestTestAgeDays = latestTestDate
    ? Math.max(0, Math.floor((now.getTime() - latestTestDate.getTime()) / 86_400_000))
    : null
  const activeProgram = programs.find((program) => {
    const startDate = new Date(program.startDate)
    const endDate = new Date(program.endDate)
    return startDate <= now && endDate >= now
  }) ?? null
  const activeAthletePlan = athletePlans.find((plan) => {
    const startDate = new Date(plan.startDate)
    const endDate = new Date(plan.endDate)
    return plan.status === 'ACTIVE' && startDate <= now && endDate >= now
  }) ?? null
  const currentAthletePlanBlock = activeAthletePlan?.blocks.find((block) => {
    const startDate = new Date(block.startDate)
    const endDate = new Date(block.endDate)
    return startDate <= now && endDate >= now
  }) ?? activeAthletePlan?.blocks[0] ?? null
  const hasPlanContext = !!activeProgram || !!activeAthletePlan || !!teamPlan
  const teamPlanLabel = teamPlan ? (teamPlan.currentBlock?.title ?? teamPlan.name) : null
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
  const daysRemainingInActiveAthletePlan = activeAthletePlan
    ? Math.max(0, Math.ceil((new Date(activeAthletePlan.endDate).getTime() - now.getTime()) / 86_400_000))
    : null
  const hasRecentTest = latestTestAgeDays !== null && latestTestAgeDays <= 90
  const hasPortalLogin = athletePortalStatus?.hasLoggedIn === true
  const coachSnapshotTone: CoachSnapshotTone = !client.athleteAccount || !latestRecentTest || !hasPlanContext
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

  if (!latestRecentTest || !hasRecentTest) {
    coachSnapshotActions.push({
      id: 'schedule-test',
      title: latestRecentTest
        ? t('overview.snapshotActions.retest.title')
        : t('overview.snapshotActions.firstTest.title'),
      description: latestRecentTest
        ? t('overview.snapshotActions.retest.description')
        : t('overview.snapshotActions.firstTest.description'),
      href: newTestHref,
    })
  }

  if (!hasPlanContext) {
    coachSnapshotActions.push({
      id: 'create-program',
      title: t('planning.createProgramAction'),
      description: t('planning.createProgramActionDescription'),
      dialog: 'createPlan',
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
  const latestTestLabel = latestTestDate
    ? latestTestAgeDays !== null && latestTestAgeDays > 90
      ? t('overview.snapshotMetrics.staleTest', { days: latestTestAgeDays })
      : format(latestTestDate, 'PPP', { locale: dateFnsLocale })
    : t('overview.snapshotMetrics.noTests')
  const portalMetricLabel = client.athleteAccount
    ? athletePortalStatus?.hasLoggedIn
      ? portalStatusLabels.active
      : portalStatusLabels.notLoggedIn
    : t('overview.snapshotMetrics.noPortal')
  const planningProgramLabel = programsLoading || athletePlansLoading
    ? t('planning.loading')
    : activeProgram?.name ?? activeAthletePlan?.name ?? teamPlanLabel ?? upcomingProgram?.name ?? t('planning.noProgram')
  const planningProgramMeta = activeProgram
    ? t('planning.daysRemaining', { days: daysRemainingInActiveProgram ?? 0 })
    : activeAthletePlan
      ? `${currentAthletePlanBlock?.title ?? t('planning.blockPlan')} · ${t('planning.daysRemaining', { days: daysRemainingInActiveAthletePlan ?? 0 })}`
    : teamPlan
      ? t('planning.teamPlanMeta', { team: teamPlan.teamName })
    : upcomingProgram
      ? t('planning.startsIn', { days: daysUntilUpcomingProgram ?? 0 })
      : t('planning.noProgramDescription')
  const planningLogStatus = client.athleteAccount
    ? hasPortalLogin
      ? t('planning.logsReady')
      : t('planning.logsNeedInvite')
    : t('planning.logsNeedAccount')
  const sevenDaysFromNow = new Date(now)
  sevenDaysFromNow.setDate(now.getDate() + 7)
  const programsInNextSevenDays = programs.filter((program) => {
    const startDate = new Date(program.startDate)
    const endDate = new Date(program.endDate)
    return startDate <= sevenDaysFromNow && endDate >= now
  })
  const planningWeekLabel = programsLoading
    ? t('planning.loading')
    : programsInNextSevenDays.length > 0
      ? t('planning.nextSevenDaysCovered', { count: programsInNextSevenDays.length })
      : activeAthletePlan
        ? t('planning.blockActive', { block: currentAthletePlanBlock?.title ?? t('planning.blockPlan') })
      : teamPlan
        ? t('planning.teamPlanActive', { block: teamPlanLabel ?? teamPlan.name })
      : t('planning.nextSevenDaysEmpty')
  const planningWeekDescription = programsInNextSevenDays.length > 0
    ? t('planning.nextSevenDaysCoveredDescription')
    : activeAthletePlan
      ? t('planning.blockVisibleDescription')
    : teamPlan
      ? t('planning.teamPlanDescription')
    : t('planning.nextSevenDaysEmptyDescription')
  const previousCompletedTest = completedTests[1] ?? null
  const latestVo2max = latestCompletedTest?.vo2max ?? null
  const previousVo2max = previousCompletedTest?.vo2max ?? null
  const vo2Trend = latestVo2max !== null && previousVo2max !== null
    ? latestVo2max - previousVo2max
    : null
  const developmentStatusTone: CoachSnapshotTone = aggregatedTestCount === 0 || !sportProfile
    ? 'setup'
    : !hasRecentTest || aggregatedTestCount < 2
      ? 'caution'
      : 'good'
  const developmentTrendLabel = vo2Trend !== null
    ? `${vo2Trend > 0 ? '+' : ''}${vo2Trend.toFixed(1)} VO2max`
    : t('development.noTrend')
  const developmentPrimarySportLabel = sportProfile?.primarySport
    ? sportProfile.primarySport.replace(/_/g, ' ')
    : t('development.noSportProfile')
  const latestCompletedTestTypeLabel = latestCompletedTest
    ? testTypeLabels[latestCompletedTest.testType]
    : t('overview.snapshotMetrics.noTests')
  const latestTestDetailLabel = latestRecentTest
    ? latestRecentTest.summary ?? latestRecentTest.label
    : latestCompletedTest
      ? latestCompletedTestTypeLabel
      : t('cockpit.cards.noTestDetail')
  const developmentChangeTitle = vo2Trend !== null
    ? vo2Trend > 0
      ? t('development.change.positiveTitle')
      : vo2Trend < 0
        ? t('development.change.negativeTitle')
        : t('development.change.stableTitle')
    : latestRecentTest?.summary
      ? t('development.change.latestSummaryTitle', { label: latestRecentTest.label })
      : aggregatedTestCount >= 1
      ? t('development.change.needsComparisonTitle')
      : t('development.change.noBaselineTitle')
  const developmentChangeDescription = vo2Trend !== null
    ? vo2Trend > 0
      ? t('development.change.positiveDescription', { value: vo2Trend.toFixed(1) })
      : vo2Trend < 0
        ? t('development.change.negativeDescription', { value: Math.abs(vo2Trend).toFixed(1) })
        : t('development.change.stableDescription')
    : latestRecentTest?.summary
      ? t('development.change.latestSummaryDescription', { summary: latestRecentTest.summary })
      : aggregatedTestCount >= 1
      ? t('development.change.needsComparisonDescription')
      : t('development.change.noBaselineDescription')
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
  const coachCockpitNextAction = visibleCoachSnapshotActions[0]
  const coachCockpitReadinessLabel = coachSnapshotTone === 'good'
    ? t('cockpit.readiness.good')
    : coachSnapshotTone === 'caution'
      ? t('cockpit.readiness.caution')
      : t('cockpit.readiness.setup')


  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-12">
      <div className="mb-4 sm:mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/50 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">{client.name}</h2>
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
                {coachCockpitReadinessLabel}
              </Badge>
            </div>
            <p className="text-gray-600 dark:text-slate-400 mt-1 text-xs sm:text-sm lg:text-base">{t('cockpit.subtitle')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AIContextButton athleteId={id} athleteName={client.name} />
            <Link href={`${basePath}/ai-studio?athleteId=${id}`}>
              <Button variant="outline" size="sm">
                <Sparkles className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('cockpit.openAiStudio')}</span>
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <CoachCockpitCard
            label={t('cockpit.cards.currentPlan')}
            value={planningProgramLabel}
            detail={planningProgramMeta}
          />
          <CoachCockpitCard
            label={t('cockpit.cards.latestTest')}
            value={latestTestLabel}
            detail={latestTestDetailLabel}
          />
          <CoachCockpitCard
            label={t('cockpit.cards.nextSevenDays')}
            value={planningWeekLabel}
            detail={planningWeekDescription}
          />
          <CoachCockpitCard
            label={t('cockpit.cards.nextAction')}
            value={coachCockpitNextAction.title}
            detail={coachCockpitNextAction.description}
          />
        </div>
      </div>

      <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
        <ClientDetailTabs
          clientId={id}
          content={{
            overview: (
              <OverviewTab
                id={id}
                basePath={basePath}
                client={client}
                coachSnapshotTone={coachSnapshotTone}
                activeProgram={activeProgram}
                currentAthletePlanBlock={currentAthletePlanBlock}
                activeAthletePlan={activeAthletePlan}
                latestTestLabel={latestTestLabel}
                portalMetricLabel={portalMetricLabel}
                visibleCoachSnapshotActions={visibleCoachSnapshotActions}
                teamPlanLabel={teamPlanLabel}
                setAthletePlans={setAthletePlans}
                onRefetchClient={fetchClient}
              />
            ),
            planning: (
              <PlanningTab
                id={id}
                basePath={basePath}
                client={client}
                programs={programs}
                programsLoading={programsLoading}
                now={now}
                newProgramHref={newProgramHref}
                planningProgramLabel={planningProgramLabel}
                planningProgramMeta={planningProgramMeta}
                planningLogStatus={planningLogStatus}
                planningWeekLabel={planningWeekLabel}
                activeProgram={activeProgram}
                activeAthletePlan={activeAthletePlan}
                currentAthletePlanBlock={currentAthletePlanBlock}
                teamPlanLabel={teamPlanLabel}
                referenceProgram={referenceProgram}
                programsInNextSevenDays={programsInNextSevenDays}
                hasRecentTest={hasRecentTest}
                hasHockeyLogs={isHockeyAthlete}
                setAthletePlans={setAthletePlans}
                onRefetchClient={fetchClient}
              />
            ),
            development: (
              <DevelopmentTab
                id={id}
                basePath={basePath}
                businessSlug={businessSlug}
                client={client}
                sportProfile={sportProfile}
                sportProfileLoading={sportProfileLoading}
                showPaceZones={profileConfig.showPaceZones}
                hockeyTeamId={profileConfig.isHockeyAthlete && client.team ? client.team.id : null}
                showEnduranceTable={
                  (client.tests?.length ?? 0) > 0 ||
                  !(profileConfig.isTeamAthlete || profileConfig.sportKind === 'RACKET')
                }
                newTestHref={newTestHref}
                developmentStatusTone={developmentStatusTone}
                latestTestLabel={latestTestLabel}
                aggregatedTestCount={aggregatedTestCount}
                developmentTrendLabel={developmentTrendLabel}
                developmentPrimarySportLabel={developmentPrimarySportLabel}
                developmentChangeTitle={developmentChangeTitle}
                developmentChangeDescription={developmentChangeDescription}
                hasRecentTest={hasRecentTest}
                onRefetchClient={fetchClient}
                onRefetchRecentTests={fetchRecentTests}
              />
            ),
            profile: (
              <ProfileTab
                id={id}
                basePath={basePath}
                client={client}
                sportProfile={sportProfile}
                sportProfileLoading={sportProfileLoading}
                profileSetupTone={profileSetupTone}
                profileSetupItems={profileSetupItems}
                setSportProfile={setSportProfile}
                onRefetchClient={fetchClient}
              />
            ),
          }}
        />
      </Suspense>
    </div>
  )
}

