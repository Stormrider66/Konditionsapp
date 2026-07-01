// app/athlete/ad-hoc/[id]/page.tsx
import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Zap,
  Dumbbell,
  Activity,
  MessageSquare,
  AlertTriangle,
  Heart,
  TrendingUp,
  Mountain,
} from 'lucide-react'
import { format } from 'date-fns'
import { enUS, sv } from 'date-fns/locale'
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
} from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'
import type { ParsedWorkout, ParsedStrengthExercise, ParsedCardioSegment, ParsedHybridMovement } from '@/lib/adhoc-workout/types'
import { formatParsedWorkoutDistanceKm } from '@/lib/adhoc-workout/distance'
import { buildExerciseProgression } from '@/lib/activity-detail/build-detail'
import { StrengthProgressionTrends } from '@/components/athlete/activity/StrengthProgressionTrends'
import { getLocale, getTranslations } from '@/i18n/server'

type AdHocDetailTranslations = Awaited<ReturnType<typeof getTranslations>>

interface AdHocWorkoutDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function AdHocWorkoutDetailPage({ params }: AdHocWorkoutDetailPageProps) {
  const { id } = await params
  const { clientId } = await requireAthleteOrCoachInAthleteMode()
  const t = await getTranslations('athletePages.adHocDetail')
  const locale = await getLocale()
  const dateLocale = locale === 'en' ? enUS : sv

  const adHocWorkout = await prisma.adHocWorkout.findUnique({
    where: { id },
  })

  if (!adHocWorkout || adHocWorkout.athleteId !== clientId) {
    notFound()
  }

  const parsed = adHocWorkout.parsedStructure as unknown as ParsedWorkout | null
  const formattedDistanceKm = formatParsedWorkoutDistanceKm(parsed)

  // Cross-session strength progression for library-matched strength exercises.
  const strengthProgression = parsed?.strengthExercises?.length
    ? await buildExerciseProgression(
        clientId,
        parsed.strengthExercises
          .filter((e): e is ParsedStrengthExercise & { exerciseId: string } => Boolean(e.exerciseId))
          .map((e) => ({ exerciseId: e.exerciseId, name: e.exerciseName }))
      )
    : []
  const formatInputType = (type: string): string => {
    const types: Record<string, string> = {
      TEXT: t('inputTypes.text'),
      PHOTO: t('inputTypes.photo'),
      VOICE: t('inputTypes.voice'),
      EXTERNAL_IMPORT: t('inputTypes.externalImport'),
    }
    return types[type] || type
  }
  const formatWorkoutType = (type: string): string => {
    const types: Record<string, string> = {
      CARDIO: t('workoutTypes.cardio'),
      STRENGTH: t('workoutTypes.strength'),
      HYBRID: t('workoutTypes.hybrid'),
      MIXED: t('workoutTypes.mixed'),
    }
    return types[type] || type
  }
  const formatIntensity = (intensity: string): string => {
    const map: Record<string, string> = {
      RECOVERY: t('intensities.recovery'),
      EASY: t('intensities.easy'),
      MODERATE: t('intensities.moderate'),
      THRESHOLD: t('intensities.threshold'),
      INTERVAL: t('intensities.interval'),
      MAX: t('intensities.max'),
    }
    return map[intensity] || intensity
  }
  const formatFeeling = (feeling: string): string => {
    const map: Record<string, string> = {
      GREAT: t('feelings.great'),
      GOOD: t('feelings.good'),
      OKAY: t('feelings.okay'),
      TIRED: t('feelings.tired'),
      EXHAUSTED: t('feelings.exhausted'),
    }
    return map[feeling] || feeling
  }
  const formatSegmentType = (type: string): string => {
    const map: Record<string, string> = {
      WARMUP: t('segmentTypes.warmup'),
      COOLDOWN: t('segmentTypes.cooldown'),
      INTERVAL: t('segmentTypes.interval'),
      STEADY: t('segmentTypes.steady'),
      RECOVERY: t('segmentTypes.recovery'),
      HILL: t('segmentTypes.hill'),
      DRILLS: t('segmentTypes.drills'),
    }
    return map[type] || type
  }
  const previewChips = getAdHocPreviewChips(parsed, formatSegmentType)

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 pb-20 pt-4 sm:pt-6">
      <Link href="/athlete/history">
        <Button variant="ghost" className="mb-6 px-2 font-black uppercase tracking-widest text-[10px] text-slate-500 hover:text-white transition-colors sm:mb-8">
          <ArrowLeft className="mr-2 h-3.5 w-3.5" />
          {t('backToHistory')}
        </Button>
      </Link>

