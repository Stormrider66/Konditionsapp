'use client'

/**
 * Headless Voice Coach
 *
 * Minimal floating overlay for AI voice coaching without full-screen focus mode.
 * Designed for use alongside Garmin watch — phone stays in pocket, all interaction via audio.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Mic, MicOff, Radio, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useLiveVoiceCoach } from '@/hooks/use-live-voice-coach'
import { useAthleteHR } from '@/hooks/use-athlete-hr'
import { useBasePath } from '@/lib/contexts/BasePathContext'

interface HeadlessVoiceCoachProps {
  assignmentId: string
  workoutType: 'cardio' | 'strength' | 'hybrid'
  onClose: () => void
}

interface WorkoutSegment {
  type: string
  typeName: string
  plannedDuration?: number
  plannedZone?: number
  notes?: string
}

export function HeadlessVoiceCoach({
  assignmentId,
  workoutType,
  onClose,
}: HeadlessVoiceCoachProps) {
  const router = useRouter()
  const basePath = useBasePath()
  const [segments, setSegments] = useState<WorkoutSegment[]>([])
  const [mounted, setMounted] = useState(false)

  // Fetch workout structure for the hook
  useEffect(() => {
    setMounted(true)

    const url = workoutType === 'strength'
      ? `/api/strength-sessions/${assignmentId}/focus-mode`
      : workoutType === 'hybrid'
        ? `/api/hybrid-workouts/${assignmentId}/focus-mode`
        : `/api/cardio-sessions/${assignmentId}/focus-mode`

    fetch(url)
      .then((r) => r.json())
      .then((result) => {
        const data = result.data
        if (!data) return

        if (workoutType === 'strength' && data.exercises) {
          setSegments(
            data.exercises.map((e: { section: string; name: string; sets: number; repsTarget: number | string; weight?: number }) => ({
              type: e.section,
              typeName: e.name,
              notes: `${e.sets} sets × ${e.repsTarget} reps${e.weight ? ` @ ${e.weight}kg` : ''}`,
            }))
          )
        } else if (workoutType === 'hybrid' && data.movements) {
          setSegments(
            data.movements.map((m: { name: string; reps?: number; calories?: number; distance?: number; weight?: number }) => ({
              type: 'HYBRID',
              typeName: m.name,
              notes: [m.reps && `${m.reps} reps`, m.calories && `${m.calories} cal`, m.distance && `${m.distance}m`].filter(Boolean).join(', '),
            }))
          )
        } else if (data.segments) {
          // Cardio segments from focus-mode API
          const segs = Array.isArray(data.segments) ? data.segments : []
          setSegments(
            segs.map((s: { type?: string; typeName?: string; plannedDuration?: number; plannedZone?: number; notes?: string }) => ({
              type: s.type || 'STEADY',
              typeName: s.typeName || s.type || 'Steady',
              plannedDuration: s.plannedDuration,
              plannedZone: s.plannedZone,
              notes: s.notes,
            }))
          )
        }
      })
      .catch(() => {})
  }, [assignmentId, workoutType])

  const hr = useAthleteHR(true)

  const liveCoach = useLiveVoiceCoach({
    assignmentId,
    workoutType,
    segments,
    currentSegmentIndex: 0,
    isTimerRunning: false,
    timerSecondsRemaining: null,
    heartRate: hr.heartRate,
    heartRateZone: hr.zone,
    toolCallbacks: {
      onEndCoaching: onClose,
      onPauseWorkout: () => {},
      onResumeWorkout: () => {},
      onAdjustIntensity: () => {},
      onSkipSegment: () => {},
      onExtendSegment: () => {},
      onMarkSegmentComplete: () => {},
      onSkipExercise: () => {},
      onCompleteExercise: () => {},
      onStartRestTimer: () => {},
      onLogSet: workoutType === 'strength'
        ? async (logData) => {
            // In headless mode, we need the current exercise info from the AI's context
            // The init route loaded the full exercise list, so the AI tracks which exercise is current
            // We pass the data to the API — the AI should include exerciseId context
            try {
              const response = await fetch(`/api/strength-sessions/${assignmentId}/sets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ...logData,
                  // In headless mode, exerciseId comes from the AI's function call args
                  // The hook passes weight + reps, the API matches to current exercise
                }),
              })
              if (!response.ok) return { success: false }
              const result = await response.json()
              return {
                success: true,
                estimated1RM: result.data?.estimated1RM,
                setNumber: result.data?.setLog?.setNumber,
                completedSets: result.data?.progress?.completedSets,
                targetSets: result.data?.progress?.targetSets,
              }
            } catch {
              return { success: false }
            }
          }
        : undefined,
    },
  })

  // Auto-connect when segments are loaded
  useEffect(() => {
    if (segments.length > 0 && liveCoach.status === 'idle') {
      liveCoach.connect()
    }
  }, [segments.length, liveCoach.status]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) return null

  const isActive = liveCoach.status === 'connected'
  const isConnecting = liveCoach.status === 'connecting'
  const aiAllowanceActionHref = liveCoach.aiAllowanceAction
    ? `${basePath}${liveCoach.aiAllowanceAction.url}`
    : null

  const pill = (
    <div className="fixed bottom-6 left-4 right-4 z-[60] flex justify-center pointer-events-none">
      <div className="pointer-events-auto bg-slate-900 dark:bg-slate-800 text-white rounded-2xl px-4 py-3 shadow-2xl shadow-black/30 flex items-center gap-3 max-w-md w-full border border-white/10">
        {/* Status indicator */}
        <div className="flex-shrink-0">
          {isConnecting ? (
            <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
          ) : (
            <div className="relative">
              <Radio className={cn('h-5 w-5', isActive ? 'text-emerald-400' : 'text-red-400')} />
              {isActive && (
                <span className={cn(
                  'absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full',
                  liveCoach.isSpeaking ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-500'
                )} />
              )}
            </div>
          )}
        </div>

        {/* Transcript / status text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm truncate">
            {isConnecting
              ? 'Ansluter AI Coach...'
              : liveCoach.error
                ? liveCoach.error
                : liveCoach.transcript || (isActive ? 'AI Coach aktiv — lyssnar...' : 'Startar...')}
          </p>
          {hr.heartRate && isActive && (
            <p className="text-xs text-slate-400">
              HR: {hr.heartRate} bpm {hr.zone ? `(Z${hr.zone})` : ''}
            </p>
          )}
        </div>

        {aiAllowanceActionHref && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 shrink-0 border-amber-400/30 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20"
            onClick={() => router.push(aiAllowanceActionHref)}
          >
            {liveCoach.aiAllowanceAction?.label ?? 'Hantera AI-krediter'}
          </Button>
        )}

        {/* Mute toggle */}
        {isActive && (
          <Button
            variant="ghost"
            size="icon"
            onClick={liveCoach.toggleMute}
            className={cn('h-8 w-8 text-white hover:bg-white/10', liveCoach.isMuted && 'text-red-400')}
          >
            {liveCoach.isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
        )}

        {/* End button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => { liveCoach.disconnect(); onClose() }}
          className="h-8 w-8 text-white hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )

  return pill
}
