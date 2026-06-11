'use client';

/**
 * Cardio Session Detail Sheet Component
 *
 * Slide-out sheet showing full session details with actions:
 * - View all segments with duration/pace/zone
 * - Edit, Delete, Assign, Export actions
 * - Recent assignments history
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { logger } from '@/lib/logger';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Edit,
  Trash2,
  Users,
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  MapPin,
  Activity,
  Zap,
} from 'lucide-react';
import type { CardioSessionData, CardioSegment, SessionAssignment } from '@/types';
import { SessionExportButton } from '@/components/exports/SessionExportButton';
import { CardioSessionSummaryView } from '@/components/athlete/cardio/CardioSessionSummaryView';
import { useWorkoutThemeOptional, MINIMALIST_WHITE_THEME } from '@/lib/themes';
import { useLocale } from '@/i18n/client';
import { getBusinessScopeHeaders } from '@/lib/business-scope-client';
import { visibleWorkoutTags } from '@/lib/workouts/business-tags';

type AppLocale = 'en' | 'sv';

const copy = {
  en: {
    sports: {
      RUNNING: 'Running',
      CYCLING: 'Cycling',
      SWIMMING: 'Swimming',
      SKIING: 'Skiing',
      TRIATHLON: 'Triathlon',
      HYROX: 'HYROX',
      GENERAL_FITNESS: 'General Fitness',
    },
    segmentTypes: {
      WARMUP: 'Warm-up',
      COOLDOWN: 'Cool-down',
      INTERVAL: 'Interval',
      STEADY: 'Steady pace',
      RECOVERY: 'Recovery',
      REST: 'Rest',
      HILL: 'Hill',
      DRILLS: 'Technique',
      REPEAT_GROUP: 'Repeat block',
      CORE: 'Core',
      PREHAB: 'Stability / Prehab',
      PLYOMETRIC: 'Plyometric',
    },
    status: {
      PENDING: 'Pending',
      SCHEDULED: 'Scheduled',
      COMPLETED: 'Completed',
      SKIPPED: 'Skipped',
      MODIFIED: 'Modified',
    },
    edit: 'Edit',
    delete: 'Delete',
    assign: 'Assign',
    assignTeam: 'Assign team',
    zone: 'Zone',
    totalTime: 'Total time',
    distance: 'Distance',
    segments: 'Segments',
    zoneDistribution: 'Zone distribution',
    easyZones: 'Z1-2 Easy',
    mediumZone: 'Z3 Medium',
    hardZones: 'Z4-5 Hard',
    repeatBlock: 'Repeat block',
    rest: 'Rest',
    betweenRounds: 'between rounds',
    noSegments: 'No segments added',
    assignments: 'Assignments',
    loadingAssignments: 'Loading assignments...',
    noAssignments: 'No assignments yet',
    unknown: 'Unknown',
    results: 'Results',
  },
  sv: {
    sports: {
      RUNNING: 'Löpning',
      CYCLING: 'Cykling',
      SWIMMING: 'Simning',
      SKIING: 'Skidor',
      TRIATHLON: 'Triathlon',
      HYROX: 'HYROX',
      GENERAL_FITNESS: 'Allmän Kondition',
    },
    segmentTypes: {
      WARMUP: 'Uppvärmning',
      COOLDOWN: 'Nedvarvning',
      INTERVAL: 'Intervall',
      STEADY: 'Jämnt tempo',
      RECOVERY: 'Återhämtning',
      REST: 'Vila',
      HILL: 'Backe',
      DRILLS: 'Teknik',
      REPEAT_GROUP: 'Repetitionsblock',
      CORE: 'Core',
      PREHAB: 'Stabilitet / Prehab',
      PLYOMETRIC: 'Plyometri',
    },
    status: {
      PENDING: 'Väntande',
      SCHEDULED: 'Schemalagd',
      COMPLETED: 'Genomförd',
      SKIPPED: 'Hoppade över',
      MODIFIED: 'Modifierad',
    },
    edit: 'Redigera',
    delete: 'Ta bort',
    assign: 'Tilldela',
    assignTeam: 'Tilldela lag',
    zone: 'Zon',
    totalTime: 'Total tid',
    distance: 'Distans',
    segments: 'Segment',
    zoneDistribution: 'Zonfördelning',
    easyZones: 'Z1-2 Lätt',
    mediumZone: 'Z3 Medel',
    hardZones: 'Z4-5 Hårt',
    repeatBlock: 'Repetitionsblock',
    rest: 'Vila',
    betweenRounds: 'mellan rundor',
    noSegments: 'Inga segment tillagda',
    assignments: 'Tilldelningar',
    loadingAssignments: 'Laddar tilldelningar...',
    noAssignments: 'Inga tilldelningar än',
    unknown: 'Okänd',
    results: 'Resultat',
  },
} as const;

function formatDate(date: Date | string, locale: AppLocale) {
  return new Date(date).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US');
}

interface CardioSessionDetailSheetProps {
  session: CardioSessionData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onAssign: () => void;
  onTeamAssign?: () => void;
  businessId?: string;
}

const sportIcons: Record<string, string> = {
  RUNNING: '🏃',
  CYCLING: '🚴',
  SWIMMING: '🏊',
  SKIING: '⛷️',
  TRIATHLON: '🏊🚴🏃',
  HYROX: '💪',
  GENERAL_FITNESS: '🏋️',
};

const segmentTypeColors: Record<string, string> = {
  WARMUP: 'bg-yellow-500',
  COOLDOWN: 'bg-blue-300',
  INTERVAL: 'bg-red-500',
  STEADY: 'bg-green-500',
  RECOVERY: 'bg-gray-400',
  REST: 'bg-gray-400',
  HILL: 'bg-orange-500',
  DRILLS: 'bg-purple-500',
  REPEAT_GROUP: 'bg-indigo-500',
  CORE: 'bg-purple-500',
  PREHAB: 'bg-teal-500',
  PLYOMETRIC: 'bg-amber-500',
};

const zoneColors: Record<number, string> = {
  1: 'bg-gray-400',
  2: 'bg-blue-500',
  3: 'bg-green-500',
  4: 'bg-yellow-500',
  5: 'bg-red-500',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-500',
  SCHEDULED: 'bg-blue-500',
  COMPLETED: 'bg-green-500',
  SKIPPED: 'bg-gray-500',
  MODIFIED: 'bg-purple-500',
};

function formatDuration(seconds?: number): string {
  if (!seconds) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}min`;
  }
  return secs > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${mins} min`;
}

function formatDistance(meters?: number): string {
  if (!meters) return '-';
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${meters} m`;
}

// Render a repeat-group child step's intensity target (power/cadence/pace/hr) for display.
function formatChildTarget(targetType?: string, targetValue?: string): string | null {
  if (!targetType || targetType === 'none' || !targetValue) return null;
  switch (targetType) {
    case 'power': return `${targetValue} W`;
    case 'cadence': return `${targetValue} rpm`;
    case 'pace': return `@ ${targetValue}`;
    case 'hr': return `${targetValue} bpm`;
    case 'calories': return `${targetValue} cal`;
    default: return targetValue;
  }
}

// Render a relative power target ("80% of opener" / "88% FTP"). Null when incomplete.
function formatRelativeTarget(percent?: number, ref?: string, locale: AppLocale = 'en'): string | null {
  if (!percent || percent <= 0) return null;
  if (ref === 'FTP' || ref === 'CP') return `${percent}% ${ref}`;
  const opener = locale === 'sv' ? 'prolog' : 'opener';
  return locale === 'sv' ? `${percent}% av ${opener}` : `${percent}% of ${opener}`;
}

type SavedCardioExportSegment = Omit<CardioSegment, 'type'> & {
  type?: string;
  heartRate?: string;
  repeats?: number;
  restDuration?: number;
  restBetweenRounds?: number;
  steps?: SavedCardioExportSegment[];
};

function secondsToExportMinutes(seconds?: number): number | undefined {
  if (!seconds || seconds <= 0) return undefined;
  return Math.round((seconds / 60) * 10) / 10;
}

function metersToExportKilometers(meters?: number): number | undefined {
  if (!meters || meters <= 0) return undefined;
  return Math.round((meters / 1000) * 100) / 100;
}

function normalizeZone(zone?: number | string): string | undefined {
  if (typeof zone === 'number' && Number.isFinite(zone)) return String(zone);
  if (typeof zone === 'string') {
    const match = zone.match(/\d+/);
    return match?.[0];
  }
  return undefined;
}

function getExportSegments(segments: CardioSegment[]) {
  return segments.flatMap((segment, index) => {
    const savedSegment = segment as SavedCardioExportSegment;

    if (savedSegment.type === 'REPEAT_GROUP' && Array.isArray(savedSegment.steps)) {
      const groupRepeats = savedSegment.repeats && savedSegment.repeats > 1 ? savedSegment.repeats : undefined;
      const groupRest = secondsToExportMinutes(savedSegment.restBetweenRounds);

      return savedSegment.steps.map((step, stepIndex) => ({
        id: step.id || `${savedSegment.id || index}-${stepIndex}`,
        type: step.type || 'INTERVAL',
        duration: secondsToExportMinutes(step.duration),
        distance: metersToExportKilometers(step.distance),
        pace: step.pace,
        zone: normalizeZone(step.zone),
        heartRate: step.heartRate,
        notes: step.notes,
        repeats: groupRepeats,
        restDuration: secondsToExportMinutes(step.restDuration) || (stepIndex === 0 ? groupRest : undefined),
      }));
    }

    return [{
      id: savedSegment.id || String(index),
      type: savedSegment.type || 'STEADY',
      duration: secondsToExportMinutes(savedSegment.duration),
      distance: metersToExportKilometers(savedSegment.distance),
      pace: savedSegment.pace,
      power: savedSegment.power,
      cadence: savedSegment.cadence,
      zone: normalizeZone(savedSegment.zone),
      heartRate: savedSegment.heartRate,
      notes: savedSegment.notes,
      repeats: savedSegment.repeats && savedSegment.repeats > 1 ? savedSegment.repeats : undefined,
      restDuration: secondsToExportMinutes(savedSegment.restDuration),
    }];
  });
}

export function CardioSessionDetailSheet({
  session,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onAssign,
  onTeamAssign,
  businessId,
}: CardioSessionDetailSheetProps) {
  const locale = useLocale() as AppLocale;
  const t = copy[locale] ?? copy.en;
  const themeContext = useWorkoutThemeOptional();
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME;

  const [assignments, setAssignments] = useState<SessionAssignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [assignmentsOpen, setAssignmentsOpen] = useState(false);
  // Completed assignment whose result summary is open
  const [summaryAssignmentId, setSummaryAssignmentId] = useState<string | null>(null);
  const sessionId = session?.id;
  const pathname = usePathname();
  const businessHeaders = useMemo(() => ({
    ...(getBusinessScopeHeaders(pathname) ?? {}),
    ...(businessId ? { 'x-business-id': businessId } : {}),
  }), [businessId, pathname]);

  const fetchAssignments = useCallback(async () => {
    if (!sessionId) return;

    setLoadingAssignments(true);
    try {
      const response = await fetch(`/api/cardio-sessions/${sessionId}/assign`, {
        headers: businessHeaders,
      });
      if (response.ok) {
        const data = await response.json();
        setAssignments(data.assignments || []);
      }
    } catch (error) {
      logger.error('Failed to fetch assignments', { sessionId }, error);
    } finally {
      setLoadingAssignments(false);
    }
  }, [businessHeaders, sessionId]);

  useEffect(() => {
    if (open && sessionId) {
      const timeoutId = window.setTimeout(() => {
        void fetchAssignments();
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }
  }, [open, sessionId, fetchAssignments]);

  if (!session) return null;

  const sportLabel = t.sports[session.sport as keyof typeof t.sports] || session.sport;
  const sportIcon = sportIcons[session.sport] || '🏃';
  const segments = session.segments || [];
  const visibleTags = visibleWorkoutTags(session.tags);

  // Prepare export data
  const exportData = {
    sessionName: session.name,
    sport: sportLabel,
    date: new Date(),
    segments: getExportSegments(segments),
    totalDuration: secondsToExportMinutes(session.totalDuration),
    totalDistance: metersToExportKilometers(session.totalDistance),
    avgZone: session.avgZone,
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-lg overflow-y-auto"
        style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border }}
      >
        <SheetHeader className="pb-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <SheetTitle className="text-xl flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
                <span>{sportIcon}</span>
                {session.name}
              </SheetTitle>
              <SheetDescription className="flex items-center gap-2 mt-1" style={{ color: theme.colors.textMuted }}>
                <Activity className="h-4 w-4" />
                {sportLabel}
              </SheetDescription>
            </div>
            {session.avgZone && (
              <Badge className={`${zoneColors[Math.round(session.avgZone)] || 'bg-gray-500'} text-white`}>
                {t.zone} {session.avgZone.toFixed(1)}
              </Badge>
            )}
          </div>
        </SheetHeader>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pb-4">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-1" />
            {t.edit}
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4 mr-1" />
            {t.delete}
          </Button>
          <Button variant="outline" size="sm" onClick={onAssign}>
            <Users className="h-4 w-4 mr-1" />
            {t.assign}
          </Button>
          {onTeamAssign && (
            <Button variant="outline" size="sm" onClick={onTeamAssign}>
              <Users className="h-4 w-4 mr-1" />
              {t.assignTeam}
            </Button>
          )}
          <SessionExportButton
            sessionType="cardio"
            getSessionData={() => exportData}
            variant="outline"
            size="sm"
          />
        </div>

        <Separator className="my-2" />

        {/* Description */}
        {session.description && (
          <div className="py-3">
            <p className="text-sm whitespace-pre-wrap" style={{ color: theme.colors.textMuted }}>{session.description}</p>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 py-3">
          <div
            className="text-center p-3 rounded-lg"
            style={{ backgroundColor: theme.id === 'FITAPP_DARK' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
          >
            <div className="text-2xl font-bold flex items-center justify-center gap-1" style={{ color: theme.colors.textPrimary }}>
              <Clock className="h-4 w-4" />
              {formatDuration(session.totalDuration)}
            </div>
            <div className="text-xs" style={{ color: theme.colors.textMuted }}>{t.totalTime}</div>
          </div>
          <div
            className="text-center p-3 rounded-lg"
            style={{ backgroundColor: theme.id === 'FITAPP_DARK' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
          >
            <div className="text-2xl font-bold flex items-center justify-center gap-1" style={{ color: theme.colors.textPrimary }}>
              <MapPin className="h-4 w-4" />
              {formatDistance(session.totalDistance)}
            </div>
            <div className="text-xs" style={{ color: theme.colors.textMuted }}>{t.distance}</div>
          </div>
          <div
            className="text-center p-3 rounded-lg"
            style={{ backgroundColor: theme.id === 'FITAPP_DARK' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
          >
            <div className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>{segments.length}</div>
            <div className="text-xs" style={{ color: theme.colors.textMuted }}>{t.segments}</div>
          </div>
        </div>

        <Separator className="my-2" />

        {/* Zone Distribution Bar */}
        {segments.some((s: CardioSegment) => s.zone && s.duration) && (
          <div className="py-3">
            <div className="text-sm font-medium mb-2 flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
              <Zap className="h-4 w-4" />
              {t.zoneDistribution}
            </div>
            <div className="h-4 flex rounded-lg overflow-hidden">
              {segments
                .filter((s: CardioSegment) => s.zone && s.duration)
                .map((s: CardioSegment, i: number) => {
                  const totalDuration = segments.reduce(
                    (sum: number, seg: CardioSegment) => sum + (seg.duration || 0),
                    0
                  );
                  const percentage = totalDuration > 0 ? ((s.duration || 0) / totalDuration) * 100 : 0;
                  return (
                    <div
                      key={i}
                      className={`${zoneColors[s.zone!] || 'bg-gray-400'} transition-all`}
                      style={{ width: `${percentage}%` }}
                      title={`${t.zone} ${s.zone}: ${formatDuration(s.duration)}`}
                    />
                  );
                })}
            </div>
            <div className="flex justify-between text-xs mt-1" style={{ color: theme.colors.textMuted }}>
              <span>{t.easyZones}</span>
              <span>{t.mediumZone}</span>
              <span>{t.hardZones}</span>
            </div>
          </div>
        )}

        <Separator className="my-2" />

        {/* Segments */}
        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.accent }}>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-base flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
              <Activity className="h-4 w-4 text-blue-500" />
              <span>{t.segments}</span>
              <Badge variant="secondary">{segments.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {segments.length > 0 ? (
              <ul className="space-y-3">
                {segments.map((segment: CardioSegment, i: number) => {
                  // REPEAT_GROUP: render as a block with child steps
                  if ((segment.type as string) === 'REPEAT_GROUP' && (segment as unknown as Record<string, unknown>).steps) {
                    const group = segment as unknown as Record<string, unknown>;
                    const groupSteps = group.steps as Array<Record<string, unknown>>;
                    const reps = (group.repeats as number) || 1;
                    const repsMax = group.repeatsMax as number | undefined;
                    const repsLabel = repsMax && repsMax > reps ? `${reps}–${repsMax}` : `${reps}`;
                    const restBetween = group.restBetweenRounds as number;
                    return (
                      <li key={segment.id || i}>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-indigo-500 text-white text-xs">
                            {t.repeatBlock} ×{repsLabel}
                          </Badge>
                          {restBetween && (
                            <span className="text-xs" style={{ color: theme.colors.textMuted }}>
                              {t.rest}: {formatDuration(restBetween)} {t.betweenRounds}
                            </span>
                          )}
                        </div>
                        <ul className="ml-4 border-l-2 border-indigo-300 pl-3 space-y-2">
                          {groupSteps.map((step, j) => {
                            const stepType = step.type as string;
                            const stepLabel = t.segmentTypes[stepType as keyof typeof t.segmentTypes] || stepType;
                            const stepColor = segmentTypeColors[stepType] || 'bg-gray-500';
                            return (
                              <li key={(step.id as string) || j} className="flex items-start gap-2 text-sm">
                                <span className="w-4 flex-shrink-0 font-medium" style={{ color: theme.colors.textMuted }}>
                                  {j + 1}.
                                </span>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge className={`${stepColor} text-white text-xs`}>
                                      {stepLabel}
                                    </Badge>
                                    {step.isBenchmark ? (
                                      <Badge variant="outline" className="text-xs">
                                        {locale === 'sv' ? 'Prolog' : 'Opener'}
                                      </Badge>
                                    ) : null}
                                    {step.optional ? (
                                      <Badge variant="outline" className="text-xs">
                                        {locale === 'sv' ? 'Valfritt' : 'Optional'}
                                      </Badge>
                                    ) : null}
                                    {step.duration ? (
                                      <span className="text-xs" style={{ color: theme.colors.textMuted }}>
                                        {formatDuration(step.duration as number)}
                                      </span>
                                    ) : null}
                                    {step.calories ? (
                                      <span className="text-xs" style={{ color: theme.colors.textMuted }}>
                                        {step.calories as number} cal
                                      </span>
                                    ) : null}
                                    {formatChildTarget(step.targetType as string, step.targetValue as string) ? (
                                      <span className="text-xs font-medium" style={{ color: theme.colors.textMuted }}>
                                        {formatChildTarget(step.targetType as string, step.targetValue as string)}
                                      </span>
                                    ) : null}
                                    {formatRelativeTarget(step.targetRelPercent as number, step.targetRelTo as string, locale) ? (
                                      <span className="text-xs font-medium" style={{ color: theme.colors.textMuted }}>
                                        {formatRelativeTarget(step.targetRelPercent as number, step.targetRelTo as string, locale)}
                                      </span>
                                    ) : null}
                                    {step.notes ? (
                                      <span className="text-xs font-medium">{step.notes as string}</span>
                                    ) : null}
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </li>
                    );
                  }

                  // Regular flat segment
                  const typeLabel = t.segmentTypes[segment.type as keyof typeof t.segmentTypes] || segment.type;
                  const typeColor = segmentTypeColors[segment.type] || 'bg-gray-500';
                  const exercises = Array.isArray(segment.exercises) ? segment.exercises : [];
                  return (
                    <li key={segment.id || i} className="flex items-start gap-3 text-sm">
                      <span className="w-5 flex-shrink-0 font-medium" style={{ color: theme.colors.textMuted }}>
                        {i + 1}.
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge className={`${typeColor} text-white text-xs`}>
                            {typeLabel}
                          </Badge>
                          {segment.zone && (
                            <Badge className={`${zoneColors[segment.zone]} text-white text-xs`}>
                              Z{segment.zone}
                            </Badge>
                          )}
                          {segment.isBenchmark && (
                            <Badge variant="outline" className="text-xs">
                              {locale === 'sv' ? 'Prolog' : 'Opener'}
                            </Badge>
                          )}
                          {segment.optional && (
                            <Badge variant="outline" className="text-xs">
                              {locale === 'sv' ? 'Valfritt' : 'Optional'}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1" style={{ color: theme.colors.textMuted }}>
                          {segment.duration && formatDuration(segment.duration)}
                          {segment.distance && ` • ${formatDistance(segment.distance)}`}
                          {segment.pace && ` @ ${segment.pace}`}
                          {segment.power && ` • ${segment.power} W`}
                          {segment.cadence && ` • ${segment.cadence} rpm`}
                          {segment.powerRelPercent ? ` • ${formatRelativeTarget(segment.powerRelPercent, segment.powerRelTo, locale)}` : ''}
                          {segment.repeats && segment.repeats > 1 ? ` • ×${segment.repeats}${segment.repeatsMax && segment.repeatsMax > segment.repeats ? `–${segment.repeatsMax}` : ''}` : ''}
                        </div>
                        {exercises.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {exercises.map((exercise, index) => (
                              <li key={exercise.id || `${exercise.exerciseId}-${index}`} className="text-xs" style={{ color: theme.colors.textMuted }}>
                                {exercise.name}
                                {exercise.sets ? ` • ${exercise.sets} set` : ''}
                                {exercise.reps ? ` x ${exercise.reps}` : ''}
                                {exercise.notes ? ` • ${exercise.notes}` : ''}
                              </li>
                            ))}
                          </ul>
                        )}
                        {segment.notes && (
                          <div className="text-xs italic mt-1" style={{ color: theme.colors.textMuted }}>
                            {segment.notes}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm" style={{ color: theme.colors.textMuted }}>{t.noSegments}</p>
            )}
          </CardContent>
        </Card>

        {/* Tags */}
        {visibleTags.length > 0 && (
          <div className="py-4">
            <div className="flex flex-wrap gap-1">
              {visibleTags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Separator className="my-2" />

        {/* Assignments History */}
        <Collapsible open={assignmentsOpen} onOpenChange={setAssignmentsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-3 h-auto" style={{ color: theme.colors.textPrimary }}>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="font-semibold">{t.assignments}</span>
                <Badge variant="secondary">{session._count?.assignments || assignments.length}</Badge>
              </div>
              {assignmentsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-3 pb-3">
            {loadingAssignments ? (
              <p className="text-sm" style={{ color: theme.colors.textMuted }}>{t.loadingAssignments}</p>
            ) : assignments.length === 0 ? (
              <p className="text-sm" style={{ color: theme.colors.textMuted }}>{t.noAssignments}</p>
            ) : (
              <ul className="space-y-2">
                {assignments.map((assignment) => {
                  const statusLabel = t.status[assignment.status as keyof typeof t.status] || assignment.status;
                  const statusColor = statusColors[assignment.status] || 'bg-gray-500';
                  return (
                    <li key={assignment.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span style={{ color: theme.colors.textPrimary }}>{assignment.athlete?.name || t.unknown}</span>
                        <Badge className={`${statusColor} text-white text-xs`}>
                          {statusLabel}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: theme.colors.textMuted }}>
                          {formatDate(assignment.assignedDate, locale)}
                        </span>
                        {assignment.status === 'COMPLETED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => setSummaryAssignmentId(assignment.id)}
                          >
                            {t.results}
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Athlete result summary — rendered inside the sheet content so the
            overlay counts as an inside click and the sheet stays open behind. */}
        {summaryAssignmentId && (
          <CardioSessionSummaryView
            assignmentId={summaryAssignmentId}
            showAthleteName
            onClose={() => setSummaryAssignmentId(null)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
