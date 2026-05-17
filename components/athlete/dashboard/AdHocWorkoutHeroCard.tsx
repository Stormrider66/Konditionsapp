'use client'

import Link from 'next/link'
import { Camera, Flame, Heart, MapPin, MessageSquare, Mic, Route, Sparkles, Timer, Dumbbell, CheckCircle2 } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DashboardVisualLayer } from './DashboardVisualLayer'
import { getWorkoutVisual } from './dashboard-visuals'
import type { DashboardAdHocWorkout } from '@/types/dashboard-items'
import { useTranslations } from '@/i18n/client'

interface AdHocWorkoutHeroCardProps {
  workout: DashboardAdHocWorkout
  athleteName?: string
  basePath?: string
}

const INPUT_TYPE_META: Record<string, { icon: typeof Camera }> = {
  PHOTO: { icon: Camera },
  SCREENSHOT: { icon: Camera },
  VOICE: { icon: Mic },
  TEXT: { icon: MessageSquare },
  STRAVA_IMPORT: { icon: Route },
  GARMIN_IMPORT: { icon: Route },
  CONCEPT2_IMPORT: { icon: Route },
  MANUAL_FORM: { icon: Sparkles },
}

const TYPE_META: Record<string, { icon: typeof Dumbbell }> = {
  CARDIO: { icon: Route },
  STRENGTH: { icon: Dumbbell },
  HYBRID: { icon: Sparkles },
  MIXED: { icon: Sparkles },
}

function formatDistance(distanceKm: number | null): string | null {
  if (!distanceKm || distanceKm <= 0) return null
  return `${distanceKm.toFixed(distanceKm >= 10 || Number.isInteger(distanceKm) ? 0 : 1)} km`
}

