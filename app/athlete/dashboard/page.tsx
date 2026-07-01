// app/athlete/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { SportType } from '@prisma/client'
import { addDays, format } from 'date-fns'
import { getAthleteDashboardData } from '@/lib/athlete/dashboard-data'
import { UpcomingWorkouts } from '@/components/athlete/UpcomingWorkouts'
import { IntegratedRecentActivity } from '@/components/athlete/IntegratedRecentActivity'
import { ActivePrograms } from '@/components/athlete/ActivePrograms'
import { AISuggestionsBanner } from '@/components/athlete/ai/AISuggestionsBanner'
import { AICreditStatusCard } from '@/components/athlete/ai/AICreditStatusCard'
import { CyclingDashboard } from '@/components/athlete/CyclingDashboard'
import { SkiingDashboard } from '@/components/athlete/SkiingDashboard'
import { SwimmingDashboard } from '@/components/athlete/SwimmingDashboard'
import { TriathlonDashboard } from '@/components/athlete/TriathlonDashboard'
import { HYROXDashboard } from '@/components/athlete/HYROXDashboard'
import { GeneralFitnessDashboard } from '@/components/athlete/GeneralFitnessDashboard'
import { FunctionalFitnessDashboard } from '@/components/athlete/FunctionalFitnessDashboard'
import { HockeyDashboard } from '@/components/athlete/HockeyDashboard'
import { FootballDashboard } from '@/components/athlete/FootballDashboard'
import { HandballDashboard } from '@/components/athlete/HandballDashboard'
import { FloorballDashboard } from '@/components/athlete/FloorballDashboard'
import { BasketballDashboard } from '@/components/athlete/BasketballDashboard'
import { VolleyballDashboard } from '@/components/athlete/VolleyballDashboard'
import { TennisDashboard } from '@/components/athlete/TennisDashboard'
import { PadelDashboard } from '@/components/athlete/PadelDashboard'
import { IntervalResultsHistory } from '@/components/athlete/interval-results/IntervalResultsHistory'
import { UpcomingTeamEvents } from '@/components/athlete/UpcomingTeamEvents'
import { AthleteDrillList } from '@/components/athlete/AthleteDrillList'
import {
  CalendarDays,
} from 'lucide-react'
import { NutritionDashboard } from '@/components/nutrition/NutritionDashboard'
import { NutritionFocusDashboard } from '@/components/athlete/NutritionFocusDashboard'
import { ReadinessPanel, AccountabilityStreakWidget, DashboardDaySwitcher, QuickActionsGrid } from '@/components/athlete/dashboard'
import { AthleteDashboardFocusSplit } from '@/components/athlete/dashboard/AthleteDashboardFocusSplit'
import { AgentRecommendationsPanel } from '@/components/athlete/agent'
import { ActiveRestrictionsCard } from '@/components/athlete/ActiveRestrictionsCard'
import { WODHistorySummary } from '@/components/athlete/wod'
import { MorningBriefingCard } from '@/components/athlete/MorningBriefingCard'
import { PreWorkoutNudgeCard } from '@/components/athlete/PreWorkoutNudgeCard'
import { PatternAlertCard } from '@/components/athlete/PatternAlertCard'
import { PostWorkoutCheckCard } from '@/components/athlete/PostWorkoutCheckCard'
import { MilestoneCelebrationCard } from '@/components/athlete/MilestoneCelebrationCard'
import { MentalPrepCard } from '@/components/athlete/MentalPrepCard'
import { NutritionTimingCard } from '@/components/athlete/NutritionTimingCard'
import { RaceFuelingCard } from '@/components/athlete/fueling/RaceFuelingCard'
import { FuelingTrainingProgressCard } from '@/components/athlete/fueling/FuelingTrainingProgressCard'
import { WeeklyTrainingSummaryCard } from '@/components/athlete/WeeklyTrainingSummaryCard'
import { TrainingTrendChart } from '@/components/athlete/TrainingTrendChart'
import { ZoneDistributionChart } from '@/components/athlete/ZoneDistributionChart'
import { getTargetsForAthlete } from '@/lib/training/intensity-targets'
import { getUserPrimaryBusinessSlug } from '@/lib/business-context'
import { getLocale, getTranslations } from '@/i18n/server'
import { getAssignmentRoute, getWODRoute } from '@/types/dashboard-items'
import { canClientReportInjuryToTeamPhysio } from '@/lib/medical/care-team-recipients'

