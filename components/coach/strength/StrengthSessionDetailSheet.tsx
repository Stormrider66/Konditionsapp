'use client';

/**
 * Strength Session Detail Sheet Component
 *
 * Slide-out sheet showing full session details with actions:
 * - View all exercises with sets/reps/weight
 * - Edit, Delete, Assign, Export actions
 * - Recent assignments history
 */

import { useState, useEffect, useCallback } from 'react';
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
  Dumbbell,
  Activity,
  Heart,
} from 'lucide-react';
import type { StrengthSessionData, StrengthSessionExercise, SessionAssignment } from '@/types';
import { SessionExportButton } from '@/components/exports/SessionExportButton';
import { useWorkoutThemeOptional, MINIMALIST_WHITE_THEME } from '@/lib/themes';
import { useLocale } from '@/i18n/client';

type AppLocale = 'en' | 'sv';

const copy = {
  en: {
    cardioIntensity: {
      EASY: 'Easy',
      MODERATE: 'Moderate',
      HARD: 'Hard',
      INTERVAL: 'Interval',
    },
    phases: {
      ANATOMICAL_ADAPTATION: 'Anatomical Adaptation',
      MAXIMUM_STRENGTH: 'Maximum Strength',
      POWER: 'Power',
      MAINTENANCE: 'Maintenance',
      TAPER: 'Taper',
    },
    timing: {
      BEFORE_RUN: 'Before run',
      AFTER_RUN_6H: '6+ hours after run',
      SEPARATE_DAY: 'Separate day',
    },
    status: {
      PENDING: 'Pending',
      SCHEDULED: 'Scheduled',
      COMPLETED: 'Completed',
      SKIPPED: 'Skipped',
      MODIFIED: 'Modified',
    },
    strengthSession: 'Strength session',
    edit: 'Edit',
    delete: 'Delete',
    assign: 'Assign',
    assignTeam: 'Assign team',
    exercises: 'Exercises',
    cardio: 'Cardio',
    rest: 'rest',
    followUp: 'Follow-up',
    pauseBefore: 'pause before',
    superset: 'superset',
    noExercises: 'No exercises added',
    assignments: 'Assignments',
    loadingAssignments: 'Loading assignments...',
    noAssignments: 'No assignments yet',
    unknown: 'Unknown',
  },
  sv: {
    cardioIntensity: {
      EASY: 'Lätt',
      MODERATE: 'Måttligt',
      HARD: 'Hårt',
      INTERVAL: 'Intervall',
    },
    phases: {
      ANATOMICAL_ADAPTATION: 'Anatomisk Anpassning',
      MAXIMUM_STRENGTH: 'Maxstyrka',
      POWER: 'Power',
      MAINTENANCE: 'Underhåll',
      TAPER: 'Taper',
    },
    timing: {
      BEFORE_RUN: 'Före löpning',
      AFTER_RUN_6H: '6+ timmar efter löpning',
      SEPARATE_DAY: 'Separat dag',
    },
    status: {
      PENDING: 'Väntande',
      SCHEDULED: 'Schemalagd',
      COMPLETED: 'Genomförd',
      SKIPPED: 'Hoppade över',
      MODIFIED: 'Modifierad',
    },
    strengthSession: 'Styrkepass',
    edit: 'Redigera',
    delete: 'Ta bort',
    assign: 'Tilldela',
    assignTeam: 'Tilldela lag',
    exercises: 'Övningar',
    cardio: 'Kondition',
    rest: 'vila',
    followUp: 'Följd',
    pauseBefore: 'paus innan',
    superset: 'superset',
    noExercises: 'Inga övningar tillagda',
    assignments: 'Tilldelningar',
    loadingAssignments: 'Laddar tilldelningar...',
    noAssignments: 'Inga tilldelningar än',
    unknown: 'Okänd',
  },
} as const;

function formatDate(date: Date | string, locale: AppLocale) {
  return new Date(date).toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-US');
}

function formatDurationSeconds(s: number): string {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r === 0 ? `${m} min` : `${m}:${String(r).padStart(2, '0')} min`;
}

interface StrengthSessionDetailSheetProps {
  session: StrengthSessionData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onAssign: () => void;
  onTeamAssign?: () => void;
}

