// app/athlete/history/history-view.tsx
//
// Shared workout-history implementation rendered by BOTH the solo route
// (app/athlete/history) and the business route
// (app/(business)/[businessSlug]/athlete/history). Data assembly is shared
// with GET /api/athlete/history (mobile app) — lib/athlete/history-feed.ts
// is the single implementation. Auth is resolved by the page wrappers.
import { getAthleteHistoryFeed, type HistoryFeedItem } from '@/lib/athlete/history-feed'
import { format } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Calendar,
  Clock,
  TrendingUp,
  Zap,
  ArrowLeft,
  Filter,
  Plus,
  Sparkles,
  Heart,
} from 'lucide-react'
import { WorkoutHistoryCharts } from '@/components/athlete/WorkoutHistoryCharts'
import { PersonalRecords } from '@/components/athlete/PersonalRecords'
import { ExportDataButton } from '@/components/athlete/ExportDataButton'
import { GarminAttribution } from '@/components/ui/GarminAttribution'
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
  GlassCardDescription
} from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'
import { getLocale, getTranslations } from '@/i18n/server'

export interface AthleteHistoryViewProps {
  userId: string
  clientId: string
  timeframeParam?: string
  typeParam?: string
  /** '' for solo athletes, '/<businessSlug>' in business context. */
  basePath: string
}

