'use client';

/**
 * WorkoutTimer Component
 *
 * A versatile timer for CrossFit-style workouts supporting:
 * - Countdown timer (For Time with time cap)
 * - Count-up stopwatch (For Time without cap)
 * - AMRAP timer (countdown with round tracking)
 * - EMOM timer (minute-by-minute intervals)
 * - Tabata timer (20s work / 10s rest × 8)
 * - Custom intervals (work/rest periods)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Clock,
  Timer,
  Repeat,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

type TimerMode = 'FOR_TIME' | 'AMRAP' | 'EMOM' | 'TABATA' | 'INTERVALS' | 'STOPWATCH';

interface WorkoutTimerProps {
  mode: TimerMode;
  totalSeconds?: number;  // Total time for AMRAP/EMOM/Time Cap
  workSeconds?: number;   // Work interval for Tabata/Intervals
  restSeconds?: number;   // Rest interval for Tabata/Intervals
  rounds?: number;        // Number of rounds for EMOM/Tabata/Intervals
  onComplete?: (finalTime: number) => void;
  onRoundComplete?: (round: number) => void;
}

export function WorkoutTimer({
  mode,
  totalSeconds = 0,
  workSeconds = 20,
  restSeconds = 10,
  rounds = 8,
  onComplete,
  onRoundComplete,
}: WorkoutTimerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [isWorkPeriod, setIsWorkPeriod] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);

  // Audio refs for beeps
  const audioContextRef = useRef<AudioContext | null>(null);

  // Calculate display values based on mode
  const getDisplayTime = useCallback(() => {
    const totalMs = totalSeconds * 1000;

    switch (mode) {
      case 'FOR_TIME':
        // Count up if no time cap, count down if time cap set
        if (totalSeconds > 0) {
          return Math.max(0, totalMs - elapsedMs);
        }
        return elapsedMs;

      case 'AMRAP':
        // Always count down
        return Math.max(0, totalMs - elapsedMs);

      case 'EMOM': {
        // Count down within each minute
        const minuteMs = 60000;
        const elapsedInCurrentMinute = elapsedMs % minuteMs;
        return Math.max(0, minuteMs - elapsedInCurrentMinute);
      }

      case 'TABATA':
      case 'INTERVALS': {
        // Count down within current interval
        const intervalMs = (isWorkPeriod ? workSeconds : restSeconds) * 1000;
        const totalIntervalMs = (workSeconds + restSeconds) * 1000;
        const positionInRound = elapsedMs % totalIntervalMs;

        if (positionInRound < workSeconds * 1000) {
          // Work period
          return Math.max(0, workSeconds * 1000 - positionInRound);
        } else {
          // Rest period
          return Math.max(0, totalIntervalMs - positionInRound);
        }
      }

      case 'STOPWATCH':
      default:
        return elapsedMs;
    }
  }, [mode, totalSeconds, elapsedMs, workSeconds, restSeconds, isWorkPeriod]);

  // Format time for display
  const formatTime = (ms: number, showMs = false): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    const base = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    return showMs ? `${base}.${milliseconds.toString().padStart(2, '0')}` : base;
  };

  // Play beep sound
  const playBeep = useCallback((frequency: number = 800, duration: number = 150) => {
    if (!soundEnabled) return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration / 1000);
    } catch (error) {
      console.warn('Could not play audio:', error);
    }
  }, [soundEnabled]);

  // Handle interval updates
  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = Date.now() - pausedTimeRef.current;

      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const newElapsedMs = now - startTimeRef.current;
        setElapsedMs(newElapsedMs);

        // Check for period changes and round completions
        if (mode === 'TABATA' || mode === 'INTERVALS') {
          const totalIntervalMs = (workSeconds + restSeconds) * 1000;
          const currentRoundFromTime = Math.floor(newElapsedMs / totalIntervalMs) + 1;
          const positionInRound = newElapsedMs % totalIntervalMs;
          const newIsWorkPeriod = positionInRound < workSeconds * 1000;

          // Period change beep
          if (newIsWorkPeriod !== isWorkPeriod) {
            setIsWorkPeriod(newIsWorkPeriod);
            playBeep(newIsWorkPeriod ? 1000 : 600, 200);
          }

          // Round completion
          if (currentRoundFromTime > currentRound && currentRound < rounds) {
            setCurrentRound(currentRoundFromTime);
            onRoundComplete?.(currentRoundFromTime - 1);
          }

          // Timer complete
          if (currentRoundFromTime > rounds) {
            setIsRunning(false);
            playBeep(1200, 500);
            onComplete?.(newElapsedMs);
          }
        }

        // EMOM round tracking
        if (mode === 'EMOM') {
          const currentMinute = Math.floor(newElapsedMs / 60000) + 1;
          if (currentMinute > currentRound && currentRound < rounds) {
            setCurrentRound(currentMinute);
            playBeep(800, 150);
            onRoundComplete?.(currentMinute - 1);
          }

          // Timer complete
          if (newElapsedMs >= rounds * 60000) {
            setIsRunning(false);
            playBeep(1200, 500);
            onComplete?.(newElapsedMs);
          }
        }

        // AMRAP and FOR_TIME with time cap completion
        if ((mode === 'AMRAP' || mode === 'FOR_TIME') && totalSeconds > 0) {
          if (newElapsedMs >= totalSeconds * 1000) {
            setIsRunning(false);
            playBeep(1200, 500);
            onComplete?.(newElapsedMs);
          }
        }
      }, 50);
    } else {
      pausedTimeRef.current = elapsedMs;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, mode, totalSeconds, workSeconds, restSeconds, rounds, currentRound, isWorkPeriod, elapsedMs, playBeep, onComplete, onRoundComplete]);

  // Reset timer
  const reset = () => {
    setIsRunning(false);
    setElapsedMs(0);
    setCurrentRound(1);
    setIsWorkPeriod(true);
    pausedTimeRef.current = 0;
  };

  // Manual round increment (for AMRAP)
  const incrementRound = () => {
    if (mode === 'AMRAP') {
      setCurrentRound((prev) => prev + 1);
      playBeep(600, 100);
    }
  };

  const decrementRound = () => {
    if (mode === 'AMRAP' && currentRound > 0) {
      setCurrentRound((prev) => Math.max(0, prev - 1));
    }
  };

  // Stop and save time (For Time workouts)
  const stopAndSave = () => {
    setIsRunning(false);
    onComplete?.(elapsedMs);
  };

  const displayTime = getDisplayTime();
  const progress = totalSeconds > 0 ? (elapsedMs / (totalSeconds * 1000)) * 100 : 0;

  // Get mode label
  const getModeLabel = () => {
    switch (mode) {
      case 'FOR_TIME':
        return totalSeconds > 0 ? 'For Time (Time Cap)' : 'For Time';
      case 'AMRAP':
        return 'AMRAP';
      case 'EMOM':
        return 'EMOM';
      case 'TABATA':
        return 'Tabata';
      case 'INTERVALS':
        return 'Intervaller';
      case 'STOPWATCH':
      default:
        return 'Stoppur';
    }
  };

  // Get period label for interval modes
  const getPeriodLabel = () => {
    if (mode === 'TABATA' || mode === 'INTERVALS') {
      return isWorkPeriod ? 'ARBETE' : 'VILA';
    }
    return null;
  };

  const periodLabel = getPeriodLabel();

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Timer className="h-5 w-5" />
            {getModeLabel()}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Period indicator for interval modes */}
        {periodLabel && (
          <div className="text-center">
            <Badge
              variant={isWorkPeriod ? 'default' : 'secondary'}
              className={`text-lg px-4 py-1 ${isWorkPeriod ? 'bg-green-600' : 'bg-orange-500'}`}
            >
              {periodLabel}
            </Badge>
          </div>
        )}

        {/* Main timer display */}
        <div className="text-center">
          <div
            className={`font-mono text-6xl font-bold tabular-nums ${
              periodLabel && !isWorkPeriod ? 'text-orange-500' : ''
            }`}
          >
            {formatTime(displayTime, mode === 'STOPWATCH' || mode === 'FOR_TIME')}
          </div>
        </div>

        {/* Progress bar for timed modes */}
        {totalSeconds > 0 && (mode === 'AMRAP' || mode === 'FOR_TIME') && (
          <Progress value={Math.min(100, progress)} className="h-2" />
        )}

        {/* Round counter */}
        {(mode === 'AMRAP' || mode === 'EMOM' || mode === 'TABATA' || mode === 'INTERVALS') && (
          <div className="flex items-center justify-center gap-4">
            {mode === 'AMRAP' && (
              <Button variant="outline" size="icon" onClick={decrementRound}>
                <ChevronDown className="h-4 w-4" />
              </Button>
            )}
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Runda</div>
              <div className="text-3xl font-bold">
                {currentRound}
                {(mode === 'EMOM' || mode === 'TABATA' || mode === 'INTERVALS') && (
                  <span className="text-muted-foreground">/{rounds}</span>
                )}
              </div>
            </div>
            {mode === 'AMRAP' && (
              <Button variant="outline" size="icon" onClick={incrementRound}>
                <ChevronUp className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {/* Control buttons */}
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="icon" onClick={reset}>
            <RotateCcw className="h-4 w-4" />
          </Button>

          <Button
            size="lg"
            className={`w-24 ${isRunning ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'}`}
            onClick={() => setIsRunning(!isRunning)}
          >
            {isRunning ? (
              <>
                <Pause className="h-5 w-5 mr-1" />
                Paus
              </>
            ) : (
              <>
                <Play className="h-5 w-5 mr-1" />
                Start
              </>
            )}
          </Button>

          {(mode === 'FOR_TIME' || mode === 'STOPWATCH') && elapsedMs > 0 && (
            <Button variant="default" onClick={stopAndSave}>
              Spara
            </Button>
          )}
        </div>

        {/* Elapsed time display for countdown modes */}
        {(mode === 'AMRAP' || (mode === 'FOR_TIME' && totalSeconds > 0)) && (
          <div className="text-center text-sm text-muted-foreground">
            Förfluten tid: {formatTime(elapsedMs)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Preset timer configurations
export const TIMER_PRESETS = {
  TABATA: {
    mode: 'TABATA' as TimerMode,
    workSeconds: 20,
    restSeconds: 10,
    rounds: 8,
    totalSeconds: 4 * 60, // 4 minutes total
  },
  EMOM_10: {
    mode: 'EMOM' as TimerMode,
    rounds: 10,
    totalSeconds: 10 * 60,
  },
  EMOM_20: {
    mode: 'EMOM' as TimerMode,
    rounds: 20,
    totalSeconds: 20 * 60,
  },
  AMRAP_10: {
    mode: 'AMRAP' as TimerMode,
    totalSeconds: 10 * 60,
  },
  AMRAP_15: {
    mode: 'AMRAP' as TimerMode,
    totalSeconds: 15 * 60,
  },
  AMRAP_20: {
    mode: 'AMRAP' as TimerMode,
    totalSeconds: 20 * 60,
  },
  FOR_TIME_20CAP: {
    mode: 'FOR_TIME' as TimerMode,
    totalSeconds: 20 * 60,
  },
  STOPWATCH: {
    mode: 'STOPWATCH' as TimerMode,
    totalSeconds: 0,
  },
};