      <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-700 sm:mb-10">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:mb-8 sm:flex-row sm:items-end sm:gap-6">
          <div className="space-y-2">
            <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
              {parsed?.name || adHocWorkout.workoutName || 'Ad-hoc pass'}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 sm:gap-3 sm:text-[11px]">
              <Calendar className="h-3.5 w-3.5 text-blue-500" />
              <span>{format(new Date(adHocWorkout.workoutDate), 'EEEE d MMM yyyy', { locale: dateLocale })}</span>
              <span className="text-slate-700">|</span>
              <span className="inline-flex items-center gap-1 text-emerald-400">
                Ad-hoc
              </span>
              <span className="text-slate-700">|</span>
              <span className="text-slate-600">{formatInputType(adHocWorkout.inputType)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8 flex flex-wrap gap-2 sm:gap-3">
        <Badge variant="outline" className="h-8 rounded-xl border-white/10 bg-white/5 px-3 text-xs font-bold text-white sm:h-9 sm:px-4">
          {formatWorkoutType(parsed?.type || 'MIXED')}
        </Badge>
        {parsed?.intensity && (
          <Badge variant="outline" className={cn("h-8 rounded-xl border-0 px-3 text-xs font-bold sm:h-9 sm:px-4", getIntensityBadgeClass(parsed.intensity))}>
            {formatIntensity(parsed.intensity)}
          </Badge>
        )}
        <Badge variant="outline" className="h-8 rounded-xl border-white/10 bg-white/5 px-3 text-xs font-bold text-slate-300 sm:h-9 sm:px-4">
          {formatInputType(adHocWorkout.inputType)}
        </Badge>
      </div>

      {/* Overview Cards */}
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        {parsed?.duration && (
          <GlassCard>
            <GlassCardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t('metrics.time')}</p>
                  <p className="text-xl font-black text-white">{parsed.duration} <span className="text-xs text-slate-600">min</span></p>
                </div>
              </div>
            </GlassCardContent>
          </GlassCard>
        )}
        {formattedDistanceKm && (
          <GlassCard>
            <GlassCardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t('metrics.distance')}</p>
                  <p className="text-xl font-black text-white">{formattedDistanceKm} <span className="text-xs text-slate-600">km</span></p>
                </div>
              </div>
            </GlassCardContent>
          </GlassCard>
        )}
        {parsed?.perceivedEffort && (
          <GlassCard>
            <GlassCardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center border",
                  getRPEContainerClass(parsed.perceivedEffort)
                )}>
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">RPE</p>
                  <p className="text-xl font-black text-white">{parsed.perceivedEffort}<span className="text-xs text-slate-600">/10</span></p>
                </div>
              </div>
            </GlassCardContent>
          </GlassCard>
        )}
        {parsed?.avgHeartRate && (
          <GlassCard>
            <GlassCardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <Heart className="h-4 w-4 text-red-400" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t('metrics.avgHeartRate')}</p>
                  <p className="text-xl font-black text-white">{parsed.avgHeartRate} <span className="text-xs text-slate-600">bpm</span></p>
                </div>
              </div>
            </GlassCardContent>
          </GlassCard>
        )}
      </div>

      {/* Extra cardio metrics */}
      {parsed && (parsed.maxHeartRate || parsed.avgPace || parsed.elevationGain) && (
        <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
          {parsed.maxHeartRate && (
            <GlassCard>
              <GlassCardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <Heart className="h-4 w-4 text-red-400" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t('metrics.maxHeartRate')}</p>
                    <p className="text-xl font-black text-white">{parsed.maxHeartRate} <span className="text-xs text-slate-600">bpm</span></p>
                  </div>
                </div>
              </GlassCardContent>
            </GlassCard>
          )}
          {parsed.avgPace && (
            <GlassCard>
              <GlassCardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t('metrics.avgPace')}</p>
                    <p className="text-xl font-black text-white">{formatPace(parsed.avgPace)} <span className="text-xs text-slate-600">/km</span></p>
                  </div>
                </div>
              </GlassCardContent>
            </GlassCard>
          )}
          {parsed.elevationGain && (
            <GlassCard>
              <GlassCardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                    <Mountain className="h-4 w-4 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t('metrics.elevation')}</p>
                    <p className="text-xl font-black text-white">{parsed.elevationGain} <span className="text-xs text-slate-600">m</span></p>
                  </div>
                </div>
              </GlassCardContent>
            </GlassCard>
          )}
        </div>
      )}

      {/* Type & Intensity Badges */}
      {parsed && (
        <GlassCard className="mb-8">
          <GlassCardHeader className="pb-3">
            <GlassCardTitle className="text-lg font-black tracking-tight flex items-center gap-2 text-white">
              <Activity className="h-4 w-4 text-blue-500" />
              {t('sections.details')}
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
              <Badge variant="outline" className="rounded-lg h-7 bg-white/5 border-white/10 text-white font-bold px-3">
                {formatWorkoutType(parsed.type)}
              </Badge>
              {parsed.sport && (
                <Badge variant="outline" className="rounded-lg h-7 bg-white/5 border-white/10 text-white font-bold px-3">
                  {parsed.sport}
                </Badge>
              )}
              {parsed.intensity && (
                <Badge variant="outline" className={cn("rounded-lg h-7 border-0 font-bold px-3", getIntensityBadgeClass(parsed.intensity))}>
                  {formatIntensity(parsed.intensity)}
                </Badge>
              )}
              {parsed.hybridFormat && (
                <Badge variant="outline" className="rounded-lg h-7 bg-purple-500/10 border-purple-500/20 text-purple-400 font-bold px-3">
                  {parsed.hybridFormat}
                </Badge>
              )}
              {parsed.repScheme && (
                <Badge variant="outline" className="rounded-lg h-7 bg-orange-500/10 border-orange-500/20 text-orange-400 font-bold px-3">
                  {parsed.repScheme}
                </Badge>
              )}
              {parsed.timeCap && (
                <Badge variant="outline" className="rounded-lg h-7 bg-red-500/10 border-red-500/20 text-red-400 font-bold px-3">
                  {t('labels.timeCap', { minutes: Math.round(parsed.timeCap / 60) })}
                </Badge>
              )}
            </div>
            {parsed.feeling && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t('labels.feeling')}</span>
                <Badge variant="outline" className={cn("rounded-lg h-7 font-bold px-3 border-0", getFeelingBadgeClass(parsed.feeling))}>
                  {formatFeeling(parsed.feeling)}
                </Badge>
              </div>
            )}
          </GlassCardContent>
        </GlassCard>
      )}

      {previewChips.length > 0 && (
        <GlassCard className="mb-8">
          <GlassCardHeader className="pb-3">
            <GlassCardTitle className="text-lg font-black tracking-tight flex items-center gap-2 text-white">
              <Zap className="h-4 w-4 text-orange-500" />
              {t('sections.overview')}
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="flex flex-wrap gap-2">
              {previewChips.map((chip) => (
                <span key={chip} className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-300">
                  {chip}
                </span>
              ))}
            </div>
          </GlassCardContent>
        </GlassCard>
      )}

      {/* Strength Exercises */}
      {parsed?.strengthExercises && parsed.strengthExercises.length > 0 && (
        <GlassCard className="mb-8">
          <GlassCardHeader>
            <GlassCardTitle className="text-xl font-black tracking-tight text-white uppercase italic flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-blue-500" />
              {t('sections.strengthWorkout', { count: parsed.strengthExercises.length })}
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="space-y-4">
              {parsed.strengthExercises.map((exercise, i) => (
                <StrengthExerciseRow key={i} exercise={exercise} index={i} t={t} />
              ))}
            </div>
          </GlassCardContent>
        </GlassCard>
      )}

      {strengthProgression.length > 0 && (
        <div className="mb-8">
          <StrengthProgressionTrends progression={strengthProgression} locale={locale} />
        </div>
      )}

      {/* Cardio Segments */}
      {parsed?.cardioSegments && parsed.cardioSegments.length > 0 && (
        <GlassCard className="mb-8">
          <GlassCardHeader>
            <GlassCardTitle className="text-xl font-black tracking-tight text-white uppercase italic flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-500" />
              {t('sections.cardioWorkout', { count: parsed.cardioSegments.length })}
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="space-y-3">
              {parsed.cardioSegments.map((segment, i) => (
                <CardioSegmentRow key={i} segment={segment} index={i} t={t} formatSegmentType={formatSegmentType} />
              ))}
            </div>
          </GlassCardContent>
        </GlassCard>
      )}

      {/* Hybrid Movements */}
      {parsed?.movements && parsed.movements.length > 0 && (
        <GlassCard className="mb-8">
          <GlassCardHeader>
            <GlassCardTitle className="text-xl font-black tracking-tight text-white uppercase italic flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-500" />
              {t('sections.movements', { count: parsed.movements.length })}
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="space-y-3">
              {parsed.movements.map((movement, i) => (
                <HybridMovementRow key={i} movement={movement} />
              ))}
            </div>
          </GlassCardContent>
        </GlassCard>
      )}

      {/* Notes */}
      {parsed?.notes && (
        <GlassCard className="mb-8">
          <GlassCardHeader className="pb-3">
            <GlassCardTitle className="text-lg font-black tracking-tight flex items-center gap-2 text-white">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              {t('sections.notes')}
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
              {parsed.notes}
            </div>
          </GlassCardContent>
        </GlassCard>
      )}

      {/* AI Interpretation */}
      {parsed?.rawInterpretation && (
        <GlassCard className="mb-8 border-blue-500/10">
          <GlassCardHeader className="pb-3">
            <GlassCardTitle className="text-lg font-black tracking-tight flex items-center gap-2 text-slate-400">
              {t('sections.aiInterpretation')}
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <p className="text-slate-500 text-sm leading-relaxed whitespace-pre-wrap">
              {parsed.rawInterpretation}
            </p>
            {parsed.confidence != null && (
              <div className="mt-3 text-[9px] font-black uppercase tracking-widest text-slate-600">
                {t('labels.confidence', { percent: Math.round(parsed.confidence * 100) })}
              </div>
            )}
          </GlassCardContent>
        </GlassCard>
      )}

      {/* Warnings */}
      {parsed?.warnings && parsed.warnings.length > 0 && (
        <GlassCard className="mb-8 border-yellow-500/20">
          <GlassCardContent className="pt-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                {parsed.warnings.map((warning, i) => (
                  <p key={i} className="text-yellow-400/80 text-sm">{warning}</p>
                ))}
              </div>
            </div>
          </GlassCardContent>
        </GlassCard>
      )}

      {/* Raw text input */}
      {adHocWorkout.rawInputText && (
        <GlassCard className="mb-8">
          <GlassCardHeader className="pb-3">
            <GlassCardTitle className="text-lg font-black tracking-tight flex items-center gap-2 text-slate-400">
              {t('sections.rawInput')}
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-slate-500 text-sm whitespace-pre-wrap leading-relaxed font-mono">
              {adHocWorkout.rawInputText}
            </div>
          </GlassCardContent>
        </GlassCard>
      )}

      {/* Metadata footer */}
      <div className="mb-20 flex flex-col gap-2 px-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <span>{t('footer.registered', { date: format(new Date(adHocWorkout.createdAt), 'PPP HH:mm', { locale: dateLocale }) })}</span>
        {adHocWorkout.parsingModel && (
          <span>{t('footer.parsedBy', { model: adHocWorkout.parsingModel })}</span>
        )}
      </div>
    </div>
  )
}

