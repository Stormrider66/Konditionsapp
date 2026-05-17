// app/athlete/workouts/[id]/page.tsx
import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, CheckCircle2, Clock, MapPin, Calendar, Edit, Info, Activity, Zap, Trophy, Utensils } from 'lucide-react'
import { format } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import { WorkoutSegments } from '@/components/athlete/workout/WorkoutSegments'
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
} from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'
import { getLocale, getTranslations } from '@/i18n/server'

interface WorkoutDetailPageProps {
  params: Promise<{
    id: string
  }>
}

interface CompletedLogSummary {
  duration?: number | null
  distance?: number | null
  avgPace?: string | null
  avgHR?: number | null
  perceivedEffort?: number | null
}

interface RaceResultSummary {
  timeFormatted?: string | null
  distance?: string | null
  customDistanceKm?: number | null
}

export default async function WorkoutDetailPage({ params }: WorkoutDetailPageProps) {
  const { user, clientId } = await requireAthleteOrCoachInAthleteMode()
  const t = await getTranslations('pages.athlete.workoutDetail')
  const locale = await getLocale()
  const dateLocale = locale === 'en' ? enUS : sv
  const { id } = await params

  // Fetch workout with full details
  const workout = await prisma.workout.findFirst({
    where: {
      id: id,
    },
    include: {
      day: {
        include: {
          week: {
            include: {
              program: {
                select: {
                  id: true,
                  name: true,
                  clientId: true,
                  startDate: true,
                },
              },
            },
          },
        },
      },
      segments: {
        orderBy: {
          order: 'asc',
        },
        include: {
          exercise: true,
        },
      },
      logs: {
        where: {
          athleteId: user.id,
        },
        include: {
          fuelingLog: true,
        },
        orderBy: {
          completedAt: 'desc',
        },
        take: 1,
      },
      fuelingPrescription: true,
    },
  })

  if (!workout || !workout.day.week.program) {
    notFound()
  }

  // Verify athlete has access to this program
  if (workout.day.week.program.clientId !== clientId) {
    notFound()
  }

  const existingLog = workout.logs[0]
  const isCompleted = existingLog && existingLog.completed
  const raceResult = await prisma.raceResult.findFirst({
    where: {
      clientId,
      trainingProgramId: workout.day.week.program.id,
    },
    orderBy: {
      raceDate: 'desc',
    },
  })
  const intervalResults = Array.isArray(existingLog?.intervalResults)
    ? existingLog.intervalResults as Array<Record<string, unknown>>
    : []
  const formatEffortLabel = (effort: number): string => {
    if (effort <= 2) return t('effortLabels.veryEasy')
    if (effort <= 4) return t('effortLabels.easy')
    if (effort <= 6) return t('effortLabels.moderate')
    if (effort <= 8) return t('effortLabels.hard')
    return t('effortLabels.max')
  }
  const formatDifficultyLabel = (difficulty: number): string => {
    if (difficulty <= 3) return t('difficultyLabels.easierThanPlanned')
    if (difficulty <= 5) return t('difficultyLabels.asPlanned')
    if (difficulty <= 7) return t('difficultyLabels.tough')
    return t('difficultyLabels.veryTough')
  }
  const formatRaceDistanceLabel = (distance?: string | null, customDistanceKm?: number | null): string => {
    const map: Record<string, string> = {
      '5K': t('raceDistances.5k'),
      '10K': t('raceDistances.10k'),
      HALF_MARATHON: t('raceDistances.halfMarathon'),
      MARATHON: t('raceDistances.marathon'),
      CUSTOM: customDistanceKm ? t('raceDistances.customWithDistance', { distance: customDistanceKm }) : t('raceDistances.custom'),
    }
    return map[distance || ''] || distance || t('raceResult')
  }
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
    }
    return types[type] || type
  }
  const formatIntensity = (intensity: string): string => {
    const intensities: Record<string, string> = {
      RECOVERY: t('intensities.recovery'),
      EASY: t('intensities.easy'),
      MODERATE: t('intensities.moderate'),
      THRESHOLD: t('intensities.threshold'),
      INTERVAL: t('intensities.interval'),
      MAX: t('intensities.max'),
    }
    return intensities[intensity] || intensity
  }
  const completedHighlights = getCompletedHighlights(existingLog, raceResult, t, formatEffortLabel, formatRaceDistanceLabel)

  // Calculate workout date
  const programStartDate = new Date(workout.day.week.program.startDate)
  const dayOffset = (workout.day.week.weekNumber - 1) * 7 + (workout.day.dayNumber - 1)
  const workoutDate = new Date(programStartDate)
  workoutDate.setDate(workoutDate.getDate() + dayOffset)

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 pb-20 pt-4 sm:pt-6">
      <Link href={`/athlete/programs/${workout.day.week.program.id}`}>
        <Button variant="ghost" className="mb-6 px-2 font-black uppercase tracking-widest text-[10px] text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors sm:mb-8">
          <ArrowLeft className="mr-2 h-3.5 w-3.5" />
          {t('programOverview')}
        </Button>
      </Link>

      <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-700 sm:mb-10">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:mb-8 sm:flex-row sm:items-end sm:gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-black leading-none tracking-tighter text-slate-900 transition-colors dark:text-white sm:text-5xl">
              {workout.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-colors dark:text-slate-500 sm:gap-3 sm:text-[11px]">
              <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-500 transition-colors" />
              <span>
                {format(workoutDate, 'EEEE d MMM yyyy', { locale: dateLocale })}
              </span>
              <span className="text-slate-400 dark:text-slate-700">•</span>
              <span>
                {t('week')} <span className="text-slate-900 dark:text-white transition-colors">{workout.day.week.weekNumber}</span>, {t('day')} <span className="text-slate-900 dark:text-white transition-colors">{workout.day.dayNumber}</span>
              </span>
            </div>
          </div>
          {isCompleted && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-100 border border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400 transition-colors">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">{t('completed')}</span>
            </div>
          )}
        </div>
      </div>

      <div className="mb-8 flex flex-wrap gap-2 sm:gap-3">
        <Badge variant="outline" className="h-8 rounded-xl border-slate-200 bg-slate-100 px-3 text-xs font-bold text-slate-700 transition-colors dark:border-white/10 dark:bg-white/5 dark:text-white sm:h-9 sm:px-4">
          {formatWorkoutType(workout.type)}
        </Badge>
        <Badge variant="outline" className={cn("h-8 rounded-xl border-0 px-3 text-xs font-bold transition-colors sm:h-9 sm:px-4", getIntensityBadgeClass(workout.intensity, true))}>
          {formatIntensity(workout.intensity)}
        </Badge>
        <Badge variant="outline" className="h-8 rounded-xl border-slate-200 bg-slate-100 px-3 text-xs font-bold text-slate-700 transition-colors dark:border-white/10 dark:bg-white/5 dark:text-white sm:h-9 sm:px-4">
          {workout.day.week.program.name}
        </Badge>
      </div>

      {/* Workout Info Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
        <GlassCard className="md:col-span-2">
          <GlassCardHeader className="pb-3">
            <GlassCardTitle className="text-lg font-black tracking-tight flex items-center gap-2 text-slate-900 dark:text-white transition-colors">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-500 transition-colors" />
              {t('instructions')}
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="flex items-center gap-3 mb-6">
              <Badge variant="outline" className="rounded-lg h-7 bg-slate-100 border-slate-200 text-slate-700 dark:bg-white/5 dark:border-white/10 dark:text-white font-bold px-3 transition-colors">
                {formatWorkoutType(workout.type)}
              </Badge>
              <Badge variant="outline" className={cn("rounded-lg h-7 border-0 font-bold px-3 transition-colors", getIntensityBadgeClass(workout.intensity, true))}>
                {formatIntensity(workout.intensity)}
              </Badge>
            </div>

            {workout.instructions ? (
              <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed font-medium transition-colors">
                {workout.instructions}
              </p>
            ) : (
              <p className="text-slate-500 dark:text-slate-500 italic transition-colors">{t('noInstructions')}</p>
            )}
          </GlassCardContent>
        </GlassCard>

        <div className="space-y-4 sm:space-y-6">
          <GlassCard>
            <GlassCardHeader className="pb-3">
              <GlassCardTitle className="text-lg font-black tracking-tight flex items-center gap-2 text-blue-600 dark:text-blue-400 transition-colors">
                <Zap className="h-4 w-4" />
                {t('plannedGoals')}
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="space-y-4 sm:space-y-6">
              {workout.duration && (
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border-blue-100 dark:bg-blue-500/10 dark:border-blue-500/10 flex items-center justify-center border transition-colors">
                    <Clock className="h-5 w-5 text-blue-600 dark:text-blue-500 transition-colors" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-colors">{t('time')}</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white transition-colors">{workout.duration} min</p>
                  </div>
                </div>
              )}
              {workout.distance && (
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/10 flex items-center justify-center border transition-colors">
                    <MapPin className="h-5 w-5 text-emerald-600 dark:text-emerald-500 transition-colors" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-colors">{t('distance')}</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white transition-colors">{workout.distance} km</p>
                  </div>
                </div>
              )}
              {workout.fuelingPrescription && (
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/10 flex items-center justify-center border transition-colors">
                    <Utensils className="h-5 w-5 text-amber-600 dark:text-amber-500 transition-colors" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-colors">{t('carbs')}</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white transition-colors">
                      {Math.round(workout.fuelingPrescription.targetCarbsGPerHour)} g/h
                    </p>
                  </div>
                </div>
              )}
            </GlassCardContent>
          </GlassCard>

          {!isCompleted && (
            <Link href={`/athlete/workouts/${workout.id}/log`} className="block">
              <Button className="w-full h-16 rounded-3xl bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-sm shadow-[0_10px_30px_rgba(37,99,235,0.2)] transition-all hover:scale-[1.02] active:scale-[0.98]">
                {t('logWorkout')}
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Workout Structure with Lactate Capture Buttons */}
      {workout.segments && workout.segments.length > 0 && (
        <div className="mb-6">
          <WorkoutSegments
            segments={workout.segments}
            workoutId={workout.id}
            clientId={clientId}
            workoutName={workout.name}
            variant="glass"
          />
        </div>
      )}

      {/* Completed Workout Log */}
      {existingLog && (
        <GlassCard className="mb-8 border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/5 transition-colors">
          <GlassCardHeader>
            <div className="flex items-center justify-between">
              <GlassCardTitle className="text-xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic transition-colors">{t('completedLog')}</GlassCardTitle>
              <Link href={`/athlete/workouts/${workout.id}/log`}>
                <Button variant="ghost" size="sm" className="h-9 px-4 rounded-xl font-black uppercase tracking-widest text-[9px] bg-white border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 dark:text-slate-300 transition-colors">
                  <Edit className="mr-2 h-3.5 w-3.5" />
                  {t('edit')}
                </Button>
              </Link>
            </div>
          </GlassCardHeader>
          <GlassCardContent className="space-y-6 sm:space-y-8">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 sm:gap-4">
              {completedHighlights.map((highlight) => (
                <div key={highlight.label} className="rounded-2xl border border-emerald-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 p-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-colors">{highlight.label}</p>
                  <p className="mt-1 text-xl font-black text-slate-900 dark:text-white transition-colors">{highlight.value}</p>
                  {highlight.subvalue ? (
                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-500 mt-1">{highlight.subvalue}</p>
                  ) : null}
                </div>
              ))}
            </div>

            {intervalResults.length > 0 && (
              <div className="pt-6 border-t border-slate-200 dark:border-white/10 transition-colors">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3 transition-colors">{t('intervalSplits')}</p>
                <div className="space-y-3">
                  {intervalResults.map((segment, segmentIndex) => {
                    const reps = Array.isArray(segment.reps) ? segment.reps as Array<Record<string, unknown>> : []
                    if (reps.length === 0) return null

                    return (
                      <div key={`${segmentIndex}-${String(segment.segmentId || 'segment')}`} className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-4 transition-colors">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 transition-colors">
                          {typeof segment.segmentLabel === 'string' ? segment.segmentLabel : t('block', { number: segmentIndex + 1 })}
                        </p>
                        <div className="space-y-2">
                          {reps.map((rep, repIndex) => (
                            <div key={`${segmentIndex}-${repIndex}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                              <span className="text-slate-900 dark:text-white">{t('rep', { number: typeof rep.repNumber === 'number' ? rep.repNumber : repIndex + 1 })}</span>
                              {typeof rep.duration === 'number' ? <span>{t('time')} {formatDuration(rep.duration)}</span> : null}
                              {typeof rep.distance === 'number' ? <span>{t('distance')} {rep.distance} km</span> : null}
                              {typeof rep.pace === 'string' ? <span>{t('pace')} {rep.pace}</span> : null}
                              {typeof rep.avgHR === 'number' ? <span>{t('pulse')} {rep.avgHR} bpm</span> : null}
                              {typeof rep.avgPower === 'number' ? <span>{t('power')} {rep.avgPower} W</span> : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {raceResult?.timeFormatted && (
              <div className="pt-6 border-t border-slate-200 dark:border-white/10 transition-colors">
                <div className="rounded-[1.75rem] border border-red-100 bg-red-50 p-4 transition-colors dark:border-red-600/20 dark:bg-red-600/10 sm:rounded-[2rem] sm:p-6">
                  <div className="flex gap-4">
                    <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-600/20 items-center justify-center shrink-0 border border-red-200 dark:border-red-600/20 transition-colors">
                      <Trophy className="h-6 w-6 text-red-600 dark:text-red-500 transition-colors" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-black text-red-600 dark:text-red-500 text-[10px] uppercase tracking-[0.2em] transition-colors">{t('raceResult')}</p>
                        <span className="text-[8px] font-black text-slate-500 dark:text-slate-600 uppercase transition-colors">{formatRaceDistanceLabel(raceResult.distance, raceResult.customDistanceKm)}</span>
                      </div>
                      <p className="text-red-900 dark:text-red-100 text-2xl font-black transition-colors">
                        {raceResult.timeFormatted}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {raceResult.goalTime ? (
                          <Badge variant="outline" className="rounded-lg bg-white border-red-200 text-red-700 dark:bg-white/5 dark:border-red-500/20 dark:text-red-300 font-bold">
                            {t('goal', { value: raceResult.goalTime })}
                          </Badge>
                        ) : null}
                        {raceResult.avgPace ? (
                          <Badge variant="outline" className="rounded-lg bg-white border-red-200 text-red-700 dark:bg-white/5 dark:border-red-500/20 dark:text-red-300 font-bold">
                            {t('pace')} {raceResult.avgPace}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {(existingLog.perceivedEffort || existingLog.difficulty) && (
              <div className="pt-6 border-t border-slate-200 dark:border-white/10 transition-colors">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                  {existingLog.perceivedEffort && (
                    <div className="space-y-2">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-colors">{t('perceivedEffort')}</p>
                      <div className={cn(
                        "inline-flex items-center h-10 px-4 rounded-2xl border font-bold text-sm transition-colors",
                        getEffortBadgeClass(existingLog.perceivedEffort, true)
                      )}>
                        {existingLog.perceivedEffort}/10 — {formatEffortLabel(existingLog.perceivedEffort)}
                      </div>
                    </div>
                  )}
                  {existingLog.difficulty && (
                    <div className="space-y-2">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-colors">{t('emotionalDifficulty')}</p>
                      <div className="inline-flex items-center h-10 px-4 rounded-2xl border border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white font-bold text-sm transition-colors">
                        {existingLog.difficulty}/10 — {formatDifficultyLabel(existingLog.difficulty)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {existingLog.feeling && (
              <div className="pt-6 border-t border-slate-200 dark:border-white/10 transition-colors">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500 mb-2 transition-colors">{t('feeling')}</p>
                <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed italic transition-colors">&quot;{existingLog.feeling}&quot;</p>
              </div>
            )}

            {existingLog.notes && (
              <div className="pt-6 border-t border-slate-200 dark:border-white/10 transition-colors">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500 mb-2 transition-colors">{t('notes')}</p>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-600 dark:bg-white/5 dark:border-white/5 dark:text-slate-400 text-sm whitespace-pre-wrap leading-relaxed transition-colors">
                  {existingLog.notes}
                </div>
              </div>
            )}

            {(existingLog.stravaUrl || existingLog.dataFileUrl) && (
              <div className="pt-6 border-t border-slate-200 dark:border-white/10 transition-colors">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500 mb-3 transition-colors">{t('integrationsData')}</p>
                <div className="flex flex-wrap gap-3">
                  {existingLog.stravaUrl && (
                    <a href={existingLog.stravaUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm" className="h-10 px-5 rounded-xl bg-[#FC642D]/10 border border-[#FC642D]/20 text-[#FC642D] hover:bg-[#FC642D]/20 font-black uppercase tracking-widest text-[10px]">
                        {t('viewOnStrava')}
                      </Button>
                    </a>
                  )}
                  {existingLog.dataFileUrl && (
                    <a href={existingLog.dataFileUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm" className="h-10 px-5 rounded-xl bg-slate-100 border-slate-200 text-slate-600 dark:bg-white/10 dark:border-white/20 dark:text-white font-black uppercase tracking-widest text-[10px] transition-colors">
                        {t('dataFile')}
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            )}

            {existingLog.coachFeedback && (
              <div className="pt-6 border-t border-slate-200 dark:border-white/10 transition-colors">
                <div className="bg-blue-50 border border-blue-100 dark:bg-blue-600/10 dark:border-blue-600/20 rounded-[2rem] p-6 shadow-lg shadow-blue-600/5 transition-colors">
                  <div className="flex gap-4">
                    <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-600/20 items-center justify-center shrink-0 border border-blue-200 dark:border-blue-600/20 transition-colors">
                      <Activity className="h-6 w-6 text-blue-600 dark:text-blue-500 transition-colors" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-black text-blue-600 dark:text-blue-500 text-[10px] uppercase tracking-[0.2em] transition-colors">{t('coachFeedback')}</p>
                        <span className="text-[8px] font-black text-slate-500 dark:text-slate-600 uppercase transition-colors">{t('privateLog')}</span>
                      </div>
                      <p className="text-blue-900 dark:text-blue-100 text-sm font-medium leading-relaxed whitespace-pre-wrap transition-colors">
                        {existingLog.coachFeedback}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 border-t border-slate-200 pt-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 transition-colors dark:border-white/5 dark:text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <span>{t('timestamp')}</span>
              <span>{existingLog.completedAt ? format(new Date(existingLog.completedAt), 'PPP HH:mm', { locale: dateLocale }) : '-'}</span>
            </div>
          </GlassCardContent>
        </GlassCard>
      )}

      {/* Action Buttons */}
      <div className="mt-10 mb-20 flex gap-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 sm:mt-12">
        <Link href={`/athlete/workouts/${workout.id}/log`} className="flex-1">
          <Button className={cn(
            "h-14 w-full rounded-[1.5rem] text-xs font-black uppercase tracking-widest shadow-xl transition-all active:scale-[0.99] sm:h-16 sm:rounded-[2rem] sm:text-sm sm:hover:scale-[1.01]",
            isCompleted
              ? "bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:border-white/10 dark:text-white dark:hover:bg-white/20"
              : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20"
          )}>
            {isCompleted ? (
              <><Edit className="mr-2 h-4 w-4" /> {t('editLog')}</>
            ) : (
              <><CheckCircle2 className="mr-2 h-4 w-4" /> {t('logCompletedWorkout')}</>
            )}
          </Button>
        </Link>
      </div>
    </div>
  )
}

// Helper functions
function getIntensityBadgeClass(intensity: string, isGlass: boolean = false): string {
  if (isGlass) {
    const classes: Record<string, string> = {
      RECOVERY: 'bg-purple-100 text-purple-600 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20',
      EASY: 'bg-emerald-100 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
      MODERATE: 'bg-yellow-100 text-yellow-600 border border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20',
      THRESHOLD: 'bg-orange-100 text-orange-600 border border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20',
      INTERVAL: 'bg-red-100 text-red-600 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
      MAX: 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-600/20 dark:text-red-500 dark:border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]',
    }
    return classes[intensity] || 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-white/5 dark:text-white dark:border-white/10'
  }

  const classes: Record<string, string> = {
    RECOVERY: 'border-purple-300 text-purple-700',
    EASY: 'border-green-300 text-green-700',
    MODERATE: 'border-yellow-300 text-yellow-700',
    THRESHOLD: 'border-orange-300 text-orange-700',
    INTERVAL: 'border-red-300 text-red-700',
    MAX: 'border-red-500 text-red-800',
  }
  return classes[intensity] || ''
}

function getEffortBadgeClass(effort: number, isGlass: boolean = false): string {
  if (isGlass) {
    if (effort <= 3) return 'bg-emerald-100 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
    if (effort <= 5) return 'bg-yellow-100 text-yellow-600 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20'
    if (effort <= 7) return 'bg-orange-100 text-orange-600 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20'
    return 'bg-red-100 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]'
  }

  if (effort <= 3) return 'border-green-300 text-green-700'
  if (effort <= 5) return 'border-yellow-300 text-yellow-700'
  if (effort <= 7) return 'border-orange-300 text-orange-700'
  return 'border-red-300 text-red-700'
}

function getCompletedHighlights(
  existingLog: CompletedLogSummary | null | undefined,
  raceResult: RaceResultSummary | null | undefined,
  t: Awaited<ReturnType<typeof getTranslations>>,
  formatEffortLabel: (effort: number) => string,
  formatRaceDistance: (distance?: string | null, customDistanceKm?: number | null) => string
) {
  const highlights: Array<{ label: string; value: string; subvalue?: string }> = []

  if (raceResult?.timeFormatted) {
    highlights.push({
      label: t('raceResult'),
      value: raceResult.timeFormatted,
      subvalue: formatRaceDistance(raceResult.distance, raceResult.customDistanceKm),
    })
  }
  if (existingLog?.duration) highlights.push({ label: t('loggedTime'), value: `${existingLog.duration} min` })
  if (existingLog?.distance) highlights.push({ label: t('loggedDistance'), value: `${existingLog.distance} km` })
  if (existingLog?.avgPace) highlights.push({ label: t('pace'), value: existingLog.avgPace })
  if (existingLog?.avgHR) highlights.push({ label: t('averageHeartRate'), value: `${existingLog.avgHR} bpm` })
  if (existingLog?.perceivedEffort) highlights.push({ label: 'RPE', value: `${existingLog.perceivedEffort}/10`, subvalue: formatEffortLabel(existingLog.perceivedEffort) })

  return highlights.slice(0, 4)
}

function formatDuration(minutes: number): string {
  if (minutes < 1) {
    return `${Math.round(minutes * 60)} s`
  }
  return `${minutes} min`
}
