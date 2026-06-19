'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Timer,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { useScreenWakeLock } from '@/hooks/use-screen-wake-lock';
import { useLocale, useTranslations } from '@/i18n/client';
import {
  confirmFutureCompletion,
  readFutureCompletionWarning,
} from '@/lib/workouts/future-completion-client';
import type { HybridMetconData } from '@/types';
import {
  buildHybridPlanSegments,
  formatHybridDurationCompact,
  type HybridPlanMovement,
  type HybridPlanSegment,
} from './hybrid-workout-plan';

interface HybridFocusModeProps {
  assignmentId: string;
  onClose: () => void;
  onComplete?: () => void;
}

interface FocusApiMovement {
  id: string;
  exerciseId: string;
  name: string;
  nameSv?: string;
  nameEn?: string;
  order: number;
  reps?: number;
  calories?: number;
  distance?: number;
  duration?: number;
  weight?: number;
  notes?: string;
}

interface FocusApiRoundLog {
  roundNumber: number;
  completed: boolean;
  duration?: number | null;
}

interface FocusApiWorkoutLog {
  id: string;
  startedAt: string | Date;
  status: string;
  totalRounds?: number | null;
  totalTime?: number | null;
  extraReps?: number | null;
  roundLogs: FocusApiRoundLog[];
}

interface FocusApiWorkout {
  id: string;
  name: string;
  description?: string | null;
  format: string;
  timeCap?: number | null;
  workTime?: number | null;
  restTime?: number | null;
  totalRounds?: number | null;
  totalMinutes?: number | null;
  repScheme?: string | null;
  scalingLevel: string;
  metconData?: unknown;
}

interface HybridFocusData {
  assignment: {
    id: string;
    assignedDate: string | Date;
    status: string;
    notes?: string | null;
    customScaling?: string | null;
    scalingNotes?: string | null;
  };
  workout: FocusApiWorkout;
  workoutLog: FocusApiWorkoutLog | null;
  movements: FocusApiMovement[];
}

interface FocusApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

function isHybridMetconData(value: unknown): value is HybridMetconData {
  return Boolean(
    value
    && typeof value === 'object'
    && Array.isArray((value as { blocks?: unknown }).blocks)
  );
}

