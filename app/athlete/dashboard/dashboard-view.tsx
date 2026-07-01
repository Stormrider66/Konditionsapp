// app/athlete/dashboard/dashboard-view.tsx
//
// Shared athlete dashboard implementation rendered by BOTH the solo route
// (app/athlete/dashboard) and the business route
// (app/(business)/[businessSlug]/athlete/dashboard). Business context is
// optional: without it, widget resolution falls back to registry defaults
// and business-only header chrome is omitted. Auth is resolved by the
// page wrappers and passed in so it runs once per request.
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { SportType } from '@prisma/client'
import { addDays, format } from 'date-fns'
import { getAthleteDashboardData } from '@/lib/athlete/dashboard-data'
import { UpcomingWorkouts } from '@/components/athlete/UpcomingWorkouts'
import { IntegratedRecentActivity } from '@/components/athlete/IntegratedRecentActivity'
import { ActivePrograms } from '@/components/athlete/ActivePrograms'
import { AthletePlanSummaryCard } from '@/components/athlete-plans/AthletePlanSummaryCard'
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
import { ReadinessPanel, AccountabilityStreakWidget, DashboardDaySwitcher, QuickActionsGrid, GarminHealthCard, OuraHealthCard } from '@/components/athlete/dashboard'
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
import { getLocale, getTranslations } from '@/i18n/server'
import { getAssignmentRoute, getWODRoute } from '@/types/dashboard-items'
import { resolveAthleteWidgets, visibleKeys } from '@/lib/dashboard/resolve-widgets'
import { canClientReportInjuryToTeamPhysio } from '@/lib/medical/care-team-recipients'
import { isStructuredTrainingProgram } from '@/lib/training/program-kind'

export interface AthleteDashboardViewProps {
  userId: string
  clientId: string
  showTrainingDetails: boolean
  /** '' for solo athletes, '/<businessSlug>' in business context. */
  basePath: string
  businessId?: string | null
  businessName?: string | null
}