// ============================================
// Sub-components
// ============================================

function StrengthExerciseRow({ exercise, index, t }: { exercise: ParsedStrengthExercise; index: number; t: AdHocDetailTranslations }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/5 bg-white/5 p-4 sm:items-center sm:gap-4">
      <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-black shrink-0">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-black text-white text-sm uppercase tracking-tight truncate">
          {exercise.exerciseName}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          <span>{t('exercise.setsReps', { sets: exercise.sets, reps: exercise.reps })}</span>
          {exercise.weight && <span>{exercise.weight} kg</span>}
          {exercise.weightString && !exercise.weight && <span>{exercise.weightString}</span>}
          {exercise.rest && <span>{t('exercise.rest', { seconds: exercise.rest })}</span>}
          {exercise.rpe && <span>RPE {exercise.rpe}</span>}
        </div>
        {exercise.notes && (
          <p className="text-slate-600 text-xs mt-1 italic">{exercise.notes}</p>
        )}
      </div>
    </div>
  )
}

function CardioSegmentRow({
  segment,
  index,
  t,
  formatSegmentType,
}: {
  segment: ParsedCardioSegment
  index: number
  t: AdHocDetailTranslations
  formatSegmentType: (type: string) => string
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/5 bg-white/5 p-4 sm:items-center sm:gap-4">
      <div className={cn(
        "w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 border",
        getSegmentTypeClass(segment.type)
      )}>
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-black text-white text-sm uppercase tracking-tight">
          {formatSegmentType(segment.type)}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {segment.duration && <span>{Math.round(segment.duration / 60)} min</span>}
          {segment.distance && <span>{(segment.distance / 1000).toFixed(2)} km</span>}
          {segment.pace && <span>{segment.pace}</span>}
          {segment.zone && <span>{t('cardio.zone', { zone: segment.zone })}</span>}
          {segment.targetHR && <span>{segment.targetHR} bpm</span>}
        </div>
        {segment.notes && (
          <p className="text-slate-600 text-xs mt-1 italic">{segment.notes}</p>
        )}
      </div>
    </div>
  )
}

