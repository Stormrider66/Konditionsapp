'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  LogOut,
  Timer,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import {
  confirmFutureCompletion,
  readFutureCompletionWarning,
} from '@/lib/workouts/future-completion-client'
import { KioskSetLogger } from './KioskSetLogger'
import {
  buildCoachQuery,
  exerciseName,
  type FocusModeApiResponse,
  type FocusModeData,
  type KioskAssignment,
  type Locale,
  statusLabel,
  statusTone,
  text,
} from './shared'

interface TeamKioskWorkoutPanelProps {
  assignment: KioskAssignment
  athleteName: string
  teamId: string
  businessSlug: string
  locale: Locale
  onDirtyChange: (dirty: boolean) => void
  onActivity: () => void
  onReturn: () => void
  onLogged: () => void
}

export function TeamKioskWorkoutPanel({
  assignment,
  athleteName,
  teamId,
  businessSlug,
  locale,
  onDirtyChange,
  onActivity,
  onReturn,
  onLogged,
}: TeamKioskWorkoutPanelProps) {
  const [data, setData] = useState<FocusModeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [dirty, setDirty] = useState(false)
  const [sessionRpe, setSessionRpe] = useState(7)
  const [completing, setCompleting] = useState(false)

  const query = useMemo(() => buildCoachQuery(teamId, businessSlug), [businessSlug, teamId])

  const loadWorkout = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/strength-sessions/${assignment.id}/focus-mode?${query}`, {
        headers: { 'x-business-slug': businessSlug },
      })
      const result = (await response.json()) as FocusModeApiResponse
      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || text(locale, 'Kunde inte ladda passet.', 'Could not load the workout.'))
      }
      setData(result.data)
      setCurrentIndex(
        result.data.progress.currentExerciseIndex < result.data.exercises.length
          ? result.data.progress.currentExerciseIndex
          : Math.max(0, result.data.exercises.length - 1)
      )
      setDirty(false)
      onDirtyChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : text(locale, 'Kunde inte ladda passet.', 'Could not load the workout.'))
    } finally {
      setLoading(false)
    }
  }, [assignment.id, businessSlug, locale, onDirtyChange, query])

  useEffect(() => {
    void Promise.resolve().then(loadWorkout)
    return () => onDirtyChange(false)
  }, [loadWorkout, onDirtyChange])

  const currentExercise = data?.exercises[currentIndex] ?? null
  const nextSetNumber = currentExercise ? currentExercise.completedSets + 1 : 1
  const currentSetRow = currentExercise?.setRows?.[nextSetNumber - 1]
  const targetReps = currentSetRow?.reps ?? currentExercise?.repsTarget ?? 8
  const targetWeight = currentSetRow?.weight ?? currentExercise?.weight
  const targetPercent = currentSetRow?.weightPercent ?? currentExercise?.weightPercent
  const previousLog = currentExercise?.setLogs[currentExercise.setLogs.length - 1] ?? null
  const lastSession = currentExercise?.lastPerformance
  const preferPrescription = currentSetRow != null || targetPercent != null
  const exerciseComplete = currentExercise ? currentExercise.completedSets >= currentExercise.sets : false

  const handleDirtyChange = (next: boolean) => {
    setDirty(next)
    onDirtyChange(next)
    if (next) onActivity()
  }

  const chooseExercise = (index: number) => {
    if (dirty) {
      toast.warning(text(locale, 'Spara eller avbryt setet först.', 'Save or cancel the set first.'))
      return
    }
    setCurrentIndex(index)
    onActivity()
  }

  const handleComplete = async () => {
    if (dirty) {
      toast.warning(text(locale, 'Spara eller avbryt setet först.', 'Save or cancel the set first.'))
      return
    }
    setCompleting(true)
    try {
      const payload = {
        status: 'COMPLETED',
        rpe: sessionRpe,
        duration: data?.workout.estimatedDuration ?? undefined,
      }
      let response = await fetch(`/api/strength-sessions/${assignment.id}/focus-mode?${query}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-business-slug': businessSlug },
        body: JSON.stringify(payload),
      })

      const futureWarning = await readFutureCompletionWarning(response)
      if (futureWarning) {
        if (!confirmFutureCompletion(futureWarning)) return
        response = await fetch(`/api/strength-sessions/${assignment.id}/focus-mode?${query}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-business-slug': businessSlug },
          body: JSON.stringify({ ...payload, allowFutureCompletion: true }),
        })
      }

      if (!response.ok) throw new Error(text(locale, 'Kunde inte markera passet klart.', 'Could not complete the workout.'))
      toast.success(text(locale, 'Passet markerades klart.', 'Workout marked complete.'))
      onLogged()
      onReturn()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : text(locale, 'Kunde inte markera passet klart.', 'Could not complete the workout.'))
    } finally {
      setCompleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin" />
        {text(locale, 'Laddar pass...', 'Loading workout...')}
      </div>
    )
  }

  if (error || !data || !currentExercise) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="max-w-md rounded-lg border bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-slate-600">{error ?? text(locale, 'Passet saknar övningar.', 'The workout has no exercises.')}</p>
          <Button type="button" className="mt-4" onClick={onReturn}>
            {text(locale, 'Tillbaka till listan', 'Back to list')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-slate-950 text-white">
                {text(locale, 'Loggar för', 'Logging for')}
              </Badge>
              <h1 className="truncate text-xl font-bold">{athleteName}</h1>
              <span className={cn('h-2.5 w-2.5 rounded-full', statusTone(data.assignment.status))} />
              <span className="text-sm text-slate-600">{statusLabel(data.assignment.status, locale)}</span>
            </div>
            <p className="mt-1 truncate text-sm text-slate-600">{data.workout.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onReturn}>
              <LogOut className="h-4 w-4" />
              {text(locale, 'Byt spelare', 'Switch player')}
            </Button>
            <Button type="button" onClick={() => void handleComplete()} disabled={completing}>
              {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {text(locale, 'Pass klart', 'Workout done')}
            </Button>
          </div>
        </div>
        {dirty && (
          <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
            {text(locale, 'Osparat set. Spara eller avbryt innan du byter spelare.', 'Unsaved set. Save or cancel before switching players.')}
          </div>
        )}
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
            <span>{data.progress.completedSets}/{data.progress.totalSetsTarget} set</span>
            <span>{data.progress.percentComplete}%</span>
          </div>
          <Progress value={data.progress.percentComplete} className="h-2" />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden min-h-0 overflow-y-auto border-r bg-white p-3 xl:block">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {text(locale, 'Övningar', 'Exercises')}
          </p>
          <div className="space-y-1.5">
            {data.exercises.map((exercise, index) => {
              const complete = exercise.completedSets >= exercise.sets
              return (
                <button
                  key={exercise.id}
                  type="button"
                  onClick={() => chooseExercise(index)}
                  className={cn(
                    'w-full rounded-md border px-2.5 py-2 text-left transition',
                    index === currentIndex
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn('h-2.5 w-2.5 rounded-full', complete ? 'bg-emerald-500' : 'bg-slate-300')} />
                    <p className="truncate text-sm font-semibold">{exerciseName(exercise, locale)}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {exercise.completedSets}/{exercise.sets} set · {exercise.section}
                  </p>
                </button>
              )
            })}
          </div>
        </aside>

        <section className="min-h-0 overflow-y-auto p-4">
          <div className="mx-auto max-w-4xl space-y-4">
            <div className="flex items-center justify-between gap-2 xl:hidden">
              <Button type="button" variant="outline" size="sm" onClick={() => chooseExercise(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <p className="text-sm font-semibold">
                {currentIndex + 1}/{data.exercises.length}
              </p>
              <Button type="button" variant="outline" size="sm" onClick={() => chooseExercise(Math.min(data.exercises.length - 1, currentIndex + 1))} disabled={currentIndex >= data.exercises.length - 1}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="rounded-lg border bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Badge variant="outline">{currentExercise.section}</Badge>
                  <h2 className="mt-2 text-3xl font-bold tracking-normal">{exerciseName(currentExercise, locale)}</h2>
                  <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-600">
                    <span>{currentExercise.sets} set</span>
                    <span>·</span>
                    <span>{currentExercise.repsTarget} reps</span>
                    {currentExercise.tempo && (
                      <>
                        <span>·</span>
                        <span>{currentExercise.tempo}</span>
                      </>
                    )}
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Timer className="h-4 w-4" />
                      {currentExercise.restSeconds}s
                    </span>
                  </div>
                </div>
                <div className="rounded-md border bg-slate-50 px-3 py-2 text-right">
                  <p className="text-xs font-semibold uppercase text-slate-500">{text(locale, 'Nästa set', 'Next set')}</p>
                  <p className="text-2xl font-bold">{Math.min(nextSetNumber, currentExercise.sets)}</p>
                </div>
              </div>

              {currentExercise.notes && (
                <p className="mt-4 rounded-md border bg-slate-50 p-3 text-sm text-slate-700">{currentExercise.notes}</p>
              )}

              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <MetricCard label={text(locale, 'Mål vikt', 'Target weight')} value={targetWeight ? `${targetWeight} kg` : targetPercent ? `${targetPercent}%` : '-'} />
                <MetricCard label={text(locale, 'Mål reps', 'Target reps')} value={String(targetReps)} />
                <MetricCard
                  label={text(locale, 'Förra passet', 'Last time')}
                  value={lastSession ? `${lastSession.weight} kg × ${lastSession.reps}` : '-'}
                />
                <MetricCard label={text(locale, 'Senast loggat', 'Last logged')} value={previousLog ? `${previousLog.weight} kg × ${previousLog.repsCompleted}` : '-'} />
              </div>
            </div>

            {exerciseComplete ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-center text-emerald-900">
                <CheckCircle2 className="mx-auto mb-2 h-8 w-8" />
                <p className="font-semibold">{text(locale, 'Övningen är klar.', 'This exercise is complete.')}</p>
                <p className="mt-1 text-sm">{text(locale, 'Välj nästa övning eller markera hela passet klart.', 'Choose the next exercise or mark the whole workout done.')}</p>
              </div>
            ) : (
              <KioskSetLogger
                key={`${currentExercise.id}-${nextSetNumber}`}
                assignmentId={assignment.id}
                query={query}
                businessSlug={businessSlug}
                locale={locale}
                exercise={currentExercise}
                setNumber={nextSetNumber}
                targetWeight={targetWeight}
                targetReps={targetReps}
                previousLog={previousLog}
                lastSession={lastSession}
                preferTargetWeight={preferPrescription}
                onDirtyChange={handleDirtyChange}
                onActivity={onActivity}
                onSaved={async () => {
                  await loadWorkout()
                  onLogged()
                }}
              />
            )}

            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold">{text(locale, 'Pass-RPE', 'Session RPE')}</p>
                <Badge variant="secondary">{sessionRpe}/10</Badge>
              </div>
              <Slider
                value={[sessionRpe]}
                min={1}
                max={10}
                step={1}
                onValueChange={([value]) => {
                  setSessionRpe(value)
                  onActivity()
                }}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-slate-50 px-3 py-2">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 truncate text-lg font-bold">{value}</p>
    </div>
  )
}
