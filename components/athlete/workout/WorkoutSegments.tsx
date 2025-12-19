'use client';

/**
 * Workout Segments Client Component
 *
 * Displays workout structure with lactate scan buttons for interval segments.
 * Athletes can capture lactate values during their workout directly from
 * this component using their phone camera.
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IntervalLactateButton } from './IntervalLactateButton';
import { useWorkoutThemeOptional, MINIMALIST_WHITE_THEME } from '@/lib/themes';

interface WorkoutSegment {
  id: string;
  type: string;
  description?: string | null;
  duration?: number | null;
  pace?: string | null;
  heartRate?: string | null;
  sets?: number | null;
  repsCount?: string | null;
  rest?: number | null;
  exercise?: {
    nameSv?: string | null;
  } | null;
}

interface WorkoutSegmentsProps {
  segments: WorkoutSegment[];
  workoutId: string;
  clientId: string;
  workoutName?: string;
}

export function WorkoutSegments({
  segments,
  workoutId,
  clientId,
  workoutName,
}: WorkoutSegmentsProps) {
  const themeContext = useWorkoutThemeOptional();
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME;

  // Count interval segments for numbering
  let intervalCounter = 0;

  function formatSegmentType(type: string): string {
    const types: Record<string, string> = {
      warmup: 'Uppvärmning',
      interval: 'Intervall',
      cooldown: 'Nedvärmning',
      work: 'Arbete',
      rest: 'Vila',
      exercise: 'Övning',
      WARMUP: 'Uppvärmning',
      INTERVAL: 'Intervall',
      COOLDOWN: 'Nedvärmning',
      WORK: 'Arbete',
      REST: 'Vila',
      EXERCISE: 'Övning',
    };
    return types[type] || type;
  }

  function isIntervalSegment(type: string): boolean {
    return type.toLowerCase() === 'interval' || type === 'INTERVAL';
  }

  return (
    <Card
      style={{
        backgroundColor: theme.colors.backgroundCard,
        borderColor: theme.colors.border,
      }}
    >
      <CardHeader>
        <CardTitle style={{ color: theme.colors.textPrimary }}>Pass-struktur</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {segments.map((segment, index) => {
            const isInterval = isIntervalSegment(segment.type);
            if (isInterval) {
              intervalCounter++;
            }
            const currentIntervalNumber = isInterval ? intervalCounter : 0;

            return (
              <div
                key={segment.id}
                className="flex items-start gap-3 p-3 rounded-lg"
                style={{ backgroundColor: theme.colors.background }}
              >
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                  style={{
                    backgroundColor: theme.colors.exerciseNumber,
                    color: theme.colors.exerciseNumberText,
                  }}
                >
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {formatSegmentType(segment.type)}
                    </Badge>
                    {segment.exercise?.nameSv && (
                      <span
                        className="font-medium"
                        style={{ color: theme.colors.textPrimary }}
                      >
                        {segment.exercise.nameSv}
                      </span>
                    )}
                    {isInterval && (
                      <Badge variant="outline" className="text-xs">
                        #{currentIntervalNumber}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm" style={{ color: theme.colors.textMuted }}>
                    {segment.description}
                    {segment.duration && ` • ${segment.duration} min`}
                    {segment.pace && ` • ${segment.pace}`}
                    {segment.heartRate && ` • ${segment.heartRate}`}
                    {segment.sets && segment.repsCount && (
                      <> • {segment.sets} set × {segment.repsCount} reps</>
                    )}
                    {segment.rest && ` • ${segment.rest}s vila`}
                  </p>
                </div>

                {/* Lactate scan button for interval segments */}
                {isInterval && (
                  <div className="flex-shrink-0">
                    <IntervalLactateButton
                      clientId={clientId}
                      workoutId={workoutId}
                      intervalNumber={currentIntervalNumber}
                      segmentDescription={`${workoutName || 'Intervall'} #${currentIntervalNumber}`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary for interval workouts */}
        {intervalCounter > 0 && (
          <div
            className="mt-4 pt-4 border-t"
            style={{ borderColor: theme.colors.border }}
          >
            <p className="text-xs" style={{ color: theme.colors.textMuted }}>
              <span className="font-medium">{intervalCounter} intervall</span> i detta pass.
              Tryck på kameraikonen vid varje intervall för att scanna ditt laktatvärde.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
