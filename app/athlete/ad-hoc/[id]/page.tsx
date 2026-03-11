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
import { sv } from 'date-fns/locale'
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
} from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'
import type { ParsedWorkout, ParsedStrengthExercise, ParsedCardioSegment, ParsedHybridMovement } from '@/lib/adhoc-workout/types'

interface AdHocWorkoutDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function AdHocWorkoutDetailPage({ params }: AdHocWorkoutDetailPageProps) {
  const { id } = await params
  const { clientId } = await requireAthleteOrCoachInAthleteMode()

  const adHocWorkout = await prisma.adHocWorkout.findUnique({
    where: { id },
  })

  if (!adHocWorkout || adHocWorkout.athleteId !== clientId) {
    notFound()
  }

  const parsed = adHocWorkout.parsedStructure as unknown as ParsedWorkout | null

  return (
    <div className="min-h-screen pb-20 pt-6 px-4 max-w-4xl mx-auto">
      <Link href="/athlete/history">
        <Button variant="ghost" className="mb-8 font-black uppercase tracking-widest text-[10px] text-slate-500 hover:text-white transition-colors">
          <ArrowLeft className="mr-2 h-3.5 w-3.5" />
          Träningshistorik
        </Button>
      </Link>

      <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8">
          <div className="space-y-2">
            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tighter uppercase leading-none">
              {parsed?.name || adHocWorkout.workoutName || 'Ad-hoc pass'}
            </h1>
            <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-widest text-slate-500">
              <Calendar className="h-3.5 w-3.5 text-blue-500" />
              <span>{format(new Date(adHocWorkout.workoutDate), 'EEEE d MMM yyyy', { locale: sv })}</span>
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

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {parsed?.duration && (
          <GlassCard>
            <GlassCardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Tid</p>
                  <p className="text-xl font-black text-white">{parsed.duration} <span className="text-xs text-slate-600">min</span></p>
                </div>
              </div>
            </GlassCardContent>
          </GlassCard>
        )}
        {parsed?.distance && (
          <GlassCard>
            <GlassCardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Distans</p>
                  <p className="text-xl font-black text-white">{parsed.distance} <span className="text-xs text-slate-600">km</span></p>
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
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Snittpuls</p>
                  <p className="text-xl font-black text-white">{parsed.avgHeartRate} <span className="text-xs text-slate-600">bpm</span></p>
                </div>
              </div>
            </GlassCardContent>
          </GlassCard>
        )}
      </div>

      {/* Extra cardio metrics */}
      {parsed && (parsed.maxHeartRate || parsed.avgPace || parsed.elevationGain) && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {parsed.maxHeartRate && (
            <GlassCard>
              <GlassCardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <Heart className="h-4 w-4 text-red-400" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Max puls</p>
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
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Snittempo</p>
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
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Stigning</p>
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
              Detaljer
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="flex flex-wrap items-center gap-3 mb-4">
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
                  Time cap: {Math.round(parsed.timeCap / 60)} min
                </Badge>
              )}
            </div>
            {parsed.feeling && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Känsla:</span>
                <Badge variant="outline" className={cn("rounded-lg h-7 font-bold px-3 border-0", getFeelingBadgeClass(parsed.feeling))}>
                  {formatFeeling(parsed.feeling)}
                </Badge>
              </div>
            )}
          </GlassCardContent>
        </GlassCard>
      )}

      {/* Strength Exercises */}
      {parsed?.strengthExercises && parsed.strengthExercises.length > 0 && (
        <GlassCard className="mb-8">
          <GlassCardHeader>
            <GlassCardTitle className="text-xl font-black tracking-tight text-white uppercase italic flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-blue-500" />
              Styrkepass ({parsed.strengthExercises.length} {parsed.strengthExercises.length === 1 ? 'övning' : 'övningar'})
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="space-y-4">
              {parsed.strengthExercises.map((exercise, i) => (
                <StrengthExerciseRow key={i} exercise={exercise} index={i} />
              ))}
            </div>
          </GlassCardContent>
        </GlassCard>
      )}

      {/* Cardio Segments */}
      {parsed?.cardioSegments && parsed.cardioSegments.length > 0 && (
        <GlassCard className="mb-8">
          <GlassCardHeader>
            <GlassCardTitle className="text-xl font-black tracking-tight text-white uppercase italic flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-500" />
              Konditionspass ({parsed.cardioSegments.length} segment)
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="space-y-3">
              {parsed.cardioSegments.map((segment, i) => (
                <CardioSegmentRow key={i} segment={segment} index={i} />
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
              Rörelser ({parsed.movements.length} st)
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
              Anteckningar
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
              AI-tolkning
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <p className="text-slate-500 text-sm leading-relaxed whitespace-pre-wrap">
              {parsed.rawInterpretation}
            </p>
            {parsed.confidence != null && (
              <div className="mt-3 text-[9px] font-black uppercase tracking-widest text-slate-600">
                Konfidensgrad: {Math.round(parsed.confidence * 100)}%
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
              Originalinmatning
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
      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 flex justify-between items-center px-2 mb-20">
        <span>Registrerad {format(new Date(adHocWorkout.createdAt), 'PPP HH:mm', { locale: sv })}</span>
        {adHocWorkout.parsingModel && (
          <span>Tolkad av {adHocWorkout.parsingModel}</span>
        )}
      </div>
    </div>
  )
}

// ============================================
// Sub-components
// ============================================

function StrengthExerciseRow({ exercise, index }: { exercise: ParsedStrengthExercise; index: number }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
      <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-black shrink-0">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-black text-white text-sm uppercase tracking-tight truncate">
          {exercise.exerciseName}
        </p>
        <div className="flex items-center gap-3 mt-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          <span>{exercise.sets} set x {exercise.reps} reps</span>
          {exercise.weight && <span>{exercise.weight} kg</span>}
          {exercise.weightString && !exercise.weight && <span>{exercise.weightString}</span>}
          {exercise.rest && <span>Vila {exercise.rest}s</span>}
          {exercise.rpe && <span>RPE {exercise.rpe}</span>}
        </div>
        {exercise.notes && (
          <p className="text-slate-600 text-xs mt-1 italic">{exercise.notes}</p>
        )}
      </div>
    </div>
  )
}

function CardioSegmentRow({ segment, index }: { segment: ParsedCardioSegment; index: number }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
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
        <div className="flex items-center gap-3 mt-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          {segment.duration && <span>{Math.round(segment.duration / 60)} min</span>}
          {segment.distance && <span>{(segment.distance / 1000).toFixed(2)} km</span>}
          {segment.pace && <span>{segment.pace}</span>}
          {segment.zone && <span>Zon {segment.zone}</span>}
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
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
      <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 text-xs font-black shrink-0">
        {movement.order}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-black text-white text-sm uppercase tracking-tight truncate">
          {movement.name}
        </p>
        <div className="flex items-center gap-3 mt-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
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

function formatInputType(type: string): string {
  const types: Record<string, string> = {
    TEXT: 'Textinmatning',
    PHOTO: 'Foto',
    VOICE: 'Röstinmatning',
    EXTERNAL_IMPORT: 'Importerad',
  }
  return types[type] || type
}

function formatWorkoutType(type: string): string {
  const types: Record<string, string> = {
    CARDIO: 'Kondition',
    STRENGTH: 'Styrka',
    HYBRID: 'Blandat',
    MIXED: 'Mixat',
  }
  return types[type] || type
}

function formatIntensity(intensity: string): string {
  const map: Record<string, string> = {
    RECOVERY: 'Vilopass',
    EASY: 'Lätt',
    MODERATE: 'Måttlig',
    THRESHOLD: 'Tröskel',
    INTERVAL: 'Intervall',
    MAX: 'Maximal',
  }
  return map[intensity] || intensity
}

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

function formatFeeling(feeling: string): string {
  const map: Record<string, string> = {
    GREAT: 'Fantastiskt',
    GOOD: 'Bra',
    OKAY: 'Okej',
    TIRED: 'Trött',
    EXHAUSTED: 'Utmattad',
  }
  return map[feeling] || feeling
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

function formatSegmentType(type: string): string {
  const map: Record<string, string> = {
    WARMUP: 'Uppvärmning',
    COOLDOWN: 'Nedvarvning',
    INTERVAL: 'Intervall',
    STEADY: 'Jämnt tempo',
    RECOVERY: 'Vila',
    HILL: 'Backe',
    DRILLS: 'Teknikövningar',
  }
  return map[type] || type
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
