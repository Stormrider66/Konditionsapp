'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Activity,
  Clock,
  Heart,
  MapPin,
  Target,
  ExternalLink,
  Dumbbell,
  Timer,
  Zap,
  Trophy,
  TrendingUp,
  MessageSquare,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import {
  UnifiedCalendarItem,
  WORKOUT_TYPE_COLORS,
  INTENSITY_COLORS,
} from '../../types'
import { cn } from '@/lib/utils'
import {
  formatDistanceValue,
  formatDurationMinutes,
  formatWorkoutTypeLabel,
  formatIntensityLabel,
  formatPaceSeconds,
  formatCardioSegmentLabel,
  formatRaceDistanceLabel,
  normalizeMessages,
} from '../formatters'

export interface WorkoutDetailPanelProps {
  workout: UnifiedCalendarItem
  isCoachView?: boolean
  isGlass?: boolean
  onViewWorkoutDetails?: (workoutId: string) => void
}

export interface SidebarWorkoutDetail {
  id: string
  name: string
  type: string
  intensity?: string | null
  duration?: number | null
  distance?: number | null
  instructions?: string | null
  day?: {
    week?: {
      program?: {
        id: string
        clientId: string
      } | null
    } | null
  } | null
}

export interface SidebarWorkoutLog {
  id: string
  completed: boolean
  completedAt: string | null
  duration: number | null
  distance: number | null
  avgPace: string | null
  avgHR: number | null
  perceivedEffort: number | null
  notes: string | null
  coachFeedback: string | null
  intervalResults?: Array<{
    segmentId?: string
    segmentLabel?: string
    reps?: Array<{
      repNumber?: number
      pace?: string
      avgHR?: number
      maxHR?: number
      duration?: number
      distance?: number
      avgPower?: number
      notes?: string
    }>
  }> | null
}

export interface SidebarRaceResult {
  id: string
  raceDate: string
  distance?: string | null
  timeFormatted: string
  goalTime?: string | null
  avgPace?: string | null
  avgHeartRate?: number | null
  trainingProgramId?: string | null
  conditions?: string | null
  athleteNotes?: string | null
  coachNotes?: string | null
  terrain?: string | null
  temperature?: number | null
  windSpeed?: number | null
  elevation?: number | null
  confidence?: string | null
}

export interface SidebarFieldTestDetail {
  id: string
  testType: string
  date: string
  lt1Pace?: number | null
  lt1HR?: number | null
  lt2Pace?: number | null
  lt2HR?: number | null
  confidence?: string | null
  valid: boolean
  notes?: string | null
  warnings?: unknown
  errors?: unknown
  conditions?: Record<string, unknown> | null
  results?: Record<string, unknown> | null
}

