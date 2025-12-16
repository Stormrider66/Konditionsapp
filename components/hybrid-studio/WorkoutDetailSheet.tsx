'use client';

/**
 * Workout Detail Sheet Component
 *
 * Slide-out sheet showing full workout details with actions:
 * - View all sections (warmup, strength, metcon, cooldown)
 * - Edit, Delete, Assign, Export, Print actions
 * - Past results history
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
  Trophy,
  Timer,
  Repeat,
  Clock,
  Zap,
  Target,
  Dumbbell,
  Calendar,
  Activity,
} from 'lucide-react';
import type { HybridWorkoutWithSections, HybridSectionData } from '@/types';
import { HybridWorkoutExportButton } from './HybridWorkoutExportButton';

interface HybridWorkoutResult {
  id: string;
  athleteId: string;
  scoreType: string;
  timeScore?: number;
  roundsCompleted?: number;
  repsCompleted?: number;
  scalingLevel: string;
  completedAt: string;
  isPR: boolean;
  athlete?: {
    id: string;
    name: string;
  };
}

interface WorkoutDetailSheetProps {
  workout: HybridWorkoutWithSections | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onAssign: () => void;
}

const formatLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  AMRAP: { label: 'AMRAP', icon: <Repeat className="h-4 w-4" /> },
  FOR_TIME: { label: 'For Time', icon: <Timer className="h-4 w-4" /> },
  EMOM: { label: 'EMOM', icon: <Clock className="h-4 w-4" /> },
  TABATA: { label: 'Tabata', icon: <Zap className="h-4 w-4" /> },
  CHIPPER: { label: 'Chipper', icon: <Target className="h-4 w-4" /> },
  LADDER: { label: 'Ladder', icon: <Dumbbell className="h-4 w-4" /> },
  INTERVALS: { label: 'Intervaller', icon: <Zap className="h-4 w-4" /> },
  HYROX_SIM: { label: 'HYROX', icon: <Trophy className="h-4 w-4" /> },
  CUSTOM: { label: 'Anpassad', icon: <Dumbbell className="h-4 w-4" /> },
};

const scalingLabels: Record<string, { label: string; color: string }> = {
  RX: { label: 'Rx', color: 'bg-green-500' },
  SCALED: { label: 'Scaled', color: 'bg-yellow-500' },
  FOUNDATIONS: { label: 'Foundations', color: 'bg-blue-500' },
  CUSTOM: { label: 'Custom', color: 'bg-purple-500' },
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${mins} min`;
}

function formatScore(result: HybridWorkoutResult): string {
  switch (result.scoreType) {
    case 'TIME':
      return result.timeScore ? formatTime(result.timeScore) : '-';
    case 'ROUNDS_REPS':
      return `${result.roundsCompleted || 0}+${result.repsCompleted || 0}`;
    default:
      return '-';
  }
}

function SectionDisplay({ title, icon, data }: { title: string; icon: React.ReactNode; data?: HybridSectionData }) {
  const [isOpen, setIsOpen] = useState(true);

  if (!data || (!data.notes && (!data.movements || data.movements.length === 0))) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between p-3 h-auto">
          <div className="flex items-center gap-2">
            {icon}
            <span className="font-semibold">{title}</span>
            {data.duration && (
              <Badge variant="outline" className="ml-2">
                ~{Math.ceil(data.duration / 60)} min
              </Badge>
            )}
          </div>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3">
        {data.notes && (
          <p className="text-sm text-muted-foreground mb-2 whitespace-pre-wrap">{data.notes}</p>
        )}
        {data.movements && data.movements.length > 0 && (
          <ul className="space-y-1">
            {data.movements.map((m, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-muted-foreground w-5">{i + 1}.</span>
                <div>
                  <span className="font-medium">{m.exerciseName}</span>
                  <span className="text-muted-foreground ml-2">
                    {m.sets && `${m.sets}x`}
                    {m.reps && `${m.reps}`}
                    {m.duration && ` ${m.duration}s`}
                    {m.distance && ` ${m.distance}m`}
                    {(m.weightMale || m.weightFemale) && ` (${m.weightMale || '-'}/${m.weightFemale || '-'}kg)`}
                    {m.restSeconds && ` vila ${m.restSeconds}s`}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function WorkoutDetailSheet({
  workout,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onAssign,
}: WorkoutDetailSheetProps) {
  const [results, setResults] = useState<HybridWorkoutResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);

  useEffect(() => {
    if (open && workout?.id) {
      fetchResults();
    }
  }, [open, workout?.id]);

  async function fetchResults() {
    if (!workout?.id) return;

    setLoadingResults(true);
    try {
      const response = await fetch(`/api/hybrid-workouts/${workout.id}/results?limit=10`);
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
      }
    } catch (error) {
      console.error('Failed to fetch results:', error);
    } finally {
      setLoadingResults(false);
    }
  }

  if (!workout) return null;

  const formatInfo = formatLabels[workout.format] || { label: workout.format, icon: <Dumbbell className="h-4 w-4" /> };
  const scalingInfo = scalingLabels[workout.scalingLevel] || { label: workout.scalingLevel, color: 'bg-gray-500' };

  // Build workout description
  const workoutMeta: string[] = [];
  if (workout.totalMinutes) workoutMeta.push(`${workout.totalMinutes} min`);
  if (workout.totalRounds) workoutMeta.push(`${workout.totalRounds} rundor`);
  if (workout.timeCap) workoutMeta.push(`${Math.floor(workout.timeCap / 60)} min cap`);
  if (workout.repScheme) workoutMeta.push(workout.repScheme);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto" data-pdf-content>
        <SheetHeader className="pb-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <SheetTitle className="text-xl flex items-center gap-2">
                {workout.isBenchmark && <Trophy className="h-5 w-5 text-yellow-500" />}
                {workout.name}
              </SheetTitle>
              <SheetDescription className="flex items-center gap-2 mt-1">
                {formatInfo.icon}
                {formatInfo.label}
                {workoutMeta.length > 0 && (
                  <span className="text-muted-foreground">• {workoutMeta.join(' • ')}</span>
                )}
              </SheetDescription>
            </div>
            <Badge className={`${scalingInfo.color} text-white`}>
              {scalingInfo.label}
            </Badge>
          </div>
        </SheetHeader>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pb-4">
          {!workout.isBenchmark && (
            <>
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-1" />
                Redigera
              </Button>
              <Button variant="outline" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4 mr-1" />
                Ta bort
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={onAssign}>
            <Users className="h-4 w-4 mr-1" />
            Tilldela
          </Button>
          <HybridWorkoutExportButton workout={workout} />
        </div>

        <Separator className="my-2" />

        {/* Description */}
        {workout.description && (
          <div className="py-3">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{workout.description}</p>
          </div>
        )}

        {/* Sections */}
        <div className="space-y-2">
          {/* Warmup Section */}
          <SectionDisplay
            title="Uppvärmning"
            icon={<Activity className="h-4 w-4 text-orange-500" />}
            data={workout.warmupData}
          />

          {/* Strength Section */}
          <SectionDisplay
            title="Styrka"
            icon={<Dumbbell className="h-4 w-4 text-red-500" />}
            data={workout.strengthData}
          />

          {/* Metcon Section (Main Workout) */}
          <Card className="border-primary/50">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-base flex items-center gap-2">
                {formatInfo.icon}
                <span>Metcon</span>
                <Badge variant="secondary">{formatInfo.label}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {workout.movements && workout.movements.length > 0 ? (
                <ul className="space-y-2">
                  {workout.movements.map((m, i) => (
                    <li key={m.id} className="text-sm flex items-start gap-2">
                      <span className="text-muted-foreground w-5 flex-shrink-0">{i + 1}.</span>
                      <div>
                        <span className="font-medium">
                          {m.exercise.standardAbbreviation || m.exercise.name}
                        </span>
                        <span className="text-muted-foreground ml-2">
                          {m.reps && `${m.reps} reps`}
                          {m.calories && `${m.calories} cal`}
                          {m.distance && `${m.distance}m`}
                          {m.duration && `${m.duration}s`}
                          {(m.weightMale || m.weightFemale) && (
                            <span className="ml-1">({m.weightMale || '-'}/{m.weightFemale || '-'}kg)</span>
                          )}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Inga rörelser tillagda</p>
              )}
            </CardContent>
          </Card>

          {/* Cooldown Section */}
          <SectionDisplay
            title="Nedvarvning"
            icon={<Activity className="h-4 w-4 text-blue-500" />}
            data={workout.cooldownData}
          />
        </div>

        {/* Tags */}
        {workout.tags && workout.tags.length > 0 && (
          <div className="py-4">
            <div className="flex flex-wrap gap-1">
              {workout.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Separator className="my-2" />

        {/* Results History */}
        <Collapsible open={resultsOpen} onOpenChange={setResultsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-3 h-auto">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="font-semibold">Resultat</span>
                <Badge variant="secondary">{workout._count?.results || results.length}</Badge>
              </div>
              {resultsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-3 pb-3">
            {loadingResults ? (
              <p className="text-sm text-muted-foreground">Laddar resultat...</p>
            ) : results.length === 0 ? (
              <p className="text-sm text-muted-foreground">Inga resultat loggade än</p>
            ) : (
              <ul className="space-y-2">
                {results.map((result) => (
                  <li key={result.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {result.isPR && <Trophy className="h-3 w-3 text-yellow-500" />}
                      <span>{result.athlete?.name || 'Okänd'}</span>
                      <Badge variant="outline" className="text-xs">
                        {scalingLabels[result.scalingLevel]?.label || result.scalingLevel}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatScore(result)}</span>
                      <span className="text-muted-foreground text-xs">
                        {new Date(result.completedAt).toLocaleDateString('sv-SE')}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Benchmark Info */}
        {workout.isBenchmark && workout.benchmarkSource && (
          <div className="pt-4 mt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Benchmark: {workout.benchmarkSource}
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