export function AdHocWorkoutHeroCard({ workout, athleteName, basePath = '' }: AdHocWorkoutHeroCardProps) {
  const t = useTranslations('components.adHocWorkoutHeroCard')
  const getInputLabel = (inputType: string) => {
    switch (inputType) {
      case 'PHOTO': return t('inputTypes.photo')
      case 'SCREENSHOT': return t('inputTypes.screenshot')
      case 'VOICE': return t('inputTypes.voice')
      case 'TEXT': return t('inputTypes.text')
      case 'STRAVA_IMPORT': return t('inputTypes.stravaImport')
      case 'GARMIN_IMPORT': return t('inputTypes.garminImport')
      case 'CONCEPT2_IMPORT': return t('inputTypes.concept2Import')
      case 'MANUAL_FORM': return t('inputTypes.manualForm')
      default: return t('inputTypes.manualForm')
    }
  }
  const getFeelingLabel = (feeling: string | null | undefined) => {
    switch (feeling) {
      case 'GREAT': return t('feelings.great')
      case 'GOOD': return t('feelings.good')
      case 'OKAY': return t('feelings.okay')
      case 'TIRED': return t('feelings.tired')
      case 'EXHAUSTED': return t('feelings.exhausted')
      default: return null
    }
  }
  const getIntensityLabel = (intensity: string | null | undefined) => {
    switch (intensity) {
      case 'RECOVERY': return t('intensities.recovery')
      case 'EASY': return t('intensities.easy')
      case 'MODERATE': return t('intensities.moderate')
      case 'THRESHOLD': return t('intensities.threshold')
      case 'INTERVAL': return t('intensities.interval')
      case 'MAX': return t('intensities.max')
      default: return intensity
    }
  }
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'CARDIO': return t('types.cardio')
      case 'STRENGTH': return t('types.strength')
      case 'HYBRID': return t('types.hybrid')
      case 'MIXED': return t('types.mixed')
      default: return type
    }
  }
  const inputMeta = INPUT_TYPE_META[workout.inputType] || INPUT_TYPE_META.MANUAL_FORM
  const InputIcon = inputMeta.icon
  const typeMeta = workout.parsedType ? TYPE_META[workout.parsedType] : null
  const TypeIcon = typeMeta?.icon
  const distanceLabel = formatDistance(workout.summary.distanceKm)
  const feelingLabel = getFeelingLabel(workout.summary.feeling)
  const intensityLabel = getIntensityLabel(workout.summary.intensity)
  const titleName = athleteName ? t('titleWithName', { name: athleteName }) : t('title')
  const visual = getWorkoutVisual({
    type: workout.parsedType,
    intensity: workout.summary.intensity,
    name: workout.workoutName,
  })

  return (
    <GlassCard className="lg:col-span-2 rounded-2xl group overflow-hidden bg-white/95 text-slate-950 ring-slate-900/10 dark:bg-slate-950 dark:text-white dark:ring-white/10 transition-all">
      <DashboardVisualLayer visual={visual} priority />
      <div className={`absolute -top-24 -right-24 h-48 w-48 rounded-full ${visual.glowClass} opacity-0 blur-3xl transition-opacity duration-700 group-hover:opacity-100 pointer-events-none`} />

      <div className="relative z-10 flex h-full min-h-[280px] flex-col justify-between p-6 md:min-h-[300px] md:p-8">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:border-emerald-500/20 dark:text-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            {t('badge')}
          </div>

          <div className="mb-4 flex items-start gap-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-500/10 p-3 dark:border-emerald-500/20">
              <InputIcon className="h-6 w-6 text-emerald-700 dark:text-emerald-300" />
            </div>
            <div>
              <h2 className="mb-2 text-2xl font-bold text-slate-950 dark:text-white md:text-3xl">{titleName}</h2>
              <p className="max-w-xl text-sm text-slate-600 dark:text-slate-300 md:text-base">
                {t('description', { workoutName: workout.workoutName })}
              </p>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <Badge className="border-emerald-200 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:border-emerald-500/20 dark:text-emerald-300">
              {getInputLabel(workout.inputType)}
            </Badge>
            {typeMeta && TypeIcon && (
              <Badge variant="outline" className="border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300">
                <TypeIcon className="mr-1 h-3.5 w-3.5" />
                {getTypeLabel(workout.parsedType || '')}
              </Badge>
            )}
            {workout.summary.intensity && (
              <Badge variant="outline" className="border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300">
                {intensityLabel}
              </Badge>
            )}
            {feelingLabel && (
              <Badge variant="outline" className="border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300">
                {feelingLabel}
              </Badge>
            )}
          </div>

          {workout.previewChips.length > 0 && (
            <div className="mb-4 rounded-xl border border-slate-200/80 bg-white/75 p-3 dark:border-white/10 dark:bg-white/5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{t('overview')}</p>
              <div className="flex flex-wrap gap-2">
                {workout.previewChips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-slate-200 bg-white/75 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          )}

          {workout.summary.notes && (
            <div className="rounded-lg border border-slate-200/80 bg-white/75 p-3 dark:border-white/10 dark:bg-white/5">
              <p className="text-sm text-slate-600 dark:text-slate-300">{workout.summary.notes}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {workout.summary.durationMinutes ? (
            <div className="rounded-xl border border-slate-200/80 bg-white/75 p-3 dark:border-white/10 dark:bg-white/5">
              <div className="mb-1 flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Timer className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wide">{t('stats.time')}</span>
              </div>
              <div className="text-lg font-semibold text-slate-950 dark:text-white">{workout.summary.durationMinutes} min</div>
            </div>
          ) : null}

          {distanceLabel ? (
            <div className="rounded-xl border border-slate-200/80 bg-white/75 p-3 dark:border-white/10 dark:bg-white/5">
              <div className="mb-1 flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <MapPin className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wide">{t('stats.distance')}</span>
              </div>
              <div className="text-lg font-semibold text-slate-950 dark:text-white">{distanceLabel}</div>
            </div>
          ) : null}

          {workout.summary.estimatedCalories ? (
            <div className="rounded-xl border border-slate-200/80 bg-white/75 p-3 dark:border-white/10 dark:bg-white/5">
              <div className="mb-1 flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Flame className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wide">{t('stats.energy')}</span>
              </div>
              <div className="text-lg font-semibold text-slate-950 dark:text-white">{workout.summary.estimatedCalories} kcal</div>
            </div>
          ) : null}

          {feelingLabel ? (
            <div className="rounded-xl border border-slate-200/80 bg-white/75 p-3 dark:border-white/10 dark:bg-white/5">
              <div className="mb-1 flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Heart className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wide">{t('stats.feeling')}</span>
              </div>
              <div className="text-sm font-semibold text-slate-950 dark:text-white">{feelingLabel}</div>
            </div>
          ) : null}
        </div>

        <div className="mt-5">
          <Link href={`${basePath}/athlete/ad-hoc/${workout.id}`}>
            <Button
              variant="outline"
              className="w-full sm:w-auto min-h-[48px] border-slate-300 bg-white/70 text-slate-900 hover:bg-white hover:border-slate-400 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:border-white/25"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {t('viewDetails')}
            </Button>
          </Link>
        </div>
      </div>
    </GlassCard>
  )
}