function formatClock(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatFallbackMovement(movement: FocusApiMovement, locale: string): HybridPlanMovement {
  const name = locale === 'sv'
    ? movement.nameSv ?? movement.name
    : movement.nameEn ?? movement.name;
  const prescription: string[] = [];

  if (movement.reps) prescription.push(`${movement.reps} reps`);
  if (movement.calories) prescription.push(`${movement.calories} cal`);
  if (movement.distance) prescription.push(`${movement.distance}m`);
  if (movement.duration) prescription.push(formatHybridDurationCompact(movement.duration));
  if (movement.weight) prescription.push(`@ ${movement.weight}kg`);

  const logValue = movement.reps
    ?? (movement.calories ? `${movement.calories} cal` : undefined)
    ?? (movement.distance ? `${movement.distance}m` : undefined)
    ?? (movement.duration ? formatHybridDurationCompact(movement.duration) : '-');

  return {
    id: movement.id,
    exerciseId: movement.exerciseId,
    name,
    label: [name, prescription.join(' ')].filter(Boolean).join(' '),
    logValue,
    notes: movement.notes,
  };
}

function buildFallbackSegments(
  workout: FocusApiWorkout,
  movements: FocusApiMovement[],
  locale: string,
  copy: {
    roundTitle: (block: string, round: number, total: number) => string;
  }
): HybridPlanSegment[] {
  const durationSeconds =
    workout.format === 'AMRAP' && workout.totalMinutes
      ? workout.totalMinutes * 60
      : workout.timeCap
        ?? workout.workTime
        ?? (workout.totalMinutes && workout.totalRounds
          ? Math.round((workout.totalMinutes * 60) / workout.totalRounds)
          : 60);
  const rounds = Math.max(
    1,
    workout.totalRounds
      ?? (workout.totalMinutes ? Math.round((workout.totalMinutes * 60) / durationSeconds) : 1)
  );
  const segmentMovements = [...movements]
    .sort((a, b) => a.order - b.order)
    .map((movement) => formatFallbackMovement(movement, locale));

  return Array.from({ length: rounds }, (_, index) => ({
    id: `${workout.id}-fallback-round-${index + 1}`,
    type: 'work',
    title: rounds > 1 ? copy.roundTitle(workout.name, index + 1, rounds) : workout.name,
    durationSeconds,
    blockTitle: workout.name,
    movements: segmentMovements,
    roundNumber: index + 1,
  }));
}

function getCompletedRoundNumbers(workoutLog: FocusApiWorkoutLog | null): Set<number> {
  return new Set(
    workoutLog?.roundLogs
      .filter((round) => round.completed)
      .map((round) => round.roundNumber) ?? []
  );
}

function getFirstIncompleteIndex(
  segments: HybridPlanSegment[],
  completedRounds: Set<number>
): number {
  const firstIncompleteWork = segments.findIndex(
    (segment) => segment.type === 'work'
      && segment.roundNumber
      && !completedRounds.has(segment.roundNumber)
  );

  return firstIncompleteWork >= 0 ? firstIncompleteWork : Math.max(0, segments.length - 1);
}

export function HybridFocusMode({ assignmentId, onClose, onComplete }: HybridFocusModeProps) {
  const t = useTranslations('components.hybridFocusMode');
  const locale = useLocale();
  const [data, setData] = useState<HybridFocusData | null>(null);
  const [segments, setSegments] = useState<HybridPlanSegment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [segmentElapsedSeconds, setSegmentElapsedSeconds] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [completedRoundNumbers, setCompletedRoundNumbers] = useState<Set<number>>(new Set());
  const [isSavingSegment, setIsSavingSegment] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [sessionRpe, setSessionRpe] = useState(7);
  const [notes, setNotes] = useState('');
  const autoAdvancedRef = useRef(false);

  const { isActive: screenAwake } = useScreenWakeLock({ enabled: hasStarted || isRunning });

  const buildSegmentsForData = useCallback((focusData: HybridFocusData) => {
    const metconData = isHybridMetconData(focusData.workout.metconData)
      ? focusData.workout.metconData
      : null;
    const plannedSegments = buildHybridPlanSegments(metconData, {
      blockTitle: (number) => t('plan.block', { number }),
      roundTitle: (block, round, total) => t('plan.roundTitle', { block, round, total }),
      restAfter: (block) => t('plan.restAfter', { block }),
    });

    if (plannedSegments.length) return plannedSegments;

    return buildFallbackSegments(focusData.workout, focusData.movements, locale, {
      roundTitle: (block, round, total) => t('plan.roundTitle', { block, round, total }),
    });
  }, [locale, t]);

  const fetchFocusData = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/hybrid-workouts/${assignmentId}/focus-mode`, {
        cache: 'no-store',
      });
      const payload = await response.json() as FocusApiResponse<HybridFocusData>;

      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || t('toast.loadFailed'));
      }

      const nextSegments = buildSegmentsForData(payload.data);
      const completedRounds = getCompletedRoundNumbers(payload.data.workoutLog);
      const nextIndex = getFirstIncompleteIndex(nextSegments, completedRounds);

      setData(payload.data);
      setSegments(nextSegments);
      setCompletedRoundNumbers(completedRounds);
      setHasStarted(Boolean(payload.data.workoutLog));
      setCurrentIndex(nextIndex);
      setRemainingSeconds(nextSegments[nextIndex]?.durationSeconds ?? 0);
      setSegmentElapsedSeconds(0);
      autoAdvancedRef.current = false;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('toast.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [assignmentId, buildSegmentsForData, t]);

  useEffect(() => {
    const requestId = window.setTimeout(() => {
      void fetchFocusData();
    }, 0);

    return () => window.clearTimeout(requestId);
  }, [fetchFocusData]);

  const currentSegment = segments[currentIndex];
  const workSegments = useMemo(() => segments.filter((segment) => segment.type === 'work'), [segments]);
  const completedWorkSegments = useMemo(
    () => workSegments.filter((segment) => segment.roundNumber && completedRoundNumbers.has(segment.roundNumber)).length,
    [completedRoundNumbers, workSegments]
  );
  const progressPercent = workSegments.length ? (completedWorkSegments / workSegments.length) * 100 : 0;
  const plannedTotalSeconds = useMemo(
    () => segments.reduce((sum, segment) => sum + segment.durationSeconds, 0),
    [segments]
  );

  const selectSegment = useCallback((index: number) => {
    const nextIndex = Math.max(0, Math.min(index, segments.length - 1));

    setCurrentIndex(nextIndex);
    setRemainingSeconds(segments[nextIndex]?.durationSeconds ?? 0);
    setSegmentElapsedSeconds(0);
    autoAdvancedRef.current = false;
  }, [segments]);

  const advanceToNextSegment = useCallback(() => {
    if (currentIndex >= segments.length - 1) {
      setIsRunning(false);
      setShowComplete(true);
      return;
    }

    selectSegment(currentIndex + 1);
  }, [currentIndex, segments.length, selectSegment]);

  const ensureSessionStarted = useCallback(async () => {
    if (hasStarted) return;

    const response = await fetch(`/api/hybrid-workouts/${assignmentId}/focus-mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const payload = await response.json() as FocusApiResponse<FocusApiWorkoutLog>;

    if (!response.ok || !payload.success) {
      throw new Error(payload.error || t('toast.startFailed'));
    }

    setHasStarted(true);
    setData((previous) => previous
      ? {
          ...previous,
          workoutLog: {
            id: payload.data?.id ?? previous.workoutLog?.id ?? '',
            startedAt: payload.data?.startedAt ?? previous.workoutLog?.startedAt ?? new Date().toISOString(),
            status: payload.data?.status ?? 'SCHEDULED',
            totalRounds: payload.data?.totalRounds ?? previous.workoutLog?.totalRounds,
            totalTime: payload.data?.totalTime ?? previous.workoutLog?.totalTime,
            extraReps: payload.data?.extraReps ?? previous.workoutLog?.extraReps,
            roundLogs: previous.workoutLog?.roundLogs ?? [],
          },
        }
      : previous);
  }, [assignmentId, hasStarted, t]);

  const handleStartPause = async () => {
    try {
      if (!isRunning) {
        await ensureSessionStarted();
      }

      setIsRunning((value) => !value);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('toast.startFailed'));
    }
  };

  const handleResetSegment = () => {
    setRemainingSeconds(currentSegment?.durationSeconds ?? 0);
    setSegmentElapsedSeconds(0);
    autoAdvancedRef.current = false;
  };

  const completeSegment = useCallback(async (
    segment: HybridPlanSegment,
    durationSeconds?: number
  ) => {
    if (segment.type === 'rest') {
      advanceToNextSegment();
      return;
    }

    if (!segment.roundNumber) {
      advanceToNextSegment();
      return;
    }

    setIsSavingSegment(true);

    try {
      await ensureSessionStarted();

      const duration = Math.max(1, durationSeconds || segment.durationSeconds);
      const movements = segment.movements.map((movement) => ({
        movementId: movement.id,
        movementName: movement.name,
        reps: movement.logValue,
        completed: true,
        notes: movement.notes,
      }));

      const response = await fetch(
        `/api/hybrid-workouts/${assignmentId}/rounds/${segment.roundNumber}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            movements,
            duration,
            completed: true,
          }),
        }
      );
      const payload = await response.json() as FocusApiResponse<unknown>;

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || t('toast.roundFailed'));
      }

      setCompletedRoundNumbers((previous) => {
        const next = new Set(previous);
        next.add(segment.roundNumber as number);
        return next;
      });

      advanceToNextSegment();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('toast.roundFailed'));
    } finally {
      setIsSavingSegment(false);
    }
  }, [advanceToNextSegment, assignmentId, ensureSessionStarted, t]);

  const handleCompleteSegment = () => {
    if (!currentSegment) return;

    void completeSegment(
      currentSegment,
      segmentElapsedSeconds || currentSegment.durationSeconds
    );
  };

  useEffect(() => {
    if (!isRunning || showComplete || !currentSegment) return;

    const interval = window.setInterval(() => {
      setElapsedSeconds((value) => value + 1);
      setSegmentElapsedSeconds((value) => value + 1);
      setRemainingSeconds((value) => {
        if (value <= 1) {
          if (!autoAdvancedRef.current) {
            autoAdvancedRef.current = true;
            const finishedSegment = currentSegment;

            window.setTimeout(() => {
              void completeSegment(finishedSegment, finishedSegment.durationSeconds);
            }, 0);
          }

          return 0;
        }

        return value - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [completeSegment, currentSegment, isRunning, showComplete]);

  const handleFinishWorkout = async () => {
    setIsCompleting(true);

    try {
      await ensureSessionStarted();

      const completionPayload = {
        status: 'COMPLETED',
        totalTime: Math.max(1, elapsedSeconds || plannedTotalSeconds),
        totalRounds: completedWorkSegments,
        sessionRPE: sessionRpe,
        notes: notes.trim() || undefined,
      };

      let response = await fetch(`/api/hybrid-workouts/${assignmentId}/focus-mode`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(completionPayload),
      });

      const futureWarning = await readFutureCompletionWarning(response);
      if (futureWarning) {
        if (!confirmFutureCompletion(futureWarning)) return;

        response = await fetch(`/api/hybrid-workouts/${assignmentId}/focus-mode`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...completionPayload, allowFutureCompletion: true }),
        });
      }

      const payload = await response.json() as FocusApiResponse<unknown>;

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || t('toast.completeFailed'));
      }

      toast.success(t('toast.completed'));
      onComplete?.();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('toast.completeFailed'));
    } finally {
      setIsCompleting(false);
    }
  };

  const goPrevious = () => {
    selectSegment(currentIndex - 1);
  };

  const goNext = () => {
    advanceToNextSegment();
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950 text-white">
        <Loader2 className="h-8 w-8 animate-spin text-white/70" />
      </div>
    );
  }

  if (!data || !currentSegment) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950 p-6 text-white">
        <div className="w-full max-w-sm space-y-4 rounded-lg border border-white/10 bg-white/5 p-5 text-center">
          <p className="text-sm text-white/70">{t('empty')}</p>
          <div className="flex justify-center gap-2">
            <Button variant="secondary" onClick={fetchFocusData}>
              {t('actions.retry')}
            </Button>
            <Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={onClose}>
              {t('actions.close')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (showComplete) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950 p-4 text-white">
        <div className="w-full max-w-md space-y-5 rounded-lg border border-white/10 bg-neutral-900 p-5 shadow-2xl">
          <div className="text-center">
            <CheckCircle2 className="mx-auto mb-3 h-14 w-14 text-emerald-400" />
            <h2 className="text-2xl font-bold">{t('completion.title')}</h2>
            <p className="mt-1 text-sm text-white/65">
              {t('completion.summary', {
                completed: completedWorkSegments,
                total: workSegments.length,
                time: formatClock(elapsedSeconds || plannedTotalSeconds),
              })}
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium">{t('completion.rpe', { rpe: sessionRpe })}</span>
                <span className="text-white/55">1-10</span>
              </div>
              <Slider
                value={[sessionRpe]}
                min={1}
                max={10}
                step={1}
                onValueChange={(value) => setSessionRpe(value[0] ?? 7)}
              />
            </div>

            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={t('completion.notesPlaceholder')}
              className="min-h-24 border-white/10 bg-white/10 text-white placeholder:text-white/45"
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              variant="outline"
              className="border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white"
              onClick={() => setShowComplete(false)}
              disabled={isCompleting}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              {t('actions.backToPlan')}
            </Button>
            <Button onClick={handleFinishWorkout} disabled={isCompleting}>
              {isCompleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              {t('actions.saveWorkout')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentRoundDone = currentSegment.roundNumber
    ? completedRoundNumbers.has(currentSegment.roundNumber)
    : false;

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950 text-white">
      <div className="flex h-full flex-col">
        <header className="flex shrink-0 items-center gap-3 border-b border-white/10 px-3 py-3 sm:px-5">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 hover:text-white"
            onClick={onClose}
            aria-label={t('actions.close')}
          >
            <X className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-base font-semibold sm:text-lg">{data.workout.name}</h1>
              <Badge className="bg-emerald-500 text-white">{t('badge')}</Badge>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-white/55">
              <span>{data.workout.format}</span>
              <span>{t(screenAwake ? 'screen.awake' : 'screen.standard')}</span>
            </div>
          </div>
          <Button
            variant="outline"
            className="hidden border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white sm:inline-flex"
            onClick={() => setShowComplete(true)}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {t('actions.finish')}
          </Button>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto grid w-full max-w-6xl gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-6">
            <section className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/65">
                    {t('progress', {
                      completed: completedWorkSegments,
                      total: workSegments.length,
                    })}
                  </span>
                  <span className="text-white/55">
                    {t('step', { current: currentIndex + 1, total: segments.length })}
                  </span>
                </div>
                <Progress value={progressPercent} className="h-2 bg-white/10" indicatorClassName="bg-emerald-400" />
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4 sm:p-6">
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <Badge
                    className={
                      currentSegment.type === 'rest'
                        ? 'bg-amber-500 text-neutral-950'
                        : 'bg-emerald-500 text-white'
                    }
                  >
                    {currentSegment.type === 'rest' ? t('type.rest') : t('type.work')}
                  </Badge>
                  {currentRoundDone && (
                    <Badge variant="outline" className="border-emerald-400/50 text-emerald-200">
                      {t('type.completed')}
                    </Badge>
                  )}
                  <span className="text-sm text-white/55">
                    {currentSegment.blockTitle}
                  </span>
                </div>

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
                  <div className="min-w-0">
                    <h2 className="text-2xl font-semibold tracking-normal sm:text-3xl">
                      {currentSegment.title}
                    </h2>
                    {currentSegment.notes && (
                      <p className="mt-2 text-sm leading-6 text-white/65">{currentSegment.notes}</p>
                    )}
                  </div>

                  <div className="rounded-lg bg-neutral-950/70 p-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-xs uppercase text-white/45">
                      <Timer className="h-4 w-4" />
                      {t('timer.remaining')}
                    </div>
                    <div className="mt-2 font-mono text-6xl font-bold leading-none sm:text-7xl">
                      {formatClock(remainingSeconds)}
                    </div>
                    <div className="mt-3 text-xs text-white/45">
                      {t('timer.elapsed', { time: formatClock(elapsedSeconds) })}
                    </div>
                  </div>
                </div>

                {currentSegment.movements.length > 0 ? (
                  <div className="mt-6 grid gap-3">
                    {currentSegment.movements.map((movement, index) => (
                      <div
                        key={`${currentSegment.id}-${movement.id}-${index}`}
                        className="grid grid-cols-[40px_minmax(0,1fr)] gap-3 rounded-lg border border-white/10 bg-neutral-950/50 p-3"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-semibold">
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="break-words text-base font-medium">{movement.label}</div>
                          {movement.notes && (
                            <div className="mt-1 text-sm text-white/55">{movement.notes}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-6 rounded-lg border border-amber-400/20 bg-amber-400/10 p-4 text-center text-amber-100">
                    {t('restMessage')}
                  </div>
                )}
              </div>

              <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr_1fr]">
                <Button
                  variant="outline"
                  className="h-12 border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white"
                  onClick={goPrevious}
                  disabled={currentIndex === 0 || isSavingSegment}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  {t('actions.previous')}
                </Button>
                <Button className="h-12" onClick={handleStartPause} disabled={isSavingSegment}>
                  {isRunning ? (
                    <Pause className="mr-2 h-5 w-5" />
                  ) : (
                    <Play className="mr-2 h-5 w-5" />
                  )}
                  {isRunning ? t('actions.pause') : t('actions.start')}
                </Button>
                <Button
                  variant="outline"
                  className="h-12 border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white"
                  onClick={goNext}
                  disabled={currentIndex >= segments.length - 1 || isSavingSegment}
                >
                  {t('actions.next')}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-2 sm:grid-cols-[1fr_1.2fr]">
                <Button
                  variant="outline"
                  className="h-12 border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white"
                  onClick={handleResetSegment}
                  disabled={isSavingSegment}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {t('actions.resetSegment')}
                </Button>
                <Button className="h-12" onClick={handleCompleteSegment} disabled={isSavingSegment}>
                  {isSavingSegment ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : currentSegment.type === 'rest' ? (
                    <SkipForward className="mr-2 h-5 w-5" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                  )}
                  {currentSegment.type === 'rest' ? t('actions.skipRest') : t('actions.completeRound')}
                </Button>
              </div>
            </section>

            <aside className="space-y-4">
              <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-sm font-semibold uppercase text-white/70">
                    <Activity className="h-4 w-4" />
                    {t('plan.title')}
                  </h2>
                  <span className="text-xs text-white/45">{formatClock(plannedTotalSeconds)}</span>
                </div>
                <div className="max-h-[48vh] space-y-2 overflow-y-auto pr-1">
                  {segments.map((segment, index) => {
                    const isActive = index === currentIndex;
                    const isCompleted = segment.roundNumber
                      ? completedRoundNumbers.has(segment.roundNumber)
                      : index < currentIndex;

                    return (
                      <button
                        key={segment.id}
                        type="button"
                        className={[
                          'flex w-full items-start gap-3 rounded-md border p-3 text-left transition',
                          isActive
                            ? 'border-emerald-400 bg-emerald-400/12'
                            : 'border-white/10 bg-neutral-950/35 hover:bg-white/10',
                        ].join(' ')}
                        onClick={() => selectSegment(index)}
                      >
                        <div
                          className={[
                            'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                            isCompleted
                              ? 'bg-emerald-500 text-white'
                              : segment.type === 'rest'
                                ? 'bg-amber-400 text-neutral-950'
                                : 'bg-white/10 text-white',
                          ].join(' ')}
                        >
                          {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="break-words text-sm font-medium">{segment.title}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/45">
                            <span>{formatClock(segment.durationSeconds)}</span>
                            {segment.movements.length > 0 && (
                              <span className="flex items-center gap-1">
                                <Dumbbell className="h-3 w-3" />
                                {segment.movements.length}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button className="h-12 w-full sm:hidden" onClick={() => setShowComplete(true)}>
                <CheckCircle2 className="mr-2 h-5 w-5" />
                {t('actions.finish')}
              </Button>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
