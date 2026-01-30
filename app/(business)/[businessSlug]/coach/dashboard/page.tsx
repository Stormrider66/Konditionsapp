import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  GlassCard,
  GlassCardContent,
  GlassCardDescription,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/badge'
import {
  Activity,
  Users,
  TrendingUp,
  MessageSquare,
  AlertCircle,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ArrowRight,
  HeartPulse,
  ClipboardList,
  Zap,
  Trophy,
  Video,
  Dumbbell,
  Sparkles,
  Gauge,
  AlertTriangle,
  Target,
  Flame,
} from 'lucide-react'
import { format, subDays, startOfDay, endOfDay, addDays } from 'date-fns'
import { sv, enUS } from 'date-fns/locale'
import { getTranslations, getLocale } from '@/i18n/server'
import { CoachAIAssistantPanel } from '@/components/coach/CoachAIAssistantPanel'
import { VoiceWorkoutButton } from '@/components/coach/voice-workout'
import { TodaysAppointmentsCard } from '@/components/coach/dashboard/TodaysAppointmentsCard'
import { cn } from '@/lib/utils'
import { notFound } from 'next/navigation'

interface BusinessDashboardPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessDashboardPage({ params }: BusinessDashboardPageProps) {
  const { businessSlug } = await params
  const t = await getTranslations('coach')
  const tNav = await getTranslations('nav')
  const tCommon = await getTranslations('common')
  const locale = await getLocale()
  const dateLocale = locale === 'sv' ? sv : enUS
  const user = await requireCoach()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const basePath = `/${businessSlug}`

  // Get all coaches in the business
  const members = await prisma.businessMember.findMany({
    where: {
      businessId: membership.businessId,
      isActive: true,
      user: { role: 'COACH' },
    },
    select: { userId: true },
  })
  const coachIds = members.map(m => m.userId)
  if (!coachIds.includes(user.id)) {
    coachIds.push(user.id)
  }

  const now = new Date()
  const sevenDaysAgo = subDays(now, 7)
  const nextSevenDays = addDays(now, 7)

