// app/coach/dashboard/page.tsx
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Activity,
  Users,
  TrendingUp,
  MessageSquare,
  AlertCircle,
  Calendar,
  Clock,
  CheckCircle2,
  ArrowRight,
  HeartPulse,
  ClipboardList,
} from 'lucide-react'
import { format, subDays } from 'date-fns'
import { sv, enUS } from 'date-fns/locale'
import { getTranslations, getLocale } from '@/i18n/server'
import { CoachAIAssistantPanel } from '@/components/coach/CoachAIAssistantPanel'

export default async function CoachDashboardPage() {
  const t = await getTranslations('coach')
  const tNav = await getTranslations('nav')
  const tCommon = await getTranslations('common')
  const locale = await getLocale()
  const dateLocale = locale === 'sv' ? sv : enUS
  const user = await requireCoach()

  // Get coach's clients count
  const clientsCount = await prisma.client.count({
    where: { userId: user.id },
  })

  // Get active programs count
  const now = new Date()
  const activeProgramsCount = await prisma.trainingProgram.count({
    where: {
      coachId: user.id,
      startDate: { lte: now },
      endDate: { gte: now },
    },
  })

  // Get recent workout logs (last 7 days) from all coach's athletes
  const sevenDaysAgo = subDays(now, 7)

  const recentLogs = await prisma.workoutLog.findMany({
    where: {
      completedAt: {
        gte: sevenDaysAgo,
      },
      workout: {
        day: {
          week: {
            program: {
              coachId: user.id,
            },
          },
        },
      },
    },
    include: {
      athlete: {
        select: {
          id: true,
          name: true,
        },
      },
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
                      client: {
                        select: {
                          id: true,
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      completedAt: 'desc',
    },
    take: 20,
  })

  // Logs without feedback
  const logsNeedingFeedback = recentLogs.filter(log => !log.coachFeedback && log.completed)

  // Active injuries count (via InjuryAssessment)
  const activeInjuries = await prisma.injuryAssessment.count({
    where: {
      client: {
        userId: user.id,
      },
      status: {
        in: ['ACTIVE', 'MONITORING'],
      },
      resolved: false,
    },
  })

  // Calculate stats
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

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{tNav('dashboard')}</h1>
        <p className="text-muted-foreground text-sm">
          {t('welcomeBack', { name: user.name })}
        </p>
      </div>

      {/* Key Stats - 4 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">{t('athletes')}</p>
                <p className="text-3xl font-bold">{clientsCount}</p>
              </div>
              <Users className="h-8 w-8 opacity-80" />
            </div>
            <Link href="/clients" className="text-xs text-blue-100 hover:text-white flex items-center gap-1 mt-2">
              {t('viewAll')} <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">{t('activePrograms')}</p>
                <p className="text-3xl font-bold">{activeProgramsCount}</p>
              </div>
              <Calendar className="h-8 w-8 opacity-80" />
            </div>
            <Link href="/coach/programs" className="text-xs text-green-100 hover:text-white flex items-center gap-1 mt-2">
              {t('viewPrograms')} <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">{t('workoutsThisWeek')}</p>
                <p className="text-3xl font-bold">{completedLogsThisWeek}</p>
              </div>
              <Activity className="h-8 w-8 opacity-80" />
            </div>
            <p className="text-xs text-purple-100 mt-2">{t('completedByAthletes')}</p>
          </CardContent>
        </Card>

        <Card className={`border-0 ${logsNeedingFeedback.length > 0 ? 'bg-gradient-to-br from-red-500 to-red-600 text-white' : 'bg-gradient-to-br from-slate-500 to-slate-600 text-white'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={logsNeedingFeedback.length > 0 ? 'text-red-100 text-sm' : 'text-slate-100 text-sm'}>{t('needsFeedback')}</p>
                <p className="text-3xl font-bold">{logsNeedingFeedback.length}</p>
              </div>
              <AlertCircle className="h-8 w-8 opacity-80" />
            </div>
            <p className={`text-xs mt-2 ${logsNeedingFeedback.length > 0 ? 'text-red-100' : 'text-slate-100'}`}>{t('workoutsWithoutFeedback')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Needs Attention */}
        <div className="lg:col-span-2 space-y-6">
          {/* Logs Needing Feedback */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  {t('needsFeedback')}
                </CardTitle>
                {logsNeedingFeedback.length > 0 && (
                  <Badge variant="destructive">{logsNeedingFeedback.length}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
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
                      className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-lg"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">
                          {log.workout.day.week.program.client.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {log.workout.name} • {log.completedAt ? format(new Date(log.completedAt), 'd MMM', { locale: dateLocale }) : '-'}
                        </p>
                      </div>
                      <Link href={`/coach/athletes/${log.workout.day.week.program.client.id}/logs`}>
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
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                {t('recentActivity')}
              </CardTitle>
              <CardDescription className="text-xs">
                {t('workoutsLoggedLast7Days')}
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">
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
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Summary & Alerts */}
        <div className="space-y-6">
          {/* AI Assistant Panel */}
          <CoachAIAssistantPanel />

          {/* Weekly Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('weeklySummary')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xl font-bold">{completedLogsThisWeek}</p>
                  <p className="text-xs text-muted-foreground">{t('completedWorkouts')}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xl font-bold">{feedbackGiven}</p>
                  <p className="text-xs text-muted-foreground">{t('feedbackGiven')}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xl font-bold">{avgRPE}</p>
                  <p className="text-xs text-muted-foreground">{t('averageRpe')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alerts */}
          {activeInjuries > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <HeartPulse className="h-6 w-6 text-red-500" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{t('activeInjuries', { count: activeInjuries })}</p>
                    <p className="text-xs text-muted-foreground">{t('requiresFollowUp')}</p>
                  </div>
                  <Link href="/coach/injuries">
                    <Button size="sm" variant="outline" className="text-xs h-8">
                      {tCommon('view')}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Links */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('quickLinks')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/test" className="block">
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition">
                  <ClipboardList className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">{t('newLactateTest')}</span>
                </div>
              </Link>
              <Link href="/coach/programs/new" className="block">
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition">
                  <Calendar className="h-4 w-4 text-green-500" />
                  <span className="text-sm">{t('createProgram')}</span>
                </div>
              </Link>
              <Link href="/coach/messages" className="block">
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition">
                  <MessageSquare className="h-4 w-4 text-orange-500" />
                  <span className="text-sm">{tNav('messages')}</span>
                </div>
              </Link>
              <Link href="/coach/monitoring" className="block">
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition">
                  <Activity className="h-4 w-4 text-purple-500" />
                  <span className="text-sm">{t('monitoring')}</span>
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
