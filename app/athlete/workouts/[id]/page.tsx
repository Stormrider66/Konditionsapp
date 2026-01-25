// app/athlete/workouts/[id]/page.tsx
import { notFound, redirect } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, CheckCircle2, Clock, MapPin, Calendar, Edit, ClipboardList, Info, Activity, Zap } from 'lucide-react'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import { WorkoutSegments } from '@/components/athlete/workout/WorkoutSegments'
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
  GlassCardDescription
} from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'

interface WorkoutDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function WorkoutDetailPage({ params }: WorkoutDetailPageProps) {
  const { user, clientId } = await requireAthleteOrCoachInAthleteMode()
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
        orderBy: {
          completedAt: 'desc',
        },
        take: 1,
      },
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

  // Calculate workout date
  const programStartDate = new Date(workout.day.week.program.startDate)
  const dayOffset = (workout.day.week.weekNumber - 1) * 7 + (workout.day.dayNumber - 1)
  const workoutDate = new Date(programStartDate)
  workoutDate.setDate(workoutDate.getDate() + dayOffset)

  return (
    <div className="min-h-screen pb-20 pt-6 px-4 max-w-4xl mx-auto">
      <Link href={`/athlete/programs/${workout.day.week.program.id}`}>
        <Button variant="ghost" className="mb-8 font-black uppercase tracking-widest text-[10px] text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
          <ArrowLeft className="mr-2 h-3.5 w-3.5" />
          Programöversikt
        </Button>
      </Link>

      <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8">
          <div className="space-y-2">
            <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none transition-colors">
              {workout.name}
            </h1>
            <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500 transition-colors">
              <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-500 transition-colors" />
              <span>
                {format(workoutDate, 'EEEE d MMM yyyy', { locale: sv })}
              </span>
              <span className="text-slate-400 dark:text-slate-700">•</span>
              <span>
                Vecka <span className="text-slate-900 dark:text-white transition-colors">{workout.day.week.weekNumber}</span>, Dag <span className="text-slate-900 dark:text-white transition-colors">{workout.day.dayNumber}</span>
              </span>
            </div>
          </div>
          {isCompleted && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-100 border border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400 transition-colors">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Passet slutfört</span>
            </div>
          )}
        </div>
      </div>

      {/* Workout Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <GlassCard className="md:col-span-2">
          <GlassCardHeader className="pb-3">
            <GlassCardTitle className="text-lg font-black tracking-tight flex items-center gap-2 text-slate-900 dark:text-white transition-colors">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-500 transition-colors" />
              Instruktioner
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
              <p className="text-slate-500 dark:text-slate-500 italic transition-colors">Inga specifika instruktioner angivna.</p>
            )}
          </GlassCardContent>
        </GlassCard>

        <div className="space-y-6">
          <GlassCard>
            <GlassCardHeader className="pb-3">
              <GlassCardTitle className="text-lg font-black tracking-tight flex items-center gap-2 text-blue-600 dark:text-blue-400 transition-colors">
                <Zap className="h-4 w-4" />
                Planerade Mål
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="space-y-6">
              {workout.duration && (
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border-blue-100 dark:bg-blue-500/10 dark:border-blue-500/10 flex items-center justify-center border transition-colors">
                    <Clock className="h-5 w-5 text-blue-600 dark:text-blue-500 transition-colors" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-colors">Tid</p>
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
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-colors">Distans</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white transition-colors">{workout.distance} km</p>
                  </div>
                </div>
              )}
            </GlassCardContent>
          </GlassCard>

          {!isCompleted && (
            <Link href={`/athlete/workouts/${workout.id}/log`} className="block">
              <Button className="w-full h-16 rounded-3xl bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-sm shadow-[0_10px_30px_rgba(37,99,235,0.2)] transition-all hover:scale-[1.02] active:scale-[0.98]">
                Logga detta pass
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
              <GlassCardTitle className="text-xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic transition-colors">Genomfört Logg</GlassCardTitle>
              <Link href={`/athlete/workouts/${workout.id}/log`}>
                <Button variant="ghost" size="sm" className="h-9 px-4 rounded-xl font-black uppercase tracking-widest text-[9px] bg-white border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 dark:text-slate-300 transition-colors">
                  <Edit className="mr-2 h-3.5 w-3.5" />
                  Redigera
                </Button>
              </Link>
            </div>
          </GlassCardHeader>
          <GlassCardContent className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {existingLog.duration && (
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-colors">Loggad Tid</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white transition-colors">{existingLog.duration} <span className="text-xs text-slate-500 dark:text-slate-600">min</span></p>
                </div>
              )}
              {existingLog.distance && (
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-colors">Loggad Distans</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white transition-colors">{existingLog.distance} <span className="text-xs text-slate-500 dark:text-slate-600">km</span></p>
                </div>
              )}
              {existingLog.avgPace && (
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-colors">Tempo</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white transition-colors">{existingLog.avgPace} <span className="text-xs text-slate-500 dark:text-slate-600">/km</span></p>
                </div>
              )}
              {existingLog.avgHR && (
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-colors">Snittpuls</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white transition-colors">{existingLog.avgHR} <span className="text-xs text-slate-500 dark:text-slate-600">bpm</span></p>
                </div>
              )}
            </div>

            {(existingLog.perceivedEffort || existingLog.difficulty) && (
              <div className="pt-6 border-t border-slate-200 dark:border-white/10 transition-colors">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {existingLog.perceivedEffort && (
                    <div className="space-y-2">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-colors">Perceived Effort (RPE)</p>
                      <div className={cn(
                        "inline-flex items-center h-10 px-4 rounded-2xl border font-bold text-sm transition-colors",
                        getEffortBadgeClass(existingLog.perceivedEffort, true)
                      )}>
                        {existingLog.perceivedEffort}/10 — {getEffortLabel(existingLog.perceivedEffort)}
                      </div>
                    </div>
                  )}
                  {existingLog.difficulty && (
                    <div className="space-y-2">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 transition-colors">Känslomässig Svårighet</p>
                      <div className="inline-flex items-center h-10 px-4 rounded-2xl border border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white font-bold text-sm transition-colors">
                        {existingLog.difficulty}/10 — {getDifficultyLabel(existingLog.difficulty)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {existingLog.feeling && (
              <div className="pt-6 border-t border-slate-200 dark:border-white/10 transition-colors">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500 mb-2 transition-colors">Känsla</p>
                <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed italic transition-colors">&quot;{existingLog.feeling}&quot;</p>
              </div>
            )}

            {existingLog.notes && (
              <div className="pt-6 border-t border-slate-200 dark:border-white/10 transition-colors">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500 mb-2 transition-colors">Anteckningar</p>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-600 dark:bg-white/5 dark:border-white/5 dark:text-slate-400 text-sm whitespace-pre-wrap leading-relaxed transition-colors">
                  {existingLog.notes}
                </div>
              </div>
            )}

            {(existingLog.stravaUrl || existingLog.dataFileUrl) && (
              <div className="pt-6 border-t border-slate-200 dark:border-white/10 transition-colors">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500 mb-3 transition-colors">Integrations & Data</p>
                <div className="flex flex-wrap gap-3">
                  {existingLog.stravaUrl && (
                    <a href={existingLog.stravaUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm" className="h-10 px-5 rounded-xl bg-[#FC642D]/10 border border-[#FC642D]/20 text-[#FC642D] hover:bg-[#FC642D]/20 font-black uppercase tracking-widest text-[10px]">
                        Visa på Strava
                      </Button>
                    </a>
                  )}
                  {existingLog.dataFileUrl && (
                    <a href={existingLog.dataFileUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm" className="h-10 px-5 rounded-xl bg-slate-100 border-slate-200 text-slate-600 dark:bg-white/10 dark:border-white/20 dark:text-white font-black uppercase tracking-widest text-[10px] transition-colors">
                        Datafil
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
                        <p className="font-black text-blue-600 dark:text-blue-500 text-[10px] uppercase tracking-[0.2em] transition-colors">Feedback från Coach</p>
                        <span className="text-[8px] font-black text-slate-500 dark:text-slate-600 uppercase transition-colors">Privat Logg</span>
                      </div>
                      <p className="text-blue-900 dark:text-blue-100 text-sm font-medium leading-relaxed whitespace-pre-wrap transition-colors">
                        {existingLog.coachFeedback}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-600 pt-6 border-t border-slate-200 dark:border-white/5 flex justify-between items-center transition-colors">
              <span>Timestamp</span>
              <span>{existingLog.completedAt ? format(new Date(existingLog.completedAt), 'PPP HH:mm', { locale: sv }) : '-'}</span>
            </div>
          </GlassCardContent>
        </GlassCard>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 mt-12 mb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <Link href={`/athlete/workouts/${workout.id}/log`} className="flex-1">
          <Button className={cn(
            "w-full h-16 rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99]",
            isCompleted
              ? "bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:border-white/10 dark:text-white dark:hover:bg-white/20"
              : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20"
          )}>
            {isCompleted ? (
              <><Edit className="mr-2 h-4 w-4" /> Redigera logg</>
            ) : (
              <><CheckCircle2 className="mr-2 h-4 w-4" /> Logga genomfört pass</>
            )}
          </Button>
        </Link>
      </div>
    </div>
  )
}

// Helper functions
function formatWorkoutType(type: string): string {
  const types: Record<string, string> = {
    RUNNING: 'Löpning',
    CYCLING: 'Cykling',
    STRENGTH: 'Styrka',
    CORE: 'Core',
    PLYOMETRIC: 'Plyometri',
    RECOVERY: 'Återhämtning',
    SKIING: 'Skidåkning',
    OTHER: 'Annat',
  }
  return types[type] || type
}

function formatIntensity(intensity: string): string {
  const intensities: Record<string, string> = {
    RECOVERY: 'Återhämtning',
    EASY: 'Lätt',
    MODERATE: 'Måttlig',
    THRESHOLD: 'Tröskel',
    INTERVAL: 'Intervall',
    MAX: 'Maximal',
  }
  return intensities[intensity] || intensity
}

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

function getEffortLabel(effort: number): string {
  if (effort <= 2) return 'Mycket lätt'
  if (effort <= 4) return 'Lätt'
  if (effort <= 6) return 'Måttlig'
  if (effort <= 8) return 'Hård'
  return 'Maximal'
}

function getDifficultyLabel(difficulty: number): string {
  if (difficulty <= 3) return 'Lättare än planat'
  if (difficulty <= 5) return 'Som planat'
  if (difficulty <= 7) return 'Slitigt'
  return 'Väldigt tufft'
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