const phaseColors: Record<string, string> = {
  ANATOMICAL_ADAPTATION: 'bg-blue-500',
  MAXIMUM_STRENGTH: 'bg-red-500',
  POWER: 'bg-orange-500',
  MAINTENANCE: 'bg-green-500',
  TAPER: 'bg-purple-500',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-500',
  SCHEDULED: 'bg-blue-500',
  COMPLETED: 'bg-green-500',
  SKIPPED: 'bg-gray-500',
  MODIFIED: 'bg-purple-500',
};

export function StrengthSessionDetailSheet({
  session,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onAssign,
  onTeamAssign,
}: StrengthSessionDetailSheetProps) {
  const locale = useLocale() as AppLocale;
  const t = copy[locale] ?? copy.en;
  const themeContext = useWorkoutThemeOptional();
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME;

  const [assignments, setAssignments] = useState<SessionAssignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [assignmentsOpen, setAssignmentsOpen] = useState(false);
  const sessionId = session?.id;

  const fetchAssignments = useCallback(async () => {
    if (!sessionId) return;

    setLoadingAssignments(true);
    try {
      const response = await fetch(`/api/strength-sessions/${sessionId}/assign`);
      if (response.ok) {
        const data = await response.json();
        setAssignments(data.assignments || []);
      }
    } catch (error) {
      logger.error('Failed to fetch assignments', { sessionId }, error);
    } finally {
      setLoadingAssignments(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (open && sessionId) {
      const timeoutId = window.setTimeout(() => {
        void fetchAssignments();
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }
  }, [open, sessionId, fetchAssignments]);

  if (!session) return null;

  const phaseLabel = t.phases[session.phase as keyof typeof t.phases] || session.phase;
  const phaseColor = phaseColors[session.phase] || 'bg-gray-500';
  const exercises = session.exercises || [];

  // Prepare export data
  const exportData = {
    sessionName: session.name,
    phase: phaseLabel,
    date: new Date(),
    exercises: exercises.map((e: StrengthSessionExercise, i: number) => ({
      order: i + 1,
      name: e.exerciseName,
      sets: e.sets,
      reps: e.reps,
      weight: e.weight,
      rest: e.restSeconds,
      notes: e.notes,
    })),
    totalExercises: session.totalExercises || exercises.length,
    totalSets: session.totalSets || 0,
    estimatedDuration: session.estimatedDuration,
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
                <Dumbbell className="h-5 w-5 text-red-500" />
                {session.name}
              </SheetTitle>
              <SheetDescription className="flex items-center gap-2 mt-1" style={{ color: theme.colors.textMuted }}>
                <Activity className="h-4 w-4" />
                {t.strengthSession}
                {session.timingRelativeToRun && (
                  <span style={{ color: theme.colors.textMuted }}>
                    • {t.timing[session.timingRelativeToRun as keyof typeof t.timing] || session.timingRelativeToRun}
                  </span>
                )}
              </SheetDescription>
            </div>
            <Badge className={`${phaseColor} text-white`}>
              {phaseLabel}
            </Badge>
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
            sessionType="strength"
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
            <div className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>{session.totalExercises || exercises.length}</div>
            <div className="text-xs" style={{ color: theme.colors.textMuted }}>{t.exercises}</div>
          </div>
          <div
            className="text-center p-3 rounded-lg"
            style={{ backgroundColor: theme.id === 'FITAPP_DARK' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
          >
            <div className="text-2xl font-bold" style={{ color: theme.colors.textPrimary }}>{session.totalSets || 0}</div>
            <div className="text-xs" style={{ color: theme.colors.textMuted }}>Set</div>
          </div>
          <div
            className="text-center p-3 rounded-lg"
            style={{ backgroundColor: theme.id === 'FITAPP_DARK' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
          >
            <div className="text-2xl font-bold flex items-center justify-center gap-1" style={{ color: theme.colors.textPrimary }}>
              <Clock className="h-4 w-4" />
              {session.estimatedDuration || '~45'}
            </div>
            <div className="text-xs" style={{ color: theme.colors.textMuted }}>min</div>
          </div>
        </div>

        <Separator className="my-2" />

        {/* Exercises */}
        <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.accent }}>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-base flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
              <Dumbbell className="h-4 w-4 text-red-500" />
              <span>{t.exercises}</span>
              <Badge variant="secondary">{exercises.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {exercises.length > 0 ? (
              <ul className="space-y-3">
                {exercises.map((exercise: StrengthSessionExercise, i: number) => {
                  const isCardio = exercise.kind === 'cardio';
                  const weightSuffix = exercise.weightUnit === 'percent' ? '%' : 'kg';
                  return (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="w-5 flex-shrink-0 font-medium" style={{ color: theme.colors.textMuted }}>
                      {i + 1}.
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-medium" style={{ color: theme.colors.textPrimary }}>{exercise.exerciseName}</div>
                        {isCardio && (
                          <Badge variant="secondary" className="text-[10px] py-0">
                            <Heart className="h-3 w-3 mr-1" />
                            {t.cardio}
                          </Badge>
                        )}
                      </div>
                      <div style={{ color: theme.colors.textMuted }}>
                        {isCardio ? (
                          <>
                            {exercise.durationSeconds
                              ? formatDurationSeconds(exercise.durationSeconds)
                              : '—'}
                            {exercise.distanceMeters
                              ? ` · ${(exercise.distanceMeters / 1000).toFixed(2)} km`
                              : ''}
                            {exercise.intensity
                              ? ` · ${t.cardioIntensity[exercise.intensity as keyof typeof t.cardioIntensity] ?? exercise.intensity}`
                              : ''}
                          </>
                        ) : exercise.setRows && exercise.setRows.length > 0 ? (
                          <>
                            <div className="text-xs">
                              {exercise.setRows.map((r, k) => (
                                <span key={k}>
                                  {k > 0 && ', '}
                                  Set {k + 1}: {r.reps}
                                  {r.weight ? ` @ ${r.weight}${weightSuffix}` : ''}
                                </span>
                              ))}
                            </div>
                            {exercise.restSeconds && (
                              <span>{exercise.restSeconds}s {t.rest}</span>
                            )}
                          </>
                        ) : (
                          <>
                            {exercise.sets}×{exercise.reps}
                            {exercise.weight && ` @ ${exercise.weight}${weightSuffix}`}
                            {exercise.restSeconds && ` (${exercise.restSeconds}s ${t.rest})`}
                          </>
                        )}
                      </div>
                      {exercise.notes && (
                        <div className="text-xs italic mt-1" style={{ color: theme.colors.textMuted }}>
                          {exercise.notes}
                        </div>
                      )}
                      {Array.isArray(exercise.followUps) && exercise.followUps.length > 0 && (
                        <ul
                          className="mt-2 space-y-1.5 pl-3 border-l-2 border-dashed"
                          style={{ borderColor: theme.colors.accent }}
                        >
                          {exercise.followUps.map((fu, j) => (
                            <li key={j} className="text-xs">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge variant="outline" className="text-[10px] py-0">
                                  {t.followUp} {j + 1}
                                </Badge>
                                <span className="font-medium" style={{ color: theme.colors.textPrimary }}>
                                  {fu.exerciseName}
                                </span>
                              </div>
                              <div style={{ color: theme.colors.textMuted }}>
                                {exercise.sets}×{fu.reps}
                                {fu.weight
                                  ? ` @ ${fu.weight}${fu.weightUnit === 'percent' ? '%' : 'kg'}`
                                  : ''}
                                {fu.restBeforeSeconds
                                  ? ` (${fu.restBeforeSeconds}s ${t.pauseBefore})`
                                  : ` (${t.superset})`}
                              </div>
                              {fu.notes && (
                                <div className="italic mt-0.5" style={{ color: theme.colors.textMuted }}>
                                  {fu.notes}
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm" style={{ color: theme.colors.textMuted }}>{t.noExercises}</p>
            )}
          </CardContent>
        </Card>

        {/* Tags */}
        {session.tags && session.tags.length > 0 && (
          <div className="py-4">
            <div className="flex flex-wrap gap-1">
              {session.tags.map((tag) => (
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
                      <span className="text-xs" style={{ color: theme.colors.textMuted }}>
                        {formatDate(assignment.assignedDate, locale)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CollapsibleContent>
        </Collapsible>
      </SheetContent>
    </Sheet>
  );
}
