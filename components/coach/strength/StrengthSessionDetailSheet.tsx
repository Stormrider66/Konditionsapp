'use client';

/**
 * Strength Session Detail Sheet Component
 *
 * Slide-out sheet showing full session details with actions:
 * - View all exercises with sets/reps/weight
 * - Edit, Delete, Assign, Export actions
 * - Recent assignments history
 */

import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import type { StrengthSessionData, StrengthSessionExercise } from '@/types';
import { SessionExportButton } from '@/components/exports/SessionExportButton';
import { useWorkoutThemeOptional, MINIMALIST_WHITE_THEME } from '@/lib/themes';

interface StrengthSessionAssignment {
  id: string;
  athleteId: string;
  assignedDate: string;
  status: string;
  completedAt?: string;
  athlete?: {
    id: string;
    name: string;
  };
}

interface StrengthSessionDetailSheetProps {
  session: StrengthSessionData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onAssign: () => void;
}

const phaseLabels: Record<string, { label: string; color: string }> = {
  ANATOMICAL_ADAPTATION: { label: 'Anatomisk Anpassning', color: 'bg-blue-500' },
  MAXIMUM_STRENGTH: { label: 'Maxstyrka', color: 'bg-red-500' },
  POWER: { label: 'Power', color: 'bg-orange-500' },
  MAINTENANCE: { label: 'Underhåll', color: 'bg-green-500' },
  TAPER: { label: 'Taper', color: 'bg-purple-500' },
};

const timingLabels: Record<string, string> = {
  BEFORE_RUN: 'Före löpning',
  AFTER_RUN_6H: '6+ timmar efter löpning',
  SEPARATE_DAY: 'Separat dag',
};

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Väntande', color: 'bg-yellow-500' },
  SCHEDULED: { label: 'Schemalagd', color: 'bg-blue-500' },
  COMPLETED: { label: 'Genomförd', color: 'bg-green-500' },
  SKIPPED: { label: 'Hoppade över', color: 'bg-gray-500' },
  MODIFIED: { label: 'Modifierad', color: 'bg-purple-500' },
};

export function StrengthSessionDetailSheet({
  session,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onAssign,
}: StrengthSessionDetailSheetProps) {
  const themeContext = useWorkoutThemeOptional();
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME;

  const [assignments, setAssignments] = useState<StrengthSessionAssignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [assignmentsOpen, setAssignmentsOpen] = useState(false);

  useEffect(() => {
    if (open && session?.id) {
      fetchAssignments();
    }
  }, [open, session?.id]);

  async function fetchAssignments() {
    if (!session?.id) return;

    setLoadingAssignments(true);
    try {
      const response = await fetch(`/api/strength-sessions/${session.id}/assign`);
      if (response.ok) {
        const data = await response.json();
        setAssignments(data.assignments || []);
      }
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
    } finally {
      setLoadingAssignments(false);
    }
  }

  if (!session) return null;

  const phaseInfo = phaseLabels[session.phase] || { label: session.phase, color: 'bg-gray-500' };
  const exercises = session.exercises || [];

  // Prepare export data
  const exportData = {
    sessionName: session.name,
    phase: phaseInfo.label,
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
                Styrkepass
                {session.timingRelativeToRun && (
                  <span style={{ color: theme.colors.textMuted }}>
                    • {timingLabels[session.timingRelativeToRun] || session.timingRelativeToRun}
                  </span>
                )}
              </SheetDescription>
            </div>
            <Badge className={`${phaseInfo.color} text-white`}>
              {phaseInfo.label}
            </Badge>
          </div>
        </SheetHeader>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pb-4">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-1" />
            Redigera
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4 mr-1" />
            Ta bort
          </Button>
          <Button variant="outline" size="sm" onClick={onAssign}>
            <Users className="h-4 w-4 mr-1" />
            Tilldela
          </Button>
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
            <div className="text-xs" style={{ color: theme.colors.textMuted }}>Övningar</div>
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
              <span>Övningar</span>
              <Badge variant="secondary">{exercises.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {exercises.length > 0 ? (
              <ul className="space-y-3">
                {exercises.map((exercise: StrengthSessionExercise, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="w-5 flex-shrink-0 font-medium" style={{ color: theme.colors.textMuted }}>
                      {i + 1}.
                    </span>
                    <div className="flex-1">
                      <div className="font-medium" style={{ color: theme.colors.textPrimary }}>{exercise.exerciseName}</div>
                      <div style={{ color: theme.colors.textMuted }}>
                        {exercise.sets}×{exercise.reps}
                        {exercise.weight && ` @ ${exercise.weight}kg`}
                        {exercise.restSeconds && ` (${exercise.restSeconds}s vila)`}
                      </div>
                      {exercise.notes && (
                        <div className="text-xs italic mt-1" style={{ color: theme.colors.textMuted }}>
                          {exercise.notes}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm" style={{ color: theme.colors.textMuted }}>Inga övningar tillagda</p>
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
                <span className="font-semibold">Tilldelningar</span>
                <Badge variant="secondary">{session._count?.assignments || assignments.length}</Badge>
              </div>
              {assignmentsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-3 pb-3">
            {loadingAssignments ? (
              <p className="text-sm" style={{ color: theme.colors.textMuted }}>Laddar tilldelningar...</p>
            ) : assignments.length === 0 ? (
              <p className="text-sm" style={{ color: theme.colors.textMuted }}>Inga tilldelningar än</p>
            ) : (
              <ul className="space-y-2">
                {assignments.map((assignment) => {
                  const statusInfo = statusLabels[assignment.status] || { label: assignment.status, color: 'bg-gray-500' };
                  return (
                    <li key={assignment.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span style={{ color: theme.colors.textPrimary }}>{assignment.athlete?.name || 'Okänd'}</span>
                        <Badge className={`${statusInfo.color} text-white text-xs`}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                      <span className="text-xs" style={{ color: theme.colors.textMuted }}>
                        {new Date(assignment.assignedDate).toLocaleDateString('sv-SE')}
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