function HybridMovementRow({ movement }: { movement: ParsedHybridMovement }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/5 bg-white/5 p-4 sm:items-center sm:gap-4">
      <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 text-xs font-black shrink-0">
        {movement.order}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-black text-white text-sm uppercase tracking-tight truncate">
          {movement.name}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {movement.reps && <span>{movement.reps} reps</span>}
          {movement.duration && <span>{movement.duration}s</span>}
          {movement.distance && <span>{movement.distance}m</span>}
          {movement.calories && <span>{movement.calories} cal</span>}
          {movement.weight && <span>{movement.weight} {movement.weightUnit || 'kg'}</span>}
        </div>
        {movement.notes && (
          <p className="text-slate-600 text-xs mt-1 italic">{movement.notes}</p>
        )}
      </div>
    </div>
  )
}

// ============================================
// Helper functions
// ============================================

function getIntensityBadgeClass(intensity: string): string {
  const map: Record<string, string> = {
    RECOVERY: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    EASY: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    MODERATE: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    THRESHOLD: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    INTERVAL: 'bg-red-500/10 text-red-400 border-red-500/20',
    MAX: 'bg-red-600/20 text-red-500 border-red-500/30',
  }
  return map[intensity] || 'bg-white/5 text-white border-white/10'
}

function getFeelingBadgeClass(feeling: string): string {
  const map: Record<string, string> = {
    GREAT: 'bg-emerald-500/10 text-emerald-400',
    GOOD: 'bg-blue-500/10 text-blue-400',
    OKAY: 'bg-yellow-500/10 text-yellow-400',
    TIRED: 'bg-orange-500/10 text-orange-400',
    EXHAUSTED: 'bg-red-500/10 text-red-400',
  }
  return map[feeling] || 'bg-white/5 text-white'
}

