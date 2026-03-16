'use client'

import Link from 'next/link'
import { Camera, Flame, Heart, MapPin, MessageSquare, Mic, Route, Sparkles, Timer, Dumbbell, CheckCircle2 } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { DashboardAdHocWorkout } from '@/types/dashboard-items'

interface AdHocWorkoutHeroCardProps {
  workout: DashboardAdHocWorkout
  athleteName?: string
  basePath?: string
}

const INPUT_TYPE_LABELS: Record<string, { label: string; icon: typeof Camera }> = {
  PHOTO: { label: 'Foto', icon: Camera },
  SCREENSHOT: { label: 'Skärmbild', icon: Camera },
  VOICE: { label: 'Röst', icon: Mic },
  TEXT: { label: 'Text', icon: MessageSquare },
  STRAVA_IMPORT: { label: 'Strava', icon: Route },
  GARMIN_IMPORT: { label: 'Garmin', icon: Route },
  CONCEPT2_IMPORT: { label: 'Concept2', icon: Route },
  MANUAL_FORM: { label: 'Formulär', icon: Sparkles },
}

const FEELING_LABELS: Record<string, string> = {
  GREAT: 'Kändes fantastiskt',
  GOOD: 'Kändes bra',
  OKAY: 'Kändes okej',
  TIRED: 'Kändes tungt',
  EXHAUSTED: 'Tog mycket energi',
}

const INTENSITY_LABELS: Record<string, string> = {
  RECOVERY: 'Återhämtning',
  EASY: 'Lätt',
  MODERATE: 'Måttlig',
  THRESHOLD: 'Tröskel',
  INTERVAL: 'Intervall',
  MAX: 'Max',
}

const TYPE_LABELS: Record<string, { label: string; icon: typeof Dumbbell }> = {
  CARDIO: { label: 'Kondition', icon: Route },
  STRENGTH: { label: 'Styrka', icon: Dumbbell },
  HYBRID: { label: 'Hybrid', icon: Sparkles },
  MIXED: { label: 'Mixat', icon: Sparkles },
}

function formatDistance(distanceKm: number | null): string | null {
  if (!distanceKm || distanceKm <= 0) return null
  return `${distanceKm.toFixed(distanceKm >= 10 || Number.isInteger(distanceKm) ? 0 : 1)} km`
}

export function AdHocWorkoutHeroCard({ workout, athleteName, basePath = '' }: AdHocWorkoutHeroCardProps) {
  const inputMeta = INPUT_TYPE_LABELS[workout.inputType] || INPUT_TYPE_LABELS.MANUAL_FORM
  const InputIcon = inputMeta.icon
  const typeMeta = workout.parsedType ? TYPE_LABELS[workout.parsedType] : null
  const TypeIcon = typeMeta?.icon
  const distanceLabel = formatDistance(workout.summary.distanceKm)
  const feelingLabel = workout.summary.feeling ? FEELING_LABELS[workout.summary.feeling] : null
  const titleName = athleteName ? `${athleteName}, passet är registrerat` : 'Passet är registrerat'

  return (
    <GlassCard className="lg:col-span-2 rounded-2xl group overflow-hidden transition-all">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10 pointer-events-none" />
      <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl transition-colors duration-700 group-hover:bg-emerald-500/15 pointer-events-none" />

      <div className="relative z-10 flex h-full min-h-[280px] flex-col justify-between p-6 md:min-h-[300px] md:p-8">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            Senast loggat
          </div>

          <div className="mb-4 flex items-start gap-4">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
              <InputIcon className="h-6 w-6 text-emerald-300" />
            </div>
            <div>
              <h2 className="mb-2 text-2xl font-bold text-white md:text-3xl">{titleName}</h2>
              <p className="max-w-xl text-sm text-slate-300 md:text-base">
                {workout.workoutName} är nu med i dagens översikt och din kostplan är justerad efter passet.
              </p>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20">
              {inputMeta.label}
            </Badge>
            {typeMeta && TypeIcon && (
              <Badge variant="outline" className="border-slate-700 text-slate-300">
                <TypeIcon className="mr-1 h-3.5 w-3.5" />
                {typeMeta.label}
              </Badge>
            )}
            {workout.summary.intensity && (
              <Badge variant="outline" className="border-slate-700 text-slate-300">
                {INTENSITY_LABELS[workout.summary.intensity] || workout.summary.intensity}
              </Badge>
            )}
            {feelingLabel && (
              <Badge variant="outline" className="border-slate-700 text-slate-300">
                {feelingLabel}
              </Badge>
            )}
          </div>

          {workout.previewChips.length > 0 && (
            <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Passoversikt</p>
              <div className="flex flex-wrap gap-2">
                {workout.previewChips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-200"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          )}

          {workout.summary.notes && (
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="text-sm text-slate-300">{workout.summary.notes}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {workout.summary.durationMinutes ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="mb-1 flex items-center gap-2 text-slate-400">
                <Timer className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wide">Tid</span>
              </div>
              <div className="text-lg font-semibold text-white">{workout.summary.durationMinutes} min</div>
            </div>
          ) : null}

          {distanceLabel ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="mb-1 flex items-center gap-2 text-slate-400">
                <MapPin className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wide">Distans</span>
              </div>
              <div className="text-lg font-semibold text-white">{distanceLabel}</div>
            </div>
          ) : null}

          {workout.summary.estimatedCalories ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="mb-1 flex items-center gap-2 text-slate-400">
                <Flame className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wide">Energi</span>
              </div>
              <div className="text-lg font-semibold text-white">{workout.summary.estimatedCalories} kcal</div>
            </div>
          ) : null}

          {feelingLabel ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="mb-1 flex items-center gap-2 text-slate-400">
                <Heart className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wide">Känsla</span>
              </div>
              <div className="text-sm font-semibold text-white">{feelingLabel}</div>
            </div>
          ) : null}
        </div>

        <div className="mt-5">
          <Link href={`${basePath}/athlete/ad-hoc/${workout.id}`}>
            <Button
              variant="outline"
              className="w-full sm:w-auto min-h-[48px] border-white/15 bg-white/5 text-white hover:bg-white/10 hover:border-white/25"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Visa passdetaljer
            </Button>
          </Link>
        </div>
      </div>
    </GlassCard>
  )
}