export async function AthleteDashboardView({
  userId,
  clientId,
  showTrainingDetails,
  basePath,
  businessId,
  businessName,
}: AthleteDashboardViewProps) {
  const t = await getTranslations('athletePages.dashboard')
  const locale = (await getLocale()) === 'sv' ? 'sv' : 'en'

  // Get client with sport profile (works for both athletes and coaches in athlete mode)
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

  // Resolve user's customized widget visibility (precedence: user pref ->
  // coach individual template -> coach team template -> coach business default
  // -> registry defaults). `required` widgets are always visible. Without a
  // businessId (solo athletes) this falls back to registry defaults.
  const resolvedWidgets = await resolveAthleteWidgets({
    userId,
    clientId,
    businessId: businessId ?? null,
    sport: primarySport ?? null,
  })
  const visible = visibleKeys(resolvedWidgets)
  const isVisible = (key: string) => visible.has(key)
  // Map widgetKey -> order so we can sort sections by user-defined ordering.
  const orderMap = new Map(resolvedWidgets.map(w => [w.key, w.order]))
  const orderOf = (key: string) => orderMap.get(key) ?? 9999
  const sortByOrder = <T extends { key: string }>(items: T[]): T[] =>
    [...items].sort((a, b) => orderOf(a.key) - orderOf(b.key))

  // Nutrition-focused users get a dedicated dashboard (skip all training data fetches)
  if (primarySport === 'NUTRITION') {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6 max-w-7xl font-sans">
        <div className="flex flex-col gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2 transition-colors">
              {t('welcomeBack')}{' '}
              <span className="text-emerald-600 dark:text-emerald-500">{client.name.split(' ')[0]}</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 flex items-center gap-2 transition-colors">
              <CalendarDays className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
              <span className="capitalize">{format(now, 'EEEE, d MMMM')}</span>
              {businessName && (
                <>
                  <span className="text-slate-400 dark:text-slate-600">•</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">{businessName}</span>
                </>
              )}
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

    // If active sport comes from cookie (not actual primary) and has no settings,
    // don't show a useless "complete onboarding" card for a secondary sport
    const isFromCookie = primarySport !== sportProfile.primarySport
    if (isFromCookie) {
      const sportSettingsMap: Partial<Record<string, unknown>> = {
        CYCLING: sportProfile.cyclingSettings,
        SKIING: sportProfile.skiingSettings,
        SWIMMING: sportProfile.swimmingSettings,
        TRIATHLON: sportProfile.triathlonSettings,
        HYROX: sportProfile.hyroxSettings,
        GENERAL_FITNESS: sportProfile.generalFitnessSettings,
        FUNCTIONAL_FITNESS: sportProfile.functionalFitnessSettings,
        TEAM_ICE_HOCKEY: sportProfile.hockeySettings,
        TEAM_FOOTBALL: sportProfile.footballSettings,
        TEAM_HANDBALL: sportProfile.handballSettings,
        TEAM_FLOORBALL: sportProfile.floorballSettings,
        TEAM_BASKETBALL: sportProfile.basketballSettings,
        TEAM_VOLLEYBALL: sportProfile.volleyballSettings,
        TENNIS: sportProfile.tennisSettings,
        PADEL: sportProfile.padelSettings,
      }
      if (primarySport && !sportSettingsMap[primarySport]) return null
    }

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

  const sportDashboard = renderSportDashboard()

  // Data assembly shared with GET /api/athlete/dashboard (mobile app) —
  // lib/athlete/dashboard-data.ts is the single implementation.
  const {
    activePrograms,
    activeAthletePlans,
    lastCompletedProgram,
    latestMetrics,
    hasCoach,
    dashboardItems,
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
    userId,
    clientId,
    subscriptionTier: client.athleteSubscription?.tier || 'FREE',
    locale,
    now,
  })

  const currentProgram = activePrograms[0]
  const currentAthletePlan = activeAthletePlans[0] ?? null
  const restDayMode = currentProgram || currentAthletePlan ? 'rest-day' : 'open-day'
  const dashboardAthleteContext = {
    isAICoached: client.isAICoached,
    hasCoach,
  }
  const dashboardToday = format(now, 'yyyy-MM-dd')
  const dashboardDateOptions = Array.from(
    { length: 15 },
    (_, index) => format(addDays(now, index - 7), 'yyyy-MM-dd')
  )

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 max-w-7xl font-sans">

      {/* Welcome Section */}
      <div className="flex flex-col gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2 transition-colors">
            {t('welcomeBack')}{' '}
            <span className="text-orange-600 dark:text-orange-500">
              {client.name.split(' ')[0]}
            </span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 flex items-center gap-2 transition-colors">
            <CalendarDays className="w-4 h-4 text-orange-600 dark:text-orange-500" />
            <span className="capitalize">{format(now, 'EEEE, d MMMM')}</span>
            <span className="text-slate-400 dark:text-slate-600">•</span>
            <span className="text-orange-600 dark:text-orange-400 font-medium">
              {businessName ?? (currentProgram ? currentProgram.name : t('noActiveProgram'))}
            </span>
          </p>
        </div>
        <QuickActionsGrid
          sessionHref={
            firstActionableItem?.kind === 'program'
              ? `${basePath}/athlete/workouts/${firstActionableItem.workout.id}/log`
              : firstActionableItem?.kind === 'assignment'
                ? getAssignmentRoute(firstActionableItem, basePath)
                : firstActionableItem?.kind === 'wod'
                  ? getWODRoute(firstActionableItem, basePath)
                  : `${basePath}/athlete/browse-workouts`
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
        {/* HERO CARD(S) (Left 2/3) — required, always visible */}
        <DashboardDaySwitcher
          items={dashboardItems}
          dateOptions={dashboardDateOptions}
          todayDate={dashboardToday}
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
        {isVisible('readiness-panel') && (
          <ReadinessPanel
            readinessScore={readinessScore}
            weeklyTSS={weeklyTSS}
            weeklyTSSTarget={weeklyTSSTarget}
            muscularFatigue={muscularFatigue}
            hasCheckedInToday={hasCheckedInToday}
            activeInjuries={activeInjuries.filter((injury): injury is { painLocation: string; painLevel: number } => injury.painLocation !== null)}
            basePath={basePath}
          />
        )}
      </div>

      {/* AI insights — always visible on the main overview */}
      {isVisible('morning-briefing') && (
        <div className="mb-8">
          <MorningBriefingCard
            hasActiveProgram={activePrograms.some(isStructuredTrainingProgram)}
            isAICoached={client.isAICoached}
            primarySport={primarySport}
          />
        </div>
      )}

      {showTrainingDetails && (
        <div id="training-details">
          {/* Contextual Cards — rendered in user-defined order */}
          {sortByOrder([
            { key: 'milestone-celebration', node: <MilestoneCelebrationCard /> },
            { key: 'pre-workout-nudge', node: <PreWorkoutNudgeCard /> },
            { key: 'pattern-alert', node: <PatternAlertCard /> },
            { key: 'mental-prep', node: <MentalPrepCard /> },
            { key: 'nutrition-timing', node: <NutritionTimingCard /> },
            {
              key: 'race-fueling',
              node: (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <RaceFuelingCard clientId={clientId} variant="glass" basePath={basePath} />
                  <FuelingTrainingProgressCard clientId={clientId} variant="glass" plansHref={`${basePath}/athlete/fueling`} />
                </div>
              ),
            },
            { key: 'post-workout-check', node: <PostWorkoutCheckCard /> },
            { key: 'ai-suggestions-banner', node: <AISuggestionsBanner /> },
          ])
            .filter(item => isVisible(item.key))
            .map(item => (
              <div key={item.key} className="mb-6">
                {item.node}
              </div>
            ))}

          {/* Sport-Specific Dashboard */}
          {isVisible('sport-specific-dashboard') && sportDashboard && (
            <div className="mb-8">
              {sportDashboard}
            </div>
          )}

          {/* Secondary Grid (Widget Layout) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Column (2/3) — rendered in user-defined order */}
            <div className="lg:col-span-2 space-y-6">
              {sortByOrder([
                { key: 'upcoming-team-events', node: <UpcomingTeamEvents /> },
                { key: 'upcoming-workouts', node: <UpcomingWorkouts items={upcomingItems} variant="glass" basePath={basePath} /> },
                { key: 'weekly-training-summary', node: (
                  <WeeklyTrainingSummaryCard
                    clientId={clientId}
                    variant="glass"
                    activeSport={primarySport || 'RUNNING'}
                    intensityTargets={intensityTargets}
                  />
                ) },
                { key: 'training-trend-chart', node: <TrainingTrendChart clientId={clientId} variant="glass" weeks={12} /> },
                { key: 'zone-distribution-chart', node: <ZoneDistributionChart clientId={clientId} variant="glass" /> },
                { key: 'nutrition-dashboard', node: <NutritionDashboard clientId={clientId} mode="summary" /> },
                { key: 'integrated-recent-activity', node: <IntegratedRecentActivity clientId={clientId} variant="glass" /> },
                { key: 'interval-results-history', node: <IntervalResultsHistory maxAgeHours={24} hideWhenEmpty /> },
                { key: 'athlete-drill-list', node: <AthleteDrillList athletePosition={client.position ?? undefined} /> },
              ])
                .filter(item => isVisible(item.key))
                .map(item => <div key={item.key}>{item.node}</div>)}
            </div>

            {/* Right Column (1/3) — rendered in user-defined order.
                Active restrictions stay pinned at top: it's a required, safety-critical widget. */}
            <div className="space-y-6">
              <ActiveRestrictionsCard clientId={clientId} />

              {currentAthletePlan && (
                <AthletePlanSummaryCard
                  plan={currentAthletePlan}
                  now={now}
                  variant="athlete"
                  className="bg-white/80 dark:bg-slate-900/80"
                />
              )}

              {sortByOrder([
                { key: 'accountability-streak', node: <AccountabilityStreakWidget basePath={basePath} /> },
                { key: 'agent-recommendations', node: <AgentRecommendationsPanel basePath={basePath} /> },
                { key: 'active-programs', node: (
                  <ActivePrograms
                    programs={activePrograms}
                    variant="glass"
                    basePath={basePath}
                    lastCompletedProgram={lastCompletedProgram ? {
                      id: lastCompletedProgram.id,
                      name: lastCompletedProgram.name,
                      endDate: lastCompletedProgram.endDate,
                    } : undefined}
                    athleteContext={dashboardAthleteContext}
                    wodUsage={{ remaining: wodUsageStats.remaining, isUnlimited: wodUsageStats.isUnlimited }}
                  />
                ) },
                { key: 'wod-history-summary', node: <WODHistorySummary recentWods={wodHistory} stats={wodStats} basePath={basePath} /> },
                { key: 'oura-health-card', node: (() => {
                  const fs = latestMetrics?.factorScores as Record<string, any> | null
                  return <OuraHealthCard oura={fs?.oura ?? null} />
                })() },
                { key: 'garmin-health-card', node: (
                  <GarminHealthCard
                    hrvRMSSD={latestMetrics?.hrvRMSSD}
                    hrvStatus={latestMetrics?.hrvStatus}
                    restingHR={latestMetrics?.restingHR}
                    sleepHours={latestMetrics?.sleepHours}
                    sleepQuality={latestMetrics?.sleepQuality}
                    stress={latestMetrics?.stress}
                    sleepDetails={(() => {
                      const fs = latestMetrics?.factorScores as Record<string, any> | null
                      return fs?.garminSleep ? {
                        deepSleepMinutes: fs.garminSleep.deepSleepMinutes,
                        lightSleepMinutes: fs.garminSleep.lightSleepMinutes,
                        remSleepMinutes: fs.garminSleep.remSleepMinutes,
                        awakeMinutes: fs.garminSleep.awakeMinutes,
                      } : null
                    })()}
                  />
                ) },
              ])
                .filter(item => isVisible(item.key))
                .map(item => <div key={item.key}>{item.node}</div>)}
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
