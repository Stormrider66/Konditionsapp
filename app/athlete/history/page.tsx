// app/athlete/history/page.tsx
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { subDays, subMonths, format } from 'date-fns'
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
} from 'lucide-react'
import { WorkoutHistoryCharts } from '@/components/athlete/WorkoutHistoryCharts'
import { PersonalRecords } from '@/components/athlete/PersonalRecords'
import { ExportDataButton } from '@/components/athlete/ExportDataButton'
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
  GlassCardDescription
} from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'
import { getLocale, getTranslations } from '@/i18n/server'
import type { Prisma } from '@prisma/client'

interface HistoryPageProps {
  searchParams: Promise<{
    timeframe?: string
    type?: string
  }>
}

interface ParsedAdHocHistory {
  name?: string
  type?: string
  sport?: string
  distance?: number
  duration?: number
  perceivedEffort?: number
}

export default async function WorkoutHistoryPage({ searchParams }: HistoryPageProps) {
  const { user, clientId } = await requireAthleteOrCoachInAthleteMode()
  const t = await getTranslations('pages.athlete.history')
  const locale = await getLocale()
  const dateLocale = locale === 'en' ? enUS : sv
  const params = await searchParams

  // Determine timeframe
  const now = new Date()
  let startDate: Date
  const timeframe = params.timeframe || '30days'

  switch (timeframe) {
    case '7days':
      startDate = subDays(now, 7)
      break
    case '30days':
      startDate = subDays(now, 30)
      break
    case '3months':
      startDate = subMonths(now, 3)
      break
    case '6months':
      startDate = subMonths(now, 6)
      break
    case '1year':
      startDate = subMonths(now, 12)
      break
    default:
      startDate = subDays(now, 30)
  }

  // Build where clause
  const whereClause: Prisma.WorkoutLogWhereInput = {
    athleteId: user.id,
    completed: true,
    completedAt: {
      gte: startDate,
      lte: now,
    },
  }

  // Fetch workout logs, ad-hoc workouts, and all 4 assignment types in parallel
  const [logs, adHocWorkouts, strengthAssignments, cardioAssignments, hybridAssignments, agilityAssignments, completedWODs] = await Promise.all([
    prisma.workoutLog.findMany({
      where: whereClause,
      include: {
        workout: {
          select: {
            id: true,
            name: true,
            type: true,
            intensity: true,
            distance: true,
            duration: true,
            day: {
              select: {
                week: {
                  select: {
                    program: {
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
      orderBy: {
        completedAt: 'desc',
      },
    }),
    // Fetch confirmed ad-hoc workouts
    prisma.adHocWorkout.findMany({
      where: {
        athleteId: clientId,
        status: 'CONFIRMED',
        workoutDate: {
          gte: startDate,
          lte: now,
        },
      },
      orderBy: {
        workoutDate: 'desc',
      },
    }),
    // Completed strength session assignments
    prisma.strengthSessionAssignment.findMany({
      where: {
        athleteId: clientId,
        status: 'COMPLETED',
        completedAt: { gte: startDate, lte: now },
      },
      include: {
        session: { select: { name: true } },
      },
      orderBy: { completedAt: 'desc' },
    }),
    // Completed cardio session assignments
    prisma.cardioSessionAssignment.findMany({
      where: {
        athleteId: clientId,
        status: 'COMPLETED',
        completedAt: { gte: startDate, lte: now },
      },
      include: {
        session: { select: { name: true, sport: true } },
      },
      orderBy: { completedAt: 'desc' },
    }),
    // Completed hybrid workout assignments
    prisma.hybridWorkoutAssignment.findMany({
      where: {
        athleteId: clientId,
        status: 'COMPLETED',
        completedAt: { gte: startDate, lte: now },
      },
      include: {
        workout: { select: { name: true, format: true } },
      },
      orderBy: { completedAt: 'desc' },
    }),
    // Completed agility workout assignments
    prisma.agilityWorkoutAssignment.findMany({
      where: {
        athleteId: clientId,
        status: 'COMPLETED',
        completedAt: { gte: startDate, lte: now },
      },
      include: {
        workout: { select: { name: true } },
      },
      orderBy: { completedAt: 'desc' },
    }),
    // Completed AI-generated WODs
    prisma.aIGeneratedWOD.findMany({
      where: {
        clientId: clientId,
        status: 'COMPLETED',
        completedAt: { gte: startDate, lte: now },
      },
      select: {
        id: true,
        title: true,
        primarySport: true,
        actualDuration: true,
        requestedDuration: true,
        sessionRPE: true,
        completedAt: true,
        source: true,
      },
      orderBy: { completedAt: 'desc' },
    }),
  ])

  // Parse ad-hoc workout data
  const adHocWithParsedData = adHocWorkouts.map((adHoc) => {
    const parsed = adHoc.parsedStructure as ParsedAdHocHistory | null
    return {
      id: adHoc.id,
      workoutDate: adHoc.workoutDate,
      name: parsed?.name || adHoc.workoutName || t('fallbackAdHocName'),
      type: parsed?.type || 'OTHER',
      sport: parsed?.sport,
      distance: parsed?.distance,
      duration: parsed?.duration,
      perceivedEffort: parsed?.perceivedEffort,
      isAdHoc: true,
      inputType: adHoc.inputType,
    }
  })

  // Map assignment items for stats and merging
  const strengthItems = strengthAssignments.map((a) => ({
    id: a.id,
    date: a.completedAt!,
    name: a.session.name,
    type: 'STRENGTH' as const,
    duration: a.duration || null, // already in minutes
    perceivedEffort: a.rpe || null,
    distance: null as number | null,
    source: 'strength-assignment' as const,
    linkHref: `/athlete/workout/${a.id}`,
  }))

  const cardioItems = cardioAssignments.map((a) => ({
    id: a.id,
    date: a.completedAt!,
    name: a.session.name,
    type: 'CARDIO' as const,
    duration: a.actualDuration ? Math.round(a.actualDuration / 60) : null, // seconds → minutes
    perceivedEffort: null as number | null,
    distance: a.actualDistance ? a.actualDistance / 1000 : null, // meters → km
    source: 'cardio-assignment' as const,
    linkHref: `/athlete/cardio`,
  }))

  const hybridItems = hybridAssignments.map((a) => ({
    id: a.id,
    date: a.completedAt!,
    name: a.workout.name,
    type: 'HYBRID' as const,
    duration: null as number | null,
    perceivedEffort: null as number | null,
    distance: null as number | null,
    source: 'hybrid-assignment' as const,
    linkHref: `/athlete/hybrid/${a.id}`,
  }))

  const agilityItems = agilityAssignments.map((a) => ({
    id: a.id,
    date: a.completedAt!,
    name: a.workout.name,
    type: 'AGILITY' as const,
    duration: null as number | null,
    perceivedEffort: null as number | null,
    distance: null as number | null,
    source: 'agility-assignment' as const,
    linkHref: `/athlete/agility/${a.id}`,
  }))

  const allAssignmentItems = [...strengthItems, ...cardioItems, ...hybridItems, ...agilityItems]

  // Map completed WODs
  const wodItems = completedWODs.map((wod) => ({
    id: wod.id,
    date: wod.completedAt!,
    name: wod.title,
    type: wod.primarySport || 'OTHER',
    duration: wod.actualDuration || wod.requestedDuration || null,
    perceivedEffort: wod.sessionRPE || null,
    distance: null as number | null,
    source: wod.source === 'chat' ? 'ai-chat' : 'wod',
    linkHref: `/athlete/wod/${wod.id}`,
  }))

  // Calculate stats (including ad-hoc workouts, assignments, and WODs)
  const totalWorkouts = logs.length + adHocWorkouts.length + allAssignmentItems.length + wodItems.length
  const totalDistance = logs.reduce((sum, log) => sum + (log.distance || 0), 0) +
    adHocWithParsedData.reduce((sum, w) => sum + (w.distance || 0), 0) +
    allAssignmentItems.reduce((sum, a) => sum + (a.distance || 0), 0)
  const totalDuration = logs.reduce((sum, log) => sum + (log.duration || 0), 0) +
    adHocWithParsedData.reduce((sum, w) => sum + (w.duration || 0), 0) +
    allAssignmentItems.reduce((sum, a) => sum + (a.duration || 0), 0) +
    wodItems.reduce((sum, w) => sum + (w.duration || 0), 0)

  const allEfforts = [
    ...logs.filter(log => log.perceivedEffort).map(log => log.perceivedEffort!),
    ...adHocWithParsedData.filter(w => w.perceivedEffort).map(w => w.perceivedEffort!),
    ...allAssignmentItems.filter(a => a.perceivedEffort).map(a => a.perceivedEffort!),
    ...wodItems.filter(w => w.perceivedEffort).map(w => w.perceivedEffort!),
  ]
  const avgRPE = allEfforts.length > 0
    ? (allEfforts.reduce((sum, e) => sum + e, 0) / allEfforts.length).toFixed(1)
    : '-'
  const chartLogs = logs.filter((log): log is (typeof logs)[number] & { completedAt: Date } => log.completedAt !== null)
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
    }
    return types[type] || type
  }

  // Create merged and sorted history list
  interface HistoryItem {
    id: string
    date: Date
    name: string
    type: string
    programName?: string
    distance?: number | null
    duration?: number | null
    perceivedEffort?: number | null
    isAdHoc: boolean
    inputType?: string
    workoutId?: string
    source?: string
    linkHref?: string
  }

  const historyItems: HistoryItem[] = [
    ...logs.map((log) => ({
      id: log.id,
      date: log.completedAt!,
      name: log.workout.name,
      type: log.workout.type,
      programName: log.workout.day.week.program.name,
      distance: log.distance,
      duration: log.duration,
      perceivedEffort: log.perceivedEffort,
      isAdHoc: false,
      workoutId: log.workout.id,
    })),
    ...adHocWithParsedData.map((w) => ({
      id: w.id,
      date: w.workoutDate,
      name: w.name,
      type: w.type === 'CARDIO' && w.sport ? w.sport : w.type,
      programName: undefined,
      distance: w.distance,
      duration: w.duration,
      perceivedEffort: w.perceivedEffort,
      isAdHoc: true,
      inputType: w.inputType,
    })),
    ...allAssignmentItems.map((a) => ({
      id: a.id,
      date: a.date,
      name: a.name,
      type: a.type,
      programName: undefined,
      distance: a.distance,
      duration: a.duration,
      perceivedEffort: a.perceivedEffort,
      isAdHoc: false,
      source: a.source,
      linkHref: a.linkHref,
    })),
    ...wodItems.map((w) => ({
      id: w.id,
      date: w.date,
      name: w.name,
      type: w.type,
      programName: undefined,
      distance: w.distance,
      duration: w.duration,
      perceivedEffort: w.perceivedEffort,
      isAdHoc: false,
      source: w.source,
      linkHref: w.linkHref,
    })),
  ]
    .filter((item) => !params.type || item.type === params.type)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="min-h-screen pb-20 pt-6 px-4 max-w-7xl mx-auto">
      <Link href="/athlete/dashboard">
        <Button variant="ghost" className="mb-8 font-black uppercase tracking-widest text-[10px] text-slate-500 hover:text-white">
          <ArrowLeft className="mr-2 h-3.5 w-3.5" />
          {t('back')}
        </Button>
      </Link>

      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="space-y-2">
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tighter uppercase italic leading-none">
            {t('titlePrefix')}<span className="text-blue-600">{t('titleAccent')}</span>
          </h1>
          <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px]">
            {t('description')}
          </p>
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
            <div className="text-3xl font-black text-white">{totalWorkouts}</div>
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
            <div className="text-3xl font-black text-white">{totalDistance.toFixed(1)}</div>
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
            <div className="text-3xl font-black text-white">
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
            <div className="text-3xl font-black text-white">{avgRPE}</div>
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
                <Link href="/athlete/history?timeframe=7days">
                  <Badge variant={timeframe === '7days' ? 'default' : 'outline'}>
                    {t('timeframes.sevenDays')}
                  </Badge>
                </Link>
                <Link href="/athlete/history?timeframe=30days">
                  <Badge variant={timeframe === '30days' ? 'default' : 'outline'}>
                    {t('timeframes.thirtyDays')}
                  </Badge>
                </Link>
                <Link href="/athlete/history?timeframe=3months">
                  <Badge variant={timeframe === '3months' ? 'default' : 'outline'}>
                    {t('timeframes.threeMonths')}
                  </Badge>
                </Link>
                <Link href="/athlete/history?timeframe=6months">
                  <Badge variant={timeframe === '6months' ? 'default' : 'outline'}>
                    {t('timeframes.sixMonths')}
                  </Badge>
                </Link>
                <Link href="/athlete/history?timeframe=1year">
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
                <Link href={`/athlete/history?timeframe=${timeframe}`}>
                  <Badge variant={!params.type ? 'default' : 'outline'}>
                    {t('filters.all')}
                  </Badge>
                </Link>
                <Link href={`/athlete/history?timeframe=${timeframe}&type=RUNNING`}>
                  <Badge variant={params.type === 'RUNNING' ? 'default' : 'outline'}>
                    {t('workoutTypes.running')}
                  </Badge>
                </Link>
                <Link href={`/athlete/history?timeframe=${timeframe}&type=CYCLING`}>
                  <Badge variant={params.type === 'CYCLING' ? 'default' : 'outline'}>
                    {t('workoutTypes.cycling')}
                  </Badge>
                </Link>
                <Link href={`/athlete/history?timeframe=${timeframe}&type=STRENGTH`}>
                  <Badge variant={params.type === 'STRENGTH' ? 'default' : 'outline'}>
                    {t('workoutTypes.strength')}
                  </Badge>
                </Link>
                <Link href={`/athlete/history?timeframe=${timeframe}&type=CARDIO`}>
                  <Badge variant={params.type === 'CARDIO' ? 'default' : 'outline'}>
                    {t('workoutTypes.cardio')}
                  </Badge>
                </Link>
                <Link href={`/athlete/history?timeframe=${timeframe}&type=HYBRID`}>
                  <Badge variant={params.type === 'HYBRID' ? 'default' : 'outline'}>
                    {t('workoutTypes.hybrid')}
                  </Badge>
                </Link>
                <Link href={`/athlete/history?timeframe=${timeframe}&type=AGILITY`}>
                  <Badge variant={params.type === 'AGILITY' ? 'default' : 'outline'}>
                    {t('workoutTypes.agility')}
                  </Badge>
                </Link>
              </div>
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Personal Records */}
      <PersonalRecords athleteId={user.id} variant="glass" />

      {/* Progress Charts */}
      <WorkoutHistoryCharts logs={chartLogs} timeframe={timeframe} variant="glass" />

      {/* Workout History */}
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle className="text-xl font-black tracking-tight text-white uppercase italic">{t('table.title')}</GlassCardTitle>
          <GlassCardDescription className="text-slate-500 font-bold uppercase text-[9px] tracking-widest">
            {t('table.description')}
          </GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent>
          {historyItems.length === 0 ? (
            <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5">
              <Calendar className="h-16 w-16 mx-auto mb-6 opacity-10 text-white" />
              <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">{t('table.empty')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3 md:hidden">
                {historyItems.map((item) => (
                  <Link
                    key={item.id}
                    href={getItemHref(item)}
                    className="block rounded-[1.75rem] border border-white/5 bg-white/5 p-4 transition-colors hover:bg-white/10"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-black uppercase italic tracking-tight text-white">
                            {item.name}
                          </p>
                          {getSourceBadge(item, t)}
                        </div>
                        <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                          {getHistorySubtitle(item, t)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/5 bg-white/5 px-3 py-2 text-right">
                        <p className="text-xs font-black text-white">{format(new Date(item.date), 'd MMM', { locale: dateLocale })}</p>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{format(new Date(item.date), 'yyyy', { locale: dateLocale })}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {getHistoryMetaChips(item, formatWorkoutType).map((chip) => (
                        <span key={chip} className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">
                          {chip}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-white/5 bg-black/10 px-3 py-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t('table.distance')}</p>
                        <p className="mt-1 text-sm font-black text-white">{item.distance ? `${item.distance.toFixed(1)} km` : '-'}</p>
                      </div>
                      <div className="rounded-2xl border border-white/5 bg-black/10 px-3 py-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t('table.time')}</p>
                        <p className="mt-1 text-sm font-black text-white">{item.duration ? `${item.duration} min` : '-'}</p>
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
                          <span className="mt-1 inline-block text-sm font-black text-slate-700">-</span>
                        )}
                      </div>
                      <Button variant="ghost" className="h-10 rounded-xl border border-white/5 bg-white/5 px-4 text-[10px] font-black uppercase tracking-widest text-slate-200 hover:border-blue-600 hover:bg-blue-600 hover:text-white">
                        {t('table.viewDetails')}
                      </Button>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5 hover:bg-transparent">
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
                      <TableRow key={item.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                        <TableCell className="py-5">
                          <div className="inline-flex flex-col rounded-2xl border border-white/5 bg-white/5 px-3 py-2">
                            <span className="font-black text-xs text-white">
                              {format(new Date(item.date), 'd MMM', { locale: dateLocale })}
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                              {format(new Date(item.date), 'yyyy', { locale: dateLocale })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-5">
                          <Link href={getItemHref(item)} className="block space-y-0.5">
                            <div className="font-black text-white uppercase italic tracking-tight group-hover:text-blue-400 transition-colors flex flex-wrap items-center gap-2">
                              {item.name}
                              {getSourceBadge(item, t)}
                            </div>
                            <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                              {getHistorySubtitle(item, t)}
                            </div>
                            <div className="flex flex-wrap gap-2 pt-2">
                              {getHistoryMetaChips(item, formatWorkoutType).map((chip) => (
                                <span key={chip} className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">
                                  {chip}
                                </span>
                              ))}
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell className="py-5">
                          <Badge className="bg-white/5 border-0 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-lg h-6">
                            {formatWorkoutType(item.type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-5 font-black text-white text-xs">
                          {item.distance ? `${item.distance.toFixed(1)} km` : '-'}
                        </TableCell>
                        <TableCell className="py-5 font-black text-white text-xs">
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
                            <span className="text-slate-700 font-black">-</span>
                          )}
                        </TableCell>
                        <TableCell className="py-5 text-right">
                          <Link href={getItemHref(item)}>
                            <Button variant="ghost" className="h-8 rounded-lg font-black uppercase tracking-widest text-[9px] bg-white/5 border border-white/5 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all">
                              {t('table.view')}
                            </Button>
                          </Link>
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

function getHistorySubtitle(item: {
  isAdHoc: boolean
  programName?: string
  source?: string
}, t: Awaited<ReturnType<typeof getTranslations>>): string {
  if (item.programName) return item.programName
  if (item.isAdHoc) return t('sources.customWorkout')
  if (item.source === 'wod') return t('sources.aiGeneratedWorkout')
  if (item.source === 'ai-chat') return t('sources.aiChatWorkout')
  if (item.source) return t('sources.studioWorkout')
  return '-'
}

function getSourceBadge(item: {
  isAdHoc: boolean
  source?: string
}, t: Awaited<ReturnType<typeof getTranslations>>) {
  if (item.isAdHoc) {
    return (
      <span className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <Plus className="h-2.5 w-2.5" />
        Ad-hoc
      </span>
    )
  }
  if (item.source === 'wod') {
    return (
      <span className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
        <Sparkles className="h-2.5 w-2.5" />
        {t('sources.aiWorkout')}
      </span>
    )
  }
  if (item.source === 'ai-chat') {
    return (
      <span className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
        <Sparkles className="h-2.5 w-2.5" />
        {t('sources.aiChat')}
      </span>
    )
  }
  if (item.source) {
    return (
      <span className="inline-flex items-center text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
        Studio
      </span>
    )
  }
  return null
}

function getHistoryMetaChips(item: {
  type: string
  distance?: number | null
  duration?: number | null
  perceivedEffort?: number | null
}, formatWorkoutType: (type: string) => string) {
  const chips = [formatWorkoutType(item.type)]
  if (item.distance) chips.push(`${item.distance.toFixed(1)} km`)
  if (item.duration) chips.push(`${item.duration} min`)
  if (item.perceivedEffort) chips.push(`RPE ${item.perceivedEffort}`)
  return chips
}

function getItemHref(item: { isAdHoc: boolean; id: string; linkHref?: string; workoutId?: string }): string {
  if (item.isAdHoc) return `/athlete/ad-hoc/${item.id}`
  if (item.linkHref) return item.linkHref
  if (item.workoutId) return `/athlete/workouts/${item.workoutId}`
  return `/athlete/history`
}

function getRPEBadgeClass(rpe: number): string {
  if (rpe <= 3) return 'bg-emerald-500/10 text-emerald-400'
  if (rpe <= 5) return 'bg-yellow-500/10 text-yellow-400'
  if (rpe <= 7) return 'bg-orange-500/10 text-orange-400'
  return 'bg-red-500/10 text-red-500'
}