  // Parallel data fetching for performance
  const [
    clientsCount,
    activeProgramsCount,
    recentLogs,
    activeInjuries,
    recentTests,
    upcomingEvents,
    athletesWithReadiness,
    trainingLoadData,
  ] = await Promise.all([
    // Clients count (scoped to business)
    prisma.client.count({
      where: { userId: { in: coachIds } },
    }),

    // Active programs count (scoped to business)
    prisma.trainingProgram.count({
      where: {
        coachId: { in: coachIds },
        startDate: { lte: now },
        endDate: { gte: now },
      },
    }),

    // Recent workout logs
    prisma.workoutLog.findMany({
      where: {
        completedAt: { gte: sevenDaysAgo },
        workout: {
          day: {
            week: {
              program: { coachId: { in: coachIds } },
            },
          },
        },
      },
      include: {
        athlete: { select: { id: true, name: true } },
        workout: {
          include: {
            day: {
              include: {
                week: {
                  include: {
                    program: {
                      select: {
                        id: true,
                        name: true,
                        client: { select: { id: true, name: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { completedAt: 'desc' },
      take: 20,
    }),

    // Active injuries count (scoped to business)
    prisma.injuryAssessment.count({
      where: {
        client: { userId: { in: coachIds } },
        status: { in: ['ACTIVE', 'MONITORING'] },
        resolved: false,
      },
    }),

    // Recent tests (last 30 days)
    prisma.test.findMany({
      where: {
        client: { userId: { in: coachIds } },
        testDate: { gte: subDays(now, 30) },
        status: 'COMPLETED',
      },
      select: {
        id: true,
        testDate: true,
        testType: true,
        vo2max: true,
        client: { select: { id: true, name: true } },
      },
      orderBy: { testDate: 'desc' },
      take: 5,
    }),

    // Upcoming events (next 7 days)
    prisma.calendarEvent.findMany({
      where: {
        client: { userId: { in: coachIds } },
        startDate: {
          gte: startOfDay(now),
          lte: endOfDay(nextSevenDays),
        },
      },
      select: {
        id: true,
        title: true,
        type: true,
        startDate: true,
        client: { select: { id: true, name: true } },
      },
      orderBy: { startDate: 'asc' },
      take: 8,
    }),

    // Athletes with recent readiness data
    prisma.dailyMetrics.findMany({
      where: {
        client: { userId: { in: coachIds } },
        date: { gte: subDays(now, 1) },
      },
      select: {
        readinessScore: true,
        client: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
      take: 50,
    }),

    // Training load data for ACWR calculation
    prisma.trainingLoad.findMany({
      where: {
        client: { userId: { in: coachIds } },
        date: { gte: subDays(now, 7) },
      },
      select: {
        clientId: true,
        dailyLoad: true,
        client: { select: { name: true } },
      },
    }),
  ])

  // Calculate stats
  const logsNeedingFeedback = recentLogs.filter(log => !log.coachFeedback && log.completed)
  const completedLogsThisWeek = recentLogs.filter(log => log.completed).length
  const feedbackGiven = recentLogs.filter(log => log.coachFeedback).length
  const avgRPE = recentLogs.filter(log => log.perceivedEffort).length > 0
    ? (
      recentLogs
        .filter(log => log.perceivedEffort)
        .reduce((sum, log) => sum + (log.perceivedEffort || 0), 0) /
      recentLogs.filter(log => log.perceivedEffort).length
    ).toFixed(1)
    : '-'

  // Readiness distribution
  const uniqueAthleteReadiness = new Map<string, number>()
  athletesWithReadiness.forEach(m => {
    if (m.readinessScore && !uniqueAthleteReadiness.has(m.client.id)) {
      uniqueAthleteReadiness.set(m.client.id, m.readinessScore)
    }
  })
  const readinessScores = Array.from(uniqueAthleteReadiness.values())
  const highReadiness = readinessScores.filter(s => s >= 70).length
  const mediumReadiness = readinessScores.filter(s => s >= 40 && s < 70).length
  const lowReadiness = readinessScores.filter(s => s < 40).length

  // Training load per athlete
  const loadByAthlete = new Map<string, { name: string; load: number }>()
  trainingLoadData.forEach(l => {
    const current = loadByAthlete.get(l.clientId) || { name: l.client.name, load: 0 }
    current.load += l.dailyLoad || 0
    loadByAthlete.set(l.clientId, current)
  })
  const highLoadAthletes = Array.from(loadByAthlete.values()).filter(a => a.load > 600)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{tNav('dashboard')}</h1>
          <p className="text-muted-foreground text-sm">
            {t('welcomeBack', { name: user.name })}
            <span className="text-blue-500"> - {membership.business.name}</span>
          </p>
        </div>

        {/* Key Stats - 4 cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Link href={`${basePath}/coach/clients`}>
            <GlassCard className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 dark:ring-0 hover:scale-[1.02] transition-transform cursor-pointer">
              <GlassCardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">{t('athletes')}</p>
                    <p className="text-3xl font-bold">{clientsCount}</p>
                  </div>
                  <Users className="h-8 w-8 opacity-80" />
                </div>
                <p className="text-xs text-blue-100 flex items-center gap-1 mt-2">
                  {t('viewAll')} <ArrowRight className="h-3 w-3" />
                </p>
              </GlassCardContent>
            </GlassCard>
          </Link>

          <Link href={`${basePath}/coach/programs`}>
            <GlassCard className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 dark:ring-0 hover:scale-[1.02] transition-transform cursor-pointer">
              <GlassCardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm">{t('activePrograms')}</p>
                    <p className="text-3xl font-bold">{activeProgramsCount}</p>
                  </div>
                  <Calendar className="h-8 w-8 opacity-80" />
                </div>
                <p className="text-xs text-green-100 flex items-center gap-1 mt-2">
                  {t('viewPrograms')} <ArrowRight className="h-3 w-3" />
                </p>
              </GlassCardContent>
            </GlassCard>
          </Link>

          <GlassCard className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 dark:ring-0">
            <GlassCardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">{t('workoutsThisWeek')}</p>
                  <p className="text-3xl font-bold">{completedLogsThisWeek}</p>
                </div>
                <Activity className="h-8 w-8 opacity-80" />
              </div>
              <p className="text-xs text-purple-100 mt-2">{t('completedByAthletes')}</p>
            </GlassCardContent>
          </GlassCard>

          <GlassCard className={cn(
            'border-0 dark:ring-0',
            logsNeedingFeedback.length > 0
              ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white'
              : 'bg-gradient-to-br from-slate-500 to-slate-600 text-white'
          )}>
            <GlassCardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={logsNeedingFeedback.length > 0 ? 'text-amber-100 text-sm' : 'text-slate-100 text-sm'}>
                    {t('needsFeedback')}
                  </p>
                  <p className="text-3xl font-bold">{logsNeedingFeedback.length}</p>
                </div>
                <AlertCircle className="h-8 w-8 opacity-80" />
              </div>
              <p className={`text-xs mt-2 ${logsNeedingFeedback.length > 0 ? 'text-amber-100' : 'text-slate-100'}`}>
                {t('workoutsWithoutFeedback')}
              </p>
            </GlassCardContent>
          </GlassCard>
        </div>

        {/* Performance Insights Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Recent Tests */}
          <GlassCard>
            <GlassCardHeader className="pb-2">
              <GlassCardTitle className="text-sm flex items-center gap-2">
                <Gauge className="h-4 w-4 text-cyan-500" />
                Senaste tester
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              {recentTests.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Inga tester senaste 30 dagarna
                </p>
              ) : (
                <div className="space-y-2">
                  {recentTests.slice(0, 3).map(test => (
                    <Link
                      key={test.id}
                      href={`${basePath}/coach/clients/${test.client.id}/tests/${test.id}`}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 dark:hover:bg-white/5 transition"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate dark:text-slate-200">
                          {test.client.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {test.testType} • {format(new Date(test.testDate), 'd MMM', { locale: dateLocale })}
                        </p>
                      </div>
                      {test.vo2max && (
                        <Badge className="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-0">
                          {test.vo2max.toFixed(1)} ml/kg
                        </Badge>
                      )}
                    </Link>
                  ))}
                  <Link href={`${basePath}/coach/test`} className="block text-center">
                    <Button variant="ghost" size="sm" className="text-xs w-full">
                      Skapa nytt test <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              )}
            </GlassCardContent>
          </GlassCard>

          {/* Readiness Overview */}
          <GlassCard>
            <GlassCardHeader className="pb-2">
              <GlassCardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                Beredskap idag
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              {readinessScores.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Ingen beredskapsdata
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-sm flex-1 dark:text-slate-300">Hög ({'>'}70)</span>
                    <span className="font-bold dark:text-slate-200">{highReadiness}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span className="text-sm flex-1 dark:text-slate-300">Medium (40-70)</span>
                    <span className="font-bold dark:text-slate-200">{mediumReadiness}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-sm flex-1 dark:text-slate-300">Låg ({'<'}40)</span>
                    <span className="font-bold dark:text-slate-200">{lowReadiness}</span>
                  </div>
                  <Link href={`${basePath}/coach/monitoring`} className="block">
                    <Button variant="ghost" size="sm" className="text-xs w-full mt-2">
                      Monitorering <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              )}
            </GlassCardContent>
          </GlassCard>

          {/* Training Load Alert */}
          <GlassCard>
            <GlassCardHeader className="pb-2">
              <GlassCardTitle className="text-sm flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                Träningsbelastning
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Aktiva atleter</span>
                  <span className="font-bold dark:text-slate-200">{loadByAthlete.size}</span>
                </div>
                {highLoadAthletes.length > 0 ? (
                  <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/30">
                    <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">{highLoadAthletes.length} med hög belastning</span>
                    </div>
                    <p className="text-xs text-orange-600/70 dark:text-orange-400/70 mt-1">
                      Veckobelastning {'>'} 600 TSS
                    </p>
                  </div>
                ) : (
                  <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-sm font-medium">Balanserad belastning</span>
                    </div>
                  </div>
                )}
                <Link href={`${basePath}/coach/analytics`} className="block">
                  <Button variant="ghost" size="sm" className="text-xs w-full">
                    Analys <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </GlassCardContent>
          </GlassCard>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Activity & Feedback */}
          <div className="lg:col-span-2 space-y-6">
            {/* Logs Needing Feedback */}
            <GlassCard>
              <GlassCardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <GlassCardTitle className="text-base flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    {t('needsFeedback')}
                  </GlassCardTitle>
                  {logsNeedingFeedback.length > 0 && (
                    <Badge variant="outline" className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                      {logsNeedingFeedback.length}
                    </Badge>
                  )}
                </div>
              </GlassCardHeader>
              <GlassCardContent>
                {logsNeedingFeedback.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500" />
                    <p className="text-sm">{t('allWorkoutsHaveFeedback')}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {logsNeedingFeedback.slice(0, 4).map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-lg"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate dark:text-slate-200">
                            {log.workout.day.week.program.client.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {log.workout.name} • {log.completedAt ? format(new Date(log.completedAt), 'd MMM', { locale: dateLocale }) : '-'}
                          </p>
                        </div>
                        <Link href={`${basePath}/coach/athletes/${log.workout.day.week.program.client.id}/logs`}>
                          <Button size="sm" variant="outline" className="text-xs h-8">
                            {t('giveFeedback')}
                          </Button>
                        </Link>
                      </div>
                    ))}
                    {logsNeedingFeedback.length > 4 && (
                      <p className="text-xs text-muted-foreground text-center pt-2">
                        {t('moreWorkouts', { count: logsNeedingFeedback.length - 4 })}
                      </p>
                    )}
                  </div>
                )}
              </GlassCardContent>
            </GlassCard>

            {/* Recent Activity */}
            <GlassCard>
              <GlassCardHeader className="pb-3">
                <GlassCardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-500" />
                  {t('recentActivity')}
                </GlassCardTitle>
                <GlassCardDescription className="text-xs">
                  {t('workoutsLoggedLast7Days')}
                </GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent>
                {recentLogs.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Activity className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{t('noWorkoutsLoggedYet')}</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {recentLogs.slice(0, 8).map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between p-3 bg-muted/30 dark:bg-white/5 rounded-lg"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate dark:text-slate-200">
                              {log.workout.day.week.program.client.name}
                            </p>
                            {log.completed && <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0" />}
                            {log.coachFeedback && <MessageSquare className="h-3 w-3 text-blue-600 flex-shrink-0" />}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {log.workout.name}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <p className="text-xs text-muted-foreground">
                            {log.completedAt ? format(new Date(log.completedAt), 'd MMM', { locale: dateLocale }) : '-'}
                          </p>
                          {log.perceivedEffort && (
                            <Badge variant="outline" className="text-[10px] h-5">
                              RPE {log.perceivedEffort}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCardContent>
            </GlassCard>
          </div>

          {/* Right Column - Summary, Events & Quick Actions */}
          <div className="space-y-6">
            {/* AI Assistant Panel */}
            <CoachAIAssistantPanel />

            {/* Today's Appointments */}
            <TodaysAppointmentsCard basePath={basePath} />

            {/* Upcoming Events & Races */}
            <GlassCard>
              <GlassCardHeader className="pb-3">
                <GlassCardTitle className="text-base flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-purple-500" />
                  Kommande händelser
                </GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent>
                {upcomingEvents.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Inga händelser nästa 7 dagar</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {upcomingEvents.slice(0, 5).map(event => {
                      const isRace = ['RACE_A', 'RACE_B', 'RACE_C', 'COMPETITION'].includes(event.type)
                      return (
                        <Link
                          key={event.id}
                          href={`${basePath}/coach/athletes/${event.client.id}/calendar`}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 dark:hover:bg-white/5 transition"
                        >
                          <div className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center',
                            isRace
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
                              : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                          )}>
                            {isRace ? <Trophy className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate dark:text-slate-200">{event.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {event.client.name} • {format(new Date(event.startDate), 'd MMM', { locale: dateLocale })}
                            </p>
                          </div>
                        </Link>
                      )
                    })}
                    <Link href={`${basePath}/coach/calendar`} className="block">
                      <Button variant="ghost" size="sm" className="text-xs w-full">
                        Visa kalender <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                )}
              </GlassCardContent>
            </GlassCard>

            {/* Weekly Summary */}
            <GlassCard>
              <GlassCardHeader className="pb-3">
                <GlassCardTitle className="text-base">{t('weeklySummary')}</GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-xl font-bold dark:text-slate-200">{completedLogsThisWeek}</p>
                    <p className="text-xs text-muted-foreground">{t('completedWorkouts')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xl font-bold dark:text-slate-200">{feedbackGiven}</p>
                    <p className="text-xs text-muted-foreground">{t('feedbackGiven')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-xl font-bold dark:text-slate-200">{avgRPE}</p>
                    <p className="text-xs text-muted-foreground">{t('averageRpe')}</p>
                  </div>
                </div>
              </GlassCardContent>
            </GlassCard>

            {/* Alerts */}
            {activeInjuries > 0 && (
              <GlassCard className="border-red-200 bg-red-50 dark:bg-red-950/10 dark:border-red-900/30">
                <GlassCardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <HeartPulse className="h-6 w-6 text-red-500" />
                    <div className="flex-1">
                      <p className="font-medium text-sm dark:text-red-200">{t('activeInjuries', { count: activeInjuries })}</p>
                      <p className="text-xs text-muted-foreground">{t('requiresFollowUp')}</p>
                    </div>
                    <Link href={`${basePath}/coach/injuries`}>
                      <Button size="sm" variant="outline" className="text-xs h-8">
                        {tCommon('view')}
                      </Button>
                    </Link>
                  </div>
                </GlassCardContent>
              </GlassCard>
            )}

            {/* Quick Links */}
            <GlassCard>
              <GlassCardHeader className="pb-3">
                <GlassCardTitle className="text-base">{t('quickLinks')}</GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent className="grid grid-cols-2 gap-2">
                <VoiceWorkoutButton variant="card" basePath={basePath} />
                <Link href={`${basePath}/coach/test`} className="block">
                  <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/30 dark:bg-white/5 hover:bg-muted dark:hover:bg-white/10 transition text-center">
                    <ClipboardList className="h-5 w-5 text-cyan-500" />
                    <span className="text-xs dark:text-slate-300">Nytt test</span>
                  </div>
                </Link>
                <Link href={`${basePath}/coach/programs/new`} className="block">
                  <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/30 dark:bg-white/5 hover:bg-muted dark:hover:bg-white/10 transition text-center">
                    <Target className="h-5 w-5 text-green-500" />
                    <span className="text-xs dark:text-slate-300">Program</span>
                  </div>
                </Link>
                <Link href={`${basePath}/coach/ai-studio`} className="block">
                  <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/30 dark:bg-white/5 hover:bg-muted dark:hover:bg-white/10 transition text-center">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    <span className="text-xs dark:text-slate-300">AI Studio</span>
                  </div>
                </Link>
                <Link href={`${basePath}/coach/video-analysis`} className="block">
                  <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/30 dark:bg-white/5 hover:bg-muted dark:hover:bg-white/10 transition text-center">
                    <Video className="h-5 w-5 text-red-500" />
                    <span className="text-xs dark:text-slate-300">Video</span>
                  </div>
                </Link>
                <Link href={`${basePath}/coach/strength`} className="block">
                  <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/30 dark:bg-white/5 hover:bg-muted dark:hover:bg-white/10 transition text-center">
                    <Dumbbell className="h-5 w-5 text-orange-500" />
                    <span className="text-xs dark:text-slate-300">Styrka</span>
                  </div>
                </Link>
              </GlassCardContent>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  )
}
