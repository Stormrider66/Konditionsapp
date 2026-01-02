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
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
  GlassCardDescription
} from '@/components/ui/GlassCard';
import { ClipboardList, Clock, Zap, Activity, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  variant?: 'default' | 'glass';
}

export function WorkoutSegments({
  segments,
  workoutId,
  clientId,
  workoutName,
  variant = 'default',
}: WorkoutSegmentsProps) {
  const isGlass = variant === 'glass';
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

  if (isGlass) {
    return (
      <GlassCard className="border-white/5 bg-white/5">
        <GlassCardHeader className="pb-4">
          <GlassCardTitle className="text-xl font-black tracking-tight text-white flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-blue-500" />
            Pass-struktur
          </GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="space-y-4">
            {segments.map((segment, index) => {
              const isInterval = isIntervalSegment(segment.type);
              if (isInterval) {
                intervalCounter++;
              }
              const currentIntervalNumber = isInterval ? intervalCounter : 0;

              return (
                <div
                  key={segment.id}
                  className="group relative flex items-start gap-5 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all duration-300"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-black text-sm border border-blue-600/20 shadow-lg shadow-blue-600/5 group-hover:scale-110 transition-transform">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <Badge className="bg-white/10 hover:bg-white/20 text-white border-0 font-bold px-2.5 py-0.5 rounded-lg text-[10px] uppercase tracking-wider">
                        {formatSegmentType(segment.type)}
                      </Badge>
                      {segment.exercise?.nameSv && (
                        <span className="font-black text-white text-sm uppercase tracking-tight">
                          {segment.exercise.nameSv}
                        </span>
                      )}
                      {isInterval && (
                        <div className="px-2 py-0.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-[10px] font-black uppercase">
                          #{currentIntervalNumber}
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-slate-400 font-medium leading-relaxed">
                      {segment.description && <p className="mb-1 text-slate-200">{segment.description}</p>}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-black uppercase tracking-widest text-slate-500">
                        {segment.duration && (
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            {segment.duration} min
                          </span>
                        )}
                        {segment.pace && (
                          <span className="flex items-center gap-1.5 text-blue-400">
                            <Zap className="h-3 w-3" />
                            {segment.pace}
                          </span>
                        )}
                        {segment.heartRate && (
                          <span className="flex items-center gap-1.5 text-red-400">
                            <Activity className="h-3 w-3" />
                            {segment.heartRate} bpm
                          </span>
                        )}
                        {segment.sets && segment.repsCount && (
                          <span className="text-emerald-400">
                            {segment.sets} set × {segment.repsCount} reps
                          </span>
                        )}
                        {segment.rest && (
                          <span className="text-slate-600 italic">
                            {segment.rest}s vila
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Lactate scan button for interval segments */}
                  {isInterval && (
                    <div className="flex-shrink-0 self-center">
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
            <div className="mt-8 pt-6 border-t border-white/5">
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-400 font-medium leading-relaxed">
                  <span className="font-black text-blue-400 uppercase tracking-widest">{intervalCounter} intervall</span> ingår i detta pass.
                  Tryck på kameraikonen vid varje intervall för att scanna ditt laktatvärde direkt under passet.
                </p>
              </div>
            </div>
          )}
        </GlassCardContent>
      </GlassCard>
    );
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