function getRPEContainerClass(rpe: number): string {
  if (rpe <= 3) return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
  if (rpe <= 5) return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
  if (rpe <= 7) return 'bg-orange-500/10 border-orange-500/20 text-orange-400'
  return 'bg-red-500/10 border-red-500/20 text-red-400'
}

function getSegmentTypeClass(type: string): string {
  const map: Record<string, string> = {
    WARMUP: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
    COOLDOWN: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    INTERVAL: 'bg-red-500/10 border-red-500/20 text-red-400',
    STEADY: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    RECOVERY: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
    HILL: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
    DRILLS: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
  }
  return map[type] || 'bg-white/5 border-white/10 text-slate-400'
}

function formatPace(secondsPerKm: number): string {
  const min = Math.floor(secondsPerKm / 60)
  const sec = Math.round(secondsPerKm % 60)
  return `${min}:${sec.toString().padStart(2, '0')}`
}

function getAdHocPreviewChips(parsed: ParsedWorkout | null, formatSegmentType: (type: string) => string): string[] {
  if (!parsed) return []
  const chips: string[] = []

  if (parsed.strengthExercises?.length) {
    parsed.strengthExercises.slice(0, 3).forEach((exercise) => {
      if (exercise.exerciseName) chips.push(exercise.exerciseName)
    })
  }

  if (chips.length < 4 && parsed.cardioSegments?.length) {
    parsed.cardioSegments.slice(0, 4 - chips.length).forEach((segment) => {
      chips.push(formatSegmentType(segment.type))
    })
  }

  if (chips.length < 4 && parsed.movements?.length) {
    parsed.movements.slice(0, 4 - chips.length).forEach((movement) => {
      if (movement.name) chips.push(movement.name)
    })
  }

  return chips.slice(0, 4)
}