export function WorkoutDetailPanel({ workout, isCoachView, isGlass = false, onViewWorkoutDetails }: WorkoutDetailPanelProps) {
  const meta = workout.metadata
  const workoutId = (meta.workoutId as string) || workout.id
  const [detail, setDetail] = useState<SidebarWorkoutDetail | null>(null)
  const [latestLog, setLatestLog] = useState<SidebarWorkoutLog | null>(null)
  const [raceResult, setRaceResult] = useState<SidebarRaceResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    Promise.all([
      fetch(`/api/workouts/${workoutId}`).then((res) => (res.ok ? res.json() : null)),
      fetch(`/api/workouts/${workoutId}/logs`).then((res) => (res.ok ? res.json() : { data: [] })),
    ])
      .then(([workoutData, logsData]) => {
        if (cancelled) return
        setDetail(workoutData)
        const logs = Array.isArray(logsData?.data) ? logsData.data : []
        const completedLog = logs.find((log: SidebarWorkoutLog) => log.completed) || logs[0] || null
        setLatestLog(completedLog)

        const clientId = workoutData?.day?.week?.program?.clientId
        const programId = workoutData?.day?.week?.program?.id
        if (!clientId || !programId || !completedLog?.completedAt) {
          setRaceResult(null)
          return
        }

        fetch(`/api/race-results?clientId=${clientId}`)
          .then((res) => (res.ok ? res.json() : []))
          .then((results: SidebarRaceResult[]) => {
            if (cancelled || !Array.isArray(results)) return
            const targetTime = new Date(completedLog.completedAt as string).getTime()
            const programResults = results.filter((result) => result.trainingProgramId === programId)
            const closest = programResults
              .sort((a, b) => Math.abs(new Date(a.raceDate).getTime() - targetTime) - Math.abs(new Date(b.raceDate).getTime() - targetTime))[0] || null
            setRaceResult(closest)
          })
          .catch(() => {
            if (!cancelled) {
              setRaceResult(null)
            }
          })
      })
      .catch(() => {
        if (cancelled) return
        setDetail(null)
        setLatestLog(null)
        setRaceResult(null)
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [workoutId])

  const workoutType = detail?.type || (meta.workoutType as string) || 'RUNNING'
  const intensity = detail?.intensity || (meta.intensity as string) || 'MODERATE'
  const duration = detail?.duration ?? (meta.duration as number | undefined)
  const distance = detail?.distance ?? (meta.distance as number | undefined)
  const instructions = detail?.instructions || (meta.instructions as string | undefined)
  const isCompleted = latestLog?.completed || (meta.isCompleted as boolean)
  const intervalResults = Array.isArray(latestLog?.intervalResults) ? latestLog.intervalResults : []
  const hasIntervalDetails = intervalResults.some((segment) => Array.isArray(segment.reps) && segment.reps.length > 0)
  const completedDate = latestLog?.completedAt
    ? new Date(latestLog.completedAt).toLocaleDateString('sv-SE', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <div className={cn(
      "mt-6 p-5 rounded-2xl border transition-all duration-500 animate-in fade-in slide-in-from-top-2",
      isGlass
        ? "bg-blue-500/5 border-blue-500/20 shadow-[0_4px_20px_rgba(59,130,246,0.1)]"
        : "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
    )}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-black text-[10px] uppercase tracking-widest flex items-center gap-2 text-blue-400">
          <Activity className="h-4 w-4 text-blue-500" />
          Passdetaljer
        </h4>
        {isCompleted && (
          <Badge variant="secondary" className={cn(
            "text-[10px] uppercase font-bold tracking-tight",
            isGlass ? "bg-emerald-500/20 text-emerald-400 border-none px-2" : "bg-green-100 text-green-700"
          )}>
            Genomfört
          </Badge>
        )}
      </div>

      <div className="space-y-3">
        {isLoading && (
          <div className={cn(
            'flex items-center gap-2 text-xs',
            isGlass ? 'text-slate-400' : 'text-muted-foreground'
          )}>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Laddar passdetaljer
          </div>
        )}

        {/* Title */}
        <div>
          <p className={cn(
            "font-black text-lg tracking-tight",
            isGlass ? "text-white" : ""
          )}>{workout.title}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge
              className={cn(
                'text-xs',
                INTENSITY_COLORS[intensity] || 'bg-yellow-500',
                'text-white'
              )}
            >
              {formatIntensityLabel(intensity)}
            </Badge>
            <Badge variant="outline" className={cn(
              "text-[10px] uppercase font-bold border-none px-2",
              isGlass ? "bg-white/5 text-slate-400" : "text-xs"
            )}>
              {formatWorkoutTypeLabel(workoutType)}
            </Badge>
            {isCompleted && completedDate && (
              <span className={cn(
                'text-[10px] uppercase tracking-widest font-bold',
                isGlass ? 'text-slate-500' : 'text-muted-foreground'
              )}>
                Slutfört {completedDate}
              </span>
            )}
          </div>
        </div>

        {/* Duration & Distance */}
        {(duration || distance) && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {duration && duration > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {duration} min
              </span>
            )}
            {distance && distance > 0 && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {distance} km
              </span>
            )}
          </div>
        )}

        {/* Instructions */}
        {instructions && (
          <div className="text-xs leading-relaxed">
            <p className="font-bold text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Instruktioner</p>
            <p className={cn(
              "whitespace-pre-wrap font-medium",
              isGlass ? "text-slate-300" : ""
            )}>{instructions}</p>
          </div>
        )}

        {latestLog?.completed && (
          <div className={cn(
            'rounded-xl border p-3 space-y-3',
            isGlass ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'
          )}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Genomfört pass
              </p>
              {completedDate && (
                <span className="text-[10px] text-muted-foreground">{completedDate}</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {raceResult?.timeFormatted && (
                <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
                  <p className="text-muted-foreground flex items-center gap-1"><Timer className="h-3 w-3" /> {formatRaceDistanceLabel(raceResult.distance)}</p>
                  <p className="font-semibold">{raceResult.timeFormatted}</p>
                  {raceResult.goalTime ? (
                    <p className="text-[10px] text-muted-foreground mt-0.5">Mål {raceResult.goalTime}</p>
                  ) : null}
                </div>
              )}
              {(latestLog.duration != null || duration) && (
                <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
                  <p className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Tid</p>
                  <p className="font-semibold">
                    {latestLog.duration != null ? `${latestLog.duration} min` : '-'}
                    {duration ? <span className="text-muted-foreground font-normal"> / plan {duration} min</span> : null}
                  </p>
                </div>
              )}
              {(latestLog.distance != null || distance) && (
                <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
                  <p className="text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Distans</p>
                  <p className="font-semibold">
                    {latestLog.distance != null ? `${latestLog.distance} km` : '-'}
                    {distance ? <span className="text-muted-foreground font-normal"> / plan {distance} km</span> : null}
                  </p>
                </div>
              )}
              {latestLog.avgPace && (
                <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
                  <p className="text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Tempo</p>
                  <p className="font-semibold">{latestLog.avgPace}</p>
                </div>
              )}
              {!latestLog.avgPace && raceResult?.avgPace && (
                <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
                  <p className="text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Tävlingstempo</p>
                  <p className="font-semibold">{raceResult.avgPace}</p>
                </div>
              )}
              {(latestLog.avgHR != null || latestLog.perceivedEffort != null) && (
                <div className={cn('rounded-lg border p-2', isGlass ? 'bg-white/5 border-white/10' : 'bg-background')}>
                  <p className="text-muted-foreground flex items-center gap-1"><Heart className="h-3 w-3" /> Belastning</p>
                  <p className="font-semibold">
                    {latestLog.avgHR != null ? `${latestLog.avgHR} bpm` : 'Ingen puls'}
                    {latestLog.perceivedEffort != null ? ` • RPE ${latestLog.perceivedEffort}/10` : ''}
                  </p>
                </div>
              )}
            </div>

            {latestLog.notes && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Atletens anteckningar</p>
                <p className={cn('text-xs whitespace-pre-wrap', isGlass ? 'text-slate-300' : '')}>
                  {latestLog.notes}
                </p>
              </div>
            )}

            {latestLog.coachFeedback && (
              <div className={cn(
                'rounded-lg border p-2.5',
                isGlass ? 'bg-blue-500/5 border-blue-500/20' : 'bg-blue-50 border-blue-200'
              )}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1 flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  Tränarfeedback
                </p>
                <p className={cn('text-xs whitespace-pre-wrap', isGlass ? 'text-slate-300' : '')}>
                  {latestLog.coachFeedback}
                </p>
              </div>
            )}

            {hasIntervalDetails && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Intervall- och splittider</p>
                <div className="space-y-2">
                  {intervalResults.map((segment, segmentIndex) => {
                    const reps = Array.isArray(segment.reps) ? segment.reps : []
                    if (reps.length === 0) return null

                    return (
                      <div
                        key={`${segment.segmentId || 'segment'}-${segmentIndex}`}
                        className={cn(
                          'rounded-lg border p-2.5 space-y-2',
                          isGlass ? 'bg-white/5 border-white/10' : 'bg-background'
                        )}
                      >
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          {segment.segmentLabel || `Block ${segmentIndex + 1}`}
                        </p>
                        <div className="space-y-1.5">
                          {reps.map((rep, repIndex) => (
                            <div key={`${segmentIndex}-${repIndex}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                              <span className="font-semibold">Rep {rep.repNumber || repIndex + 1}</span>
                              {rep.duration ? <span>Tid {formatDurationMinutes(rep.duration)}</span> : null}
                              {rep.distance ? <span>Distans {rep.distance} km</span> : null}
                              {rep.pace ? <span>Tempo {rep.pace}</span> : null}
                              {rep.avgHR ? <span>Puls {rep.avgHR} bpm</span> : null}
                              {rep.avgPower ? <span>Effekt {rep.avgPower} W</span> : null}
                              {rep.notes ? <span className="text-muted-foreground">{rep.notes}</span> : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {onViewWorkoutDetails && (
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "w-full font-bold text-[10px] uppercase tracking-widest h-9",
                isGlass ? "bg-white/5 border-white/10 text-slate-400 hover:text-white" : ""
              )}
              onClick={() => onViewWorkoutDetails(workoutId)}
            >
              <Activity className="h-3.5 w-3.5 mr-1.5" />
              {latestLog?.completed ? 'Visa fullständig genomgång' : 'Visa detaljer'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