interface AthleteDashboardPageProps {
  searchParams?: Promise<{ details?: string }>
}

export default async function AthleteDashboardPage({ searchParams }: AthleteDashboardPageProps) {
  const { user, clientId, isCoachInAthleteMode } = await requireAthleteOrCoachInAthleteMode()
  // Same namespace as the business-scoped dashboard — `pages.athlete.dashboard`
  // does not exist in the message files and rendered raw keys.
  const t = await getTranslations('athletePages.dashboard')
  const locale = (await getLocale()) === 'sv' ? 'sv' : 'en'
  const resolvedSearchParams = await searchParams
  const showTrainingDetails = resolvedSearchParams?.details === 'training'

  // Ensure widgets that build URLs can route correctly in business-scoped setups
  const businessSlug = await getUserPrimaryBusinessSlug(user.id)
  const basePath = businessSlug ? `/${businessSlug}` : ''

  // Get client with sport profile using clientId (works for both athletes and coaches in athlete mode)
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      sportProfile: true,
      athleteSubscription: {
        select: { tier: true },
      },
    },
  })

  if (!client) {
    redirect('/login')
  }

  // Get sport profile for sport-aware dashboard
  const sportProfile = client.sportProfile

  // Check for active sport cookie (for sport switching)
  const cookieStore = await cookies()
  const activeSportCookie = cookieStore.get('activeSport')?.value as SportType | undefined

  // Determine which sport to use: cookie value if valid, otherwise primarySport
  const availableSports = sportProfile
    ? [sportProfile.primarySport, ...(sportProfile.secondarySports || [])]
    : []
  const primarySport = activeSportCookie && availableSports.includes(activeSportCookie)
    ? activeSportCookie
    : sportProfile?.primarySport
  const showInjuryReport = await canClientReportInjuryToTeamPhysio(client.id)

  const now = new Date()

  // Nutrition-focused users get a dedicated dashboard (skip all training data fetches)
  if (primarySport === 'NUTRITION') {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 max-w-7xl font-sans">
        <div className="flex flex-col gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2 transition-colors">
              {t('welcomeBack')}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-600 dark:from-emerald-400 dark:to-teal-500">{client.name.split(' ')[0]}</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 flex items-center gap-2 transition-colors">
              <CalendarDays className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
              <span className="capitalize">{format(now, 'EEEE, d MMMM')}</span>
            </p>
          </div>
          <QuickActionsGrid
            sessionHref={`${basePath}/athlete/nutrition`}
            sessionLabel={t('quickActions.nutritionStats')}
            showInjuryReport={showInjuryReport}
          />
          <AICreditStatusCard basePath={basePath} compact />
        </div>
        <NutritionFocusDashboard clientId={clientId} basePath={basePath} />
      </div>
    )
  }

  // Get sport-specific intensity targets
  const intensityTargets = sportProfile && primarySport
    ? getTargetsForAthlete(sportProfile as Parameters<typeof getTargetsForAthlete>[0], primarySport)
    : undefined

  // Helper function to render sport-specific dashboard
  const clientName = client.name
  const renderSportDashboard = () => {
    if (!sportProfile) return null

    switch (primarySport) {
      case 'CYCLING':
        return (
          <CyclingDashboard
            cyclingSettings={sportProfile.cyclingSettings as any}
            experience={sportProfile.cyclingExperience}
            clientName={clientName}
          />
        )
      case 'SKIING':
        return (
          <SkiingDashboard
            skiingSettings={sportProfile.skiingSettings as any}
            experience={sportProfile.runningExperience}
            clientName={clientName}
          />
        )
      case 'SWIMMING':
        return (
          <SwimmingDashboard
            swimmingSettings={sportProfile.swimmingSettings as any}
            experience={sportProfile.swimmingExperience}
            clientName={clientName}
          />
        )
      case 'TRIATHLON':
        return (
          <TriathlonDashboard
            triathlonSettings={sportProfile.triathlonSettings as any}
            experience={sportProfile.runningExperience}
            clientName={clientName}
          />
        )
      case 'HYROX':
        return <HYROXDashboard settings={sportProfile.hyroxSettings as any} gender={client.gender} />
      case 'GENERAL_FITNESS':
        return <GeneralFitnessDashboard settings={sportProfile.generalFitnessSettings as any} />
      case 'FUNCTIONAL_FITNESS':
        return <FunctionalFitnessDashboard settings={sportProfile.functionalFitnessSettings as any} />
      case 'TEAM_ICE_HOCKEY':
        return <HockeyDashboard settings={sportProfile.hockeySettings as any} />
      case 'TEAM_FOOTBALL':
        return <FootballDashboard settings={sportProfile.footballSettings as any} />
      case 'TEAM_HANDBALL':
        return <HandballDashboard settings={sportProfile.handballSettings as any} />
      case 'TEAM_FLOORBALL':
        return <FloorballDashboard settings={sportProfile.floorballSettings as any} />
      case 'TEAM_BASKETBALL':
        return <BasketballDashboard settings={sportProfile.basketballSettings as any} />
      case 'TEAM_VOLLEYBALL':
        return <VolleyballDashboard settings={sportProfile.volleyballSettings as any} />
      case 'TENNIS':
        return <TennisDashboard settings={sportProfile.tennisSettings as any} />
      case 'PADEL':
        return <PadelDashboard settings={sportProfile.padelSettings as any} />
      case 'RUNNING':
      default:
        return null // Running uses default dashboard widgets
    }
  }

  // Data assembly shared with GET /api/athlete/dashboard (mobile app) —
  // lib/athlete/dashboard-data.ts is the single implementation.
  const {
    activePrograms,
    sortedTodayItems,
    upcomingItems,
    nextItem,
    firstActionableItem,
    readinessScore,
    hasCheckedInToday,
    weeklyTSS,
    weeklyTSSTarget,
    muscularFatigue,
    activeInjuries,
    wodHistory,
    wodStats,
    wodUsageStats,
    recentActivitySummary,
  } = await getAthleteDashboardData({
    userId: user.id,
    clientId,
    subscriptionTier: client.athleteSubscription?.tier || 'FREE',
    locale,
    now,
  })

  const currentProgram = activePrograms[0]
  const restDayMode = currentProgram ? 'rest-day' : 'open-day'
  const dashboardDateOptions = Array.from(
    { length: 8 },
    (_, index) => format(addDays(now, index), 'yyyy-MM-dd')
  )
  const dashboardItems = [...sortedTodayItems, ...upcomingItems]

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 max-w-7xl font-sans">

      {/* Welcome Section */}
      <div className="flex flex-col gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2 transition-colors">
              {t('welcomeBack')}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600 dark:from-orange-400 dark:to-red-500">
                {client.name.split(' ')[0]}
              </span>
            </h1>
          <p className="text-slate-500 dark:text-slate-400 flex items-center gap-2 transition-colors">
            <CalendarDays className="w-4 h-4 text-orange-600 dark:text-orange-500" />
            <span className="capitalize">{format(now, 'EEEE, d MMMM')}</span>
            <span className="text-slate-400 dark:text-slate-600">•</span>
            <span className="text-orange-600 dark:text-orange-400 font-medium">{currentProgram ? currentProgram.name : t('noActiveProgram')}</span>
          </p>
        </div>
        <QuickActionsGrid
          sessionHref={
            firstActionableItem?.kind === 'program'
              ? `/athlete/workouts/${firstActionableItem.workout.id}/log`
              : firstActionableItem?.kind === 'assignment'
                ? getAssignmentRoute(firstActionableItem, basePath)
                : firstActionableItem?.kind === 'wod'
                  ? getWODRoute(firstActionableItem, basePath)
                  : '/athlete/browse-workouts'
          }
          sessionLabel={t('quickActions.startSession')}
          showInjuryReport={showInjuryReport}
        />
        <AICreditStatusCard basePath={basePath} compact />
      </div>

      <AthleteDashboardFocusSplit
        basePath={basePath}
        locale={locale}
        showTrainingDetails={showTrainingDetails}
      />

      {/* Main Grid - Hero Card + Readiness Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* HERO CARD(S) (Left 2/3) */}
        <DashboardDaySwitcher
          items={dashboardItems}
          dateOptions={dashboardDateOptions}
          nextItem={nextItem}
          readinessScore={readinessScore}
          athleteName={client.name.split(' ')[0]}
          mode={restDayMode}
          sportType={primarySport}
          basePath={basePath}
          recentActivity={recentActivitySummary}
          wodRemainingCount={wodUsageStats.remaining}
          wodIsUnlimited={wodUsageStats.isUnlimited}
        />

        {/* READINESS PANEL (Right 1/3) */}
        <ReadinessPanel
          readinessScore={readinessScore}
          weeklyTSS={weeklyTSS}
          weeklyTSSTarget={weeklyTSSTarget}
          muscularFatigue={muscularFatigue}
          hasCheckedInToday={hasCheckedInToday}
          activeInjuries={activeInjuries.filter((injury): injury is { painLocation: string; painLevel: number } => injury.painLocation !== null)}
        />
      </div>

      {/* AI insights — always visible on the main overview */}
      <div className="mb-8">
        <MorningBriefingCard />
      </div>

      {showTrainingDetails && (
        <div id="training-details">
          {/* Contextual Cards */}
          <div className="mb-6">
            <MilestoneCelebrationCard />
          </div>
          <div className="mb-6">
            <PreWorkoutNudgeCard />
          </div>
          <div className="mb-6">
            <PatternAlertCard />
          </div>
          <div className="mb-6">
            <MentalPrepCard />
          </div>
          <div className="mb-6">
            <NutritionTimingCard />
          </div>
          <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RaceFuelingCard clientId={clientId} variant="glass" basePath={basePath} />
            <FuelingTrainingProgressCard clientId={clientId} variant="glass" plansHref={`${basePath}/athlete/fueling`} />
          </div>
          <div className="mb-6">
            <PostWorkoutCheckCard />
          </div>
          <div className="mb-8">
            <AISuggestionsBanner />
          </div>

          {/* Sport-Specific Dashboard */}
          {renderSportDashboard() && (
            <div className="mb-8">
              {renderSportDashboard()}
            </div>
          )}

          {/* Secondary Grid (Widget Layout) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Column (2/3) */}
            <div className="lg:col-span-2 space-y-6">
              <UpcomingTeamEvents />

              <UpcomingWorkouts items={upcomingItems} variant="glass" basePath={basePath} />

              <WeeklyTrainingSummaryCard
                clientId={clientId}
                variant="glass"
                activeSport={primarySport || 'RUNNING'}
                intensityTargets={intensityTargets}
              />

              <TrainingTrendChart clientId={clientId} variant="glass" weeks={12} />

              <ZoneDistributionChart clientId={clientId} variant="glass" />

              <NutritionDashboard clientId={clientId} mode="summary" />

              <IntegratedRecentActivity clientId={clientId} variant="glass" />

              <IntervalResultsHistory maxAgeHours={24} hideWhenEmpty />

              <AthleteDrillList athletePosition={client.position ?? undefined} />
            </div>

            {/* Right Column (1/3) */}
            <div className="space-y-6">
              <AccountabilityStreakWidget basePath={basePath} />

              <AgentRecommendationsPanel basePath={basePath} />

              <ActiveRestrictionsCard clientId={clientId} />

              <ActivePrograms programs={activePrograms} variant="glass" />

              <WODHistorySummary recentWods={wodHistory} stats={wodStats} />
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