export async function AthleteHistoryView({
  userId,
  clientId,
  timeframeParam,
  typeParam,
  basePath,
}: AthleteHistoryViewProps) {
  const t = await getTranslations('athletePages.history')
  const locale = await getLocale()
  const dateLocale = locale === 'en' ? enUS : sv

  // Data assembly shared with GET /api/athlete/history (mobile app) —
  // lib/athlete/history-feed.ts is the single implementation.
  const { items: historyItems, stats, logs, timeframe } = await getAthleteHistoryFeed({
    userId,
    clientId,
    timeframe: timeframeParam,
    typeFilter: typeParam ?? null,
    fallbackAdHocName: t('fallbackAdHocName'),
    basePath,
  })

  const totalWorkouts = stats.totalWorkouts
  const totalDistance = stats.totalDistanceKm
  const totalDuration = stats.totalDurationMin
  const avgRPE = stats.avgRPE != null ? stats.avgRPE.toFixed(1) : '-'
  const chartLogs = logs.filter((log): log is (typeof logs)[number] & { completedAt: Date } => log.completedAt !== null)
  const garminDeviceNames = [...new Set(
    historyItems
      .filter((i) => i.source === 'garmin')
      .map((i) => i.deviceName)
      .filter((n): n is string => !!n)
  )]
  const hasGarminItems = historyItems.some((i) => i.source === 'garmin')
  const timeframeSummary =
    timeframe === '7days' ? t('timeframeSummaries.sevenDays') :
      timeframe === '30days' ? t('timeframeSummaries.thirtyDays') :
        timeframe === '3months' ? t('timeframeSummaries.threeMonths') :
          timeframe === '6months' ? t('timeframeSummaries.sixMonths') :
            t('timeframeSummaries.oneYear')
  const formatWorkoutType = (type: string): string => {
    const types: Record<string, string> = {
      RUNNING: t('workoutTypes.running'),
      CYCLING: t('workoutTypes.cycling'),
      STRENGTH: t('workoutTypes.strength'),
      CORE: t('workoutTypes.core'),
      PLYOMETRIC: t('workoutTypes.plyometric'),
      RECOVERY: t('workoutTypes.recovery'),
      SKIING: t('workoutTypes.skiing'),
      OTHER: t('workoutTypes.other'),
      CARDIO: t('workoutTypes.cardio'),
      HYBRID: t('workoutTypes.hybrid'),
      AGILITY: t('workoutTypes.agility'),
      MIXED: t('workoutTypes.mixed'),
      SWIMMING: t('workoutTypes.swimming'),
      ROWING: t('workoutTypes.rowing'),
      WALKING: t('workoutTypes.walking'),
      CROSS_TRAINING: t('workoutTypes.crossTraining'),
      HYROX: t('workoutTypes.hyrox'),
    }
    return types[type] || type
  }

  return (
    <div className="min-h-screen pb-20 pt-6 px-4 max-w-7xl mx-auto">
      <Link href={`${basePath}/athlete/dashboard`}>
        <Button variant="ghost" className="mb-8 font-black uppercase tracking-widest text-[10px] text-slate-500 hover:text-slate-900 dark:hover:text-white">
          <ArrowLeft className="mr-2 h-3.5 w-3.5" />
          {t('back')}
        </Button>
      </Link>

      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="space-y-2">
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white tracking-tight uppercase italic leading-none">
            {t('titlePrefix')}<span className="text-orange-600 dark:text-orange-500">{t('titleAccent')}</span>
          </h1>
          <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px]">
            {t('description')}
          </p>
          {/* Brand guidelines: multi-entry display — global Garmin
              attribution in the page header (entries also attribute
              individually). Totals above the fold include Garmin data. */}
          {hasGarminItems && (
            <GarminAttribution
              deviceModel={garminDeviceNames.join(', ') || null}
              size="md"
              className="pt-1"
            />
          )}
        </div>
        <ExportDataButton logs={logs} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <GlassCard>
          <GlassCardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {t('stats.totalWorkouts')}
              </span>
              <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Calendar className="h-4 w-4 text-blue-400" />
              </div>
            </div>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="text-3xl font-black text-slate-900 dark:text-white">{totalWorkouts}</div>
            <p className="text-[10px] text-slate-500 font-semibold mt-1 uppercase tracking-tight">
              {t('stats.latest', { period: timeframeSummary })}
            </p>
          </GlassCardContent>
        </GlassCard>

        <GlassCard>
          <GlassCardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {t('stats.totalDistance')}
              </span>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              </div>
            </div>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="text-3xl font-black text-slate-900 dark:text-white">{totalDistance.toFixed(1)}</div>
            <p className="text-[10px] text-slate-500 font-semibold mt-1 uppercase tracking-tight">{t('stats.kilometersCompleted')}</p>
          </GlassCardContent>
        </GlassCard>

        <GlassCard>
          <GlassCardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {t('stats.totalTime')}
              </span>
              <div className="p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <Clock className="h-4 w-4 text-orange-400" />
              </div>
            </div>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="text-3xl font-black text-slate-900 dark:text-white">
              {Math.floor(totalDuration / 60)}h {totalDuration % 60}m
            </div>
            <p className="text-[10px] text-slate-500 font-semibold mt-1 uppercase tracking-tight">{t('stats.effectiveTraining')}</p>
          </GlassCardContent>
        </GlassCard>

        <GlassCard>
          <GlassCardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {t('stats.averageRpe')}
              </span>
              <div className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                <Zap className="h-4 w-4 text-red-400" />
              </div>
            </div>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="text-3xl font-black text-slate-900 dark:text-white">{avgRPE}</div>
            <p className="text-[10px] text-slate-500 font-semibold mt-1 uppercase tracking-tight">{t('stats.perceivedEffort')}</p>
          </GlassCardContent>
        </GlassCard>
      </div>

      {/* Filters */}
      <GlassCard className="mb-8">
        <GlassCardHeader>
          <div className="flex items-center justify-between">
            <div>
              <GlassCardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-orange-500" />
                {t('filters.title')}
              </GlassCardTitle>
              <GlassCardDescription>{t('filters.description')}</GlassCardDescription>
            </div>
          </div>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Timeframe filters */}
            <div className="flex-1">
              <p className="text-sm font-medium mb-2">{t('filters.timeframe')}</p>
              <div className="flex flex-wrap gap-2">
                <Link href={`${basePath}/athlete/history?timeframe=7days`}>
                  <Badge variant={timeframe === '7days' ? 'default' : 'outline'}>
                    {t('timeframes.sevenDays')}
                  </Badge>
                </Link>
                <Link href={`${basePath}/athlete/history?timeframe=30days`}>
                  <Badge variant={timeframe === '30days' ? 'default' : 'outline'}>
                    {t('timeframes.thirtyDays')}
                  </Badge>
                </Link>
                <Link href={`${basePath}/athlete/history?timeframe=3months`}>
                  <Badge variant={timeframe === '3months' ? 'default' : 'outline'}>
                    {t('timeframes.threeMonths')}
                  </Badge>
                </Link>
                <Link href={`${basePath}/athlete/history?timeframe=6months`}>
                  <Badge variant={timeframe === '6months' ? 'default' : 'outline'}>
                    {t('timeframes.sixMonths')}
                  </Badge>
                </Link>
                <Link href={`${basePath}/athlete/history?timeframe=1year`}>
                  <Badge variant={timeframe === '1year' ? 'default' : 'outline'}>
                    {t('timeframes.oneYear')}
                  </Badge>
                </Link>
              </div>
            </div>

            {/* Type filters */}
            <div className="flex-1">
              <p className="text-sm font-medium mb-2">{t('filters.trainingType')}</p>
              <div className="flex flex-wrap gap-2">
                <Link href={`${basePath}/athlete/history?timeframe=${timeframe}`}>
                  <Badge variant={!typeParam ? 'default' : 'outline'}>
                    {t('filters.all')}
                  </Badge>
                </Link>
                <Link href={`${basePath}/athlete/history?timeframe=${timeframe}&type=RUNNING`}>
                  <Badge variant={typeParam === 'RUNNING' ? 'default' : 'outline'}>
                    {t('workoutTypes.running')}
                  </Badge>
                </Link>
                <Link href={`${basePath}/athlete/history?timeframe=${timeframe}&type=CYCLING`}>
                  <Badge variant={typeParam === 'CYCLING' ? 'default' : 'outline'}>
                    {t('workoutTypes.cycling')}
                  </Badge>
                </Link>
                <Link href={`${basePath}/athlete/history?timeframe=${timeframe}&type=STRENGTH`}>
                  <Badge variant={typeParam === 'STRENGTH' ? 'default' : 'outline'}>
                    {t('workoutTypes.strength')}
                  </Badge>
                </Link>
                <Link href={`${basePath}/athlete/history?timeframe=${timeframe}&type=CARDIO`}>
                  <Badge variant={typeParam === 'CARDIO' ? 'default' : 'outline'}>
                    {t('workoutTypes.cardio')}
                  </Badge>
                </Link>
                <Link href={`${basePath}/athlete/history?timeframe=${timeframe}&type=HYBRID`}>
                  <Badge variant={typeParam === 'HYBRID' ? 'default' : 'outline'}>
                    {t('workoutTypes.hybrid')}
                  </Badge>
                </Link>
                <Link href={`${basePath}/athlete/history?timeframe=${timeframe}&type=AGILITY`}>
                  <Badge variant={typeParam === 'AGILITY' ? 'default' : 'outline'}>
                    {t('workoutTypes.agility')}
                  </Badge>
                </Link>
              </div>
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Personal Records */}
      <PersonalRecords athleteId={userId} variant="glass" />

      {/* Progress Charts */}
      <WorkoutHistoryCharts logs={chartLogs} timeframe={timeframe} variant="glass" />

      {/* Workout History */}
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle className="text-xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic">{t('table.title')}</GlassCardTitle>
          <GlassCardDescription className="text-slate-500 font-bold uppercase text-[9px] tracking-widest">
            {t('table.description')}
          </GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent>
          {historyItems.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/5">
              <Calendar className="h-16 w-16 mx-auto mb-6 opacity-10 text-slate-900 dark:text-white" />
              <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">{t('table.empty')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3 md:hidden">
                {historyItems.map((item) => (
                  <Link
                    key={item.id}
                    href={getItemHref(item, basePath)}
                    className="block rounded-[1.75rem] border border-slate-200 dark:border-white/5 bg-white dark:bg-white/5 p-4 transition-colors hover:bg-slate-50 dark:hover:bg-white/10"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
                            {item.name}
                          </p>
                          {getSourceBadge(item, t)}
                        </div>
                        <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                          {getHistorySubtitle(item, t)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-white/5 px-3 py-2 text-right">
                        <p className="text-xs font-black text-slate-900 dark:text-white">{format(new Date(item.date), 'd MMM', { locale: dateLocale })}</p>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{format(new Date(item.date), 'yyyy', { locale: dateLocale })}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {getHistoryMetaChips(item, formatWorkoutType).map((chip) => (
                        <span key={chip} className="inline-flex items-center rounded-full border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {chip}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-black/10 px-3 py-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t('table.distance')}</p>
                        <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">{item.distance ? `${item.distance.toFixed(1)} km` : '-'}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-black/10 px-3 py-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t('table.time')}</p>
                        <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">{item.duration ? `${item.duration} min` : '-'}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">RPE</p>
                        {item.perceivedEffort ? (
                          <div className={cn(
                            "mt-1 inline-flex h-8 w-8 items-center justify-center rounded-lg font-black text-xs",
                            getRPEBadgeClass(item.perceivedEffort)
                          )}>
                            {item.perceivedEffort}
                          </div>
                        ) : (
                          <span className="mt-1 inline-block text-sm font-black text-slate-300 dark:text-slate-700">-</span>
                        )}
                      </div>
                      {item.source === 'garmin' ? (
                        <GarminAttribution deviceModel={item.deviceName ?? null} className="justify-end" />
                      ) : (
                        <Button variant="ghost" className="h-10 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-white/5 px-4 text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 hover:border-blue-600 hover:bg-blue-600 hover:text-white">
                          {t('table.viewDetails')}
                        </Button>
                      )}
                    </div>
                  </Link>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200 dark:border-white/5 hover:bg-transparent">
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('table.date')}</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('table.workout')}</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('table.category')}</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('table.distance')}</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('table.time')}</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1 text-center">RPE</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">{t('table.action')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyItems.map((item) => (
                      <TableRow key={item.id} className="border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                        <TableCell className="py-5">
                          <div className="inline-flex flex-col rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-white/5 px-3 py-2">
                            <span className="font-black text-xs text-slate-900 dark:text-white">
                              {format(new Date(item.date), 'd MMM', { locale: dateLocale })}
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                              {format(new Date(item.date), 'yyyy', { locale: dateLocale })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-5">
                          <Link href={getItemHref(item, basePath)} className="block space-y-0.5">
                            <div className="font-black text-slate-900 dark:text-white uppercase italic tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex flex-wrap items-center gap-2">
                              {item.name}
                              {getSourceBadge(item, t)}
                            </div>
                            <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                              {getHistorySubtitle(item, t)}
                            </div>
                            <div className="flex flex-wrap gap-2 pt-2">
                              {getHistoryMetaChips(item, formatWorkoutType).map((chip) => (
                                <span key={chip} className="inline-flex items-center rounded-full border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                  {chip}
                                </span>
                              ))}
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell className="py-5">
                          <Badge className="bg-slate-100 dark:bg-white/5 border-0 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-lg h-6">
                            {formatWorkoutType(item.type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-5 font-black text-slate-900 dark:text-white text-xs">
                          {item.distance ? `${item.distance.toFixed(1)} km` : '-'}
                        </TableCell>
                        <TableCell className="py-5 font-black text-slate-900 dark:text-white text-xs">
                          {item.duration ? `${item.duration} min` : '-'}
                        </TableCell>
                        <TableCell className="py-5 text-center">
                          {item.perceivedEffort ? (
                            <div className={cn(
                              "inline-flex items-center justify-center w-8 h-8 rounded-lg font-black text-xs",
                              getRPEBadgeClass(item.perceivedEffort)
                            )}>
                              {item.perceivedEffort}
                            </div>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-700 font-black">-</span>
                          )}
                        </TableCell>
                        <TableCell className="py-5 text-right">
                          {item.source === 'garmin' ? (
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-[10px] text-slate-400">
                                {item.avgHR && (
                                  <span title={t('garmin.averageHeartRate')}>
                                    <Heart className="inline h-3 w-3 mr-0.5 text-red-400" />{Math.round(item.avgHR)} bpm
                                  </span>
                                )}
                                {item.maxHR && (
                                  <span title={t('garmin.maxHeartRate')} className="text-slate-500">
                                    {t('garmin.maxPrefix')} {Math.round(item.maxHR)}
                                  </span>
                                )}
                                {item.avgSpeed && item.distance && item.distance > 0 && (
                                  <span title={t('garmin.pace')}>
                                    {(() => {
                                      const paceSecPerKm = 1000 / item.avgSpeed!
                                      const min = Math.floor(paceSecPerKm / 60)
                                      const sec = Math.round(paceSecPerKm % 60)
                                      return `${min}:${sec.toString().padStart(2, '0')}/km`
                                    })()}
                                  </span>
                                )}
                                {item.avgPower && (
                                  <span title={t('garmin.averageWatts')}>
                                    <Zap className="inline h-3 w-3 mr-0.5 text-yellow-400" />{Math.round(item.avgPower)} W
                                  </span>
                                )}
                                {item.calories && (
                                  <span title={t('garmin.calories')}>
                                    {Math.round(item.calories)} kcal
                                  </span>
                                )}
                                {item.tss && (
                                  <span title="TSS" className="font-bold text-slate-300">
                                    TSS {Math.round(item.tss)}
                                  </span>
                                )}
                                {item.elevationGain && item.elevationGain > 0 && (
                                  <span title={t('garmin.elevationGain')}>
                                    ↑ {Math.round(item.elevationGain)} m
                                  </span>
                                )}
                              </div>
                              <GarminAttribution deviceModel={item.deviceName ?? null} className="justify-end" />
                            </div>
                          ) : (
                            <Link href={getItemHref(item, basePath)}>
                              <Button variant="ghost" className="h-8 rounded-lg font-black uppercase tracking-widest text-[9px] bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all">
                                {t('table.view')}
                              </Button>
                            </Link>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </GlassCardContent>
      </GlassCard>
    </div>
  )
}

function getHistorySubtitle(item: HistoryFeedItem, t: Awaited<ReturnType<typeof getTranslations>>): string {
  if (item.programName) return item.programName
  if (item.isAdHoc) return t('sources.customWorkout')
  // Brand guidelines: "Garmin Connect" is the app name, never a data source
  if (item.source === 'garmin') return item.deviceName || 'Garmin'
  if (item.source === 'wod') return t('sources.aiGeneratedWorkout')
  if (item.source === 'ai-chat') return t('sources.aiChatWorkout')
  if (item.source) return t('sources.studioWorkout')
  return '-'
}

function getSourceBadge(item: HistoryFeedItem, t: Awaited<ReturnType<typeof getTranslations>>) {
  if (item.isAdHoc) {
    return (
      <span className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
        <Plus className="h-2.5 w-2.5" />
        Ad-hoc
      </span>
    )
  }
  if (item.source === 'wod') {
    return (
      <span className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20">
        <Sparkles className="h-2.5 w-2.5" />
        {t('sources.aiWorkout')}
      </span>
    )
  }
  if (item.source === 'ai-chat') {
    return (
      <span className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20">
        <Sparkles className="h-2.5 w-2.5" />
        {t('sources.aiChat')}
      </span>
    )
  }
  if (item.source === 'garmin') {
    return (
      <span className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20">
        Garmin Connect
      </span>
    )
  }
  if (item.source) {
    return (
      <span className="inline-flex items-center text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20">
        Studio
      </span>
    )
  }
  return null
}

function getHistoryMetaChips(item: HistoryFeedItem, formatWorkoutType: (type: string) => string) {
  const chips = [formatWorkoutType(item.type)]
  if (item.distance) chips.push(`${item.distance.toFixed(1)} km`)
  if (item.duration) chips.push(`${item.duration} min`)
  if (item.perceivedEffort) chips.push(`RPE ${item.perceivedEffort}`)
  if (item.source === 'garmin') {
    if (item.avgHR) chips.push(`♥ ${Math.round(item.avgHR)} bpm`)
    if (item.avgPower) chips.push(`${Math.round(item.avgPower)} W`)
    if (item.calories) chips.push(`${Math.round(item.calories)} kcal`)
    if (item.tss) chips.push(`TSS ${Math.round(item.tss)}`)
  }
  return chips
}

function getItemHref(item: HistoryFeedItem, basePath: string): string {
  if (item.isAdHoc) return `${basePath}/athlete/ad-hoc/${item.id}`
  if (item.linkHref) return item.linkHref
  if (item.workoutId) return `${basePath}/athlete/workouts/${item.workoutId}`
  return `${basePath}/athlete/history`
}

function getRPEBadgeClass(rpe: number): string {
  if (rpe <= 3) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
  if (rpe <= 5) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400'
  if (rpe <= 7) return 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400'
  return 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-500'
}
