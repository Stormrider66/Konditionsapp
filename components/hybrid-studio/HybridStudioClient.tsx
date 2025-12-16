'use client';

/**
 * Hybrid Studio Client Component
 *
 * Main client component for the Hybrid Studio featuring:
 * - Workout list with filtering
 * - Benchmark workouts browser
 * - Create new workout dialog
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Plus,
  Search,
  Timer,
  Repeat,
  Dumbbell,
  Trophy,
  Zap,
  Clock,
  Target,
  Trash2,
  Edit,
  MoreVertical,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { HybridWorkoutBuilder } from './HybridWorkoutBuilder';
import { WorkoutDetailSheet } from './WorkoutDetailSheet';
import { WorkoutAssignmentDialog } from './WorkoutAssignmentDialog';
import type { HybridWorkoutWithSections, HybridSectionData } from '@/types';

interface HybridMovement {
  id: string;
  order: number;
  reps?: number;
  calories?: number;
  distance?: number;
  duration?: number;
  weightMale?: number;
  weightFemale?: number;
  exercise: {
    id: string;
    name: string;
    nameSv?: string;
    standardAbbreviation?: string;
    equipmentTypes: string[];
  };
}

interface HybridWorkout {
  id: string;
  name: string;
  description?: string;
  format: string;
  timeCap?: number;
  workTime?: number;
  restTime?: number;
  totalRounds?: number;
  totalMinutes?: number;
  repScheme?: string;
  scalingLevel: string;
  isBenchmark: boolean;
  benchmarkSource?: string;
  tags: string[];
  movements: HybridMovement[];
  // Section data
  warmupData?: HybridSectionData;
  strengthData?: HybridSectionData;
  cooldownData?: HybridSectionData;
  coachId?: string;
  isPublic?: boolean;
  _count: {
    results: number;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

const formatLabels: Record<string, { label: string; labelSv: string; icon: React.ReactNode }> = {
  AMRAP: { label: 'AMRAP', labelSv: 'AMRAP', icon: <Repeat className="h-4 w-4" /> },
  FOR_TIME: { label: 'For Time', labelSv: 'På Tid', icon: <Timer className="h-4 w-4" /> },
  EMOM: { label: 'EMOM', labelSv: 'EMOM', icon: <Clock className="h-4 w-4" /> },
  TABATA: { label: 'Tabata', labelSv: 'Tabata', icon: <Zap className="h-4 w-4" /> },
  CHIPPER: { label: 'Chipper', labelSv: 'Chipper', icon: <Target className="h-4 w-4" /> },
  LADDER: { label: 'Ladder', labelSv: 'Stege', icon: <Dumbbell className="h-4 w-4" /> },
  INTERVALS: { label: 'Intervals', labelSv: 'Intervaller', icon: <Zap className="h-4 w-4" /> },
  HYROX_SIM: { label: 'HYROX', labelSv: 'HYROX', icon: <Trophy className="h-4 w-4" /> },
  CUSTOM: { label: 'Custom', labelSv: 'Anpassad', icon: <Dumbbell className="h-4 w-4" /> },
};

const scalingLabels: Record<string, { label: string; color: string }> = {
  RX: { label: 'Rx', color: 'bg-green-500' },
  SCALED: { label: 'Scaled', color: 'bg-yellow-500' },
  FOUNDATIONS: { label: 'Foundations', color: 'bg-blue-500' },
};

export function HybridStudioClient() {
  const [workouts, setWorkouts] = useState<HybridWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [benchmarkOnly, setBenchmarkOnly] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedWorkout, setSelectedWorkout] = useState<HybridWorkout | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteWorkout, setDeleteWorkout] = useState<HybridWorkout | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // Detail sheet state
  const [sheetWorkout, setSheetWorkout] = useState<HybridWorkout | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);

  const handleDelete = async () => {
    if (!deleteWorkout) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/hybrid-workouts/${deleteWorkout.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDeleteWorkout(null);
        fetchWorkouts();
      } else {
        console.error('Failed to delete workout');
      }
    } catch (error) {
      console.error('Error deleting workout:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (workout: HybridWorkout) => {
    setSelectedWorkout(workout);
    setIsEditOpen(true);
  };

  const handleOpenSheet = (workout: HybridWorkout) => {
    setSheetWorkout(workout);
    setIsSheetOpen(true);
  };

  const handleSheetEdit = () => {
    if (sheetWorkout) {
      setSelectedWorkout(sheetWorkout);
      setIsSheetOpen(false);
      setIsEditOpen(true);
    }
  };

  const handleSheetDelete = () => {
    if (sheetWorkout) {
      setDeleteWorkout(sheetWorkout);
      setIsSheetOpen(false);
    }
  };

  const handleSheetAssign = () => {
    setIsAssignOpen(true);
  };

  const fetchWorkouts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (formatFilter && formatFilter !== 'all') params.set('format', formatFilter);
      if (benchmarkOnly) params.set('benchmarkOnly', 'true');
      params.set('limit', '50');

      const response = await fetch(`/api/hybrid-workouts?${params}`);
      if (response.ok) {
        const data = await response.json();
        setWorkouts(data.workouts);
      }
    } catch (error) {
      console.error('Failed to fetch workouts:', error);
    } finally {
      setLoading(false);
    }
  }, [search, formatFilter, benchmarkOnly]);

  useEffect(() => {
    fetchWorkouts();
  }, [fetchWorkouts]);

  function formatWorkoutDescription(workout: HybridWorkout): string {
    const parts: string[] = [];

    if (workout.totalMinutes) {
      parts.push(`${workout.totalMinutes} min`);
    }
    if (workout.totalRounds) {
      parts.push(`${workout.totalRounds} rounds`);
    }
    if (workout.repScheme) {
      parts.push(workout.repScheme);
    }
    if (workout.timeCap) {
      parts.push(`${Math.floor(workout.timeCap / 60)} min cap`);
    }

    // Count movements
    const movementCount = workout.movements?.length || 0;
    if (movementCount > 0) {
      parts.push(`${movementCount} rörelser`);
    }

    return parts.join(' • ');
  }

  function getMovementSummary(movements: HybridMovement[]): string {
    if (!movements || movements.length === 0) return '';

    return movements
      .slice(0, 3)
      .map((m) => m.exercise.standardAbbreviation || m.exercise.name)
      .join(', ') + (movements.length > 3 ? ` +${movements.length - 3}` : '');
  }

  const benchmarkWorkouts = workouts.filter((w) => w.isBenchmark);
  const customWorkouts = workouts.filter((w) => !w.isBenchmark);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Hybrid Studio</h1>
          <p className="text-muted-foreground">
            Skapa och hantera CrossFit, HYROX och funktionella pass
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nytt Pass
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Skapa Nytt Hybrid Pass</DialogTitle>
              <DialogDescription>
                Välj format och lägg till rörelser för att skapa ditt pass.
              </DialogDescription>
            </DialogHeader>
            <HybridWorkoutBuilder
              onSave={() => {
                setIsCreateOpen(false);
                fetchWorkouts();
              }}
              onCancel={() => setIsCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Sök pass..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={formatFilter} onValueChange={setFormatFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Alla format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla format</SelectItem>
            {Object.entries(formatLabels).map(([key, { labelSv }]) => (
              <SelectItem key={key} value={key}>
                {labelSv}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            Alla ({workouts.length})
          </TabsTrigger>
          <TabsTrigger value="benchmarks">
            Benchmarks ({benchmarkWorkouts.length})
          </TabsTrigger>
          <TabsTrigger value="custom">
            Mina Pass ({customWorkouts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <WorkoutGrid
            workouts={workouts}
            loading={loading}
            formatLabels={formatLabels}
            scalingLabels={scalingLabels}
            formatWorkoutDescription={formatWorkoutDescription}
            getMovementSummary={getMovementSummary}
            onView={handleOpenSheet}
            onEdit={handleEdit}
            onDelete={setDeleteWorkout}
          />
        </TabsContent>

        <TabsContent value="benchmarks" className="mt-6">
          {/* Group by source */}
          <div className="space-y-8">
            {['The Girls', 'Hero WOD', 'CrossFit Open', 'HYROX', 'CrossFit'].map((source) => {
              const sourceWorkouts = benchmarkWorkouts.filter(
                (w) => w.benchmarkSource === source
              );
              if (sourceWorkouts.length === 0) return null;

              return (
                <div key={source}>
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    {source}
                    <Badge variant="secondary">{sourceWorkouts.length}</Badge>
                  </h2>
                  <WorkoutGrid
                    workouts={sourceWorkouts}
                    loading={false}
                    formatLabels={formatLabels}
                    scalingLabels={scalingLabels}
                    formatWorkoutDescription={formatWorkoutDescription}
                    getMovementSummary={getMovementSummary}
                    onView={handleOpenSheet}
                    onEdit={handleEdit}
                    onDelete={setDeleteWorkout}
                  />
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="custom" className="mt-6">
          {customWorkouts.length === 0 && !loading ? (
            <Card className="p-8 text-center">
              <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Inga egna pass än</h3>
              <p className="text-muted-foreground mb-4">
                Skapa ditt första hybrid pass för att komma igång.
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Skapa Pass
              </Button>
            </Card>
          ) : (
            <WorkoutGrid
              workouts={customWorkouts}
              loading={loading}
              formatLabels={formatLabels}
              scalingLabels={scalingLabels}
              formatWorkoutDescription={formatWorkoutDescription}
              getMovementSummary={getMovementSummary}
              onView={handleOpenSheet}
              onEdit={handleEdit}
              onDelete={setDeleteWorkout}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Workout Detail Sheet */}
      <WorkoutDetailSheet
        workout={sheetWorkout as HybridWorkoutWithSections | null}
        open={isSheetOpen}
        onOpenChange={(open) => {
          setIsSheetOpen(open);
          if (!open) setSheetWorkout(null);
        }}
        onEdit={handleSheetEdit}
        onDelete={handleSheetDelete}
        onAssign={handleSheetAssign}
      />

      {/* Assignment Dialog */}
      {sheetWorkout && (
        <WorkoutAssignmentDialog
          workout={sheetWorkout}
          open={isAssignOpen}
          onOpenChange={setIsAssignOpen}
          onAssigned={() => {
            setIsAssignOpen(false);
            fetchWorkouts();
          }}
        />
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Redigera Pass</DialogTitle>
            <DialogDescription>
              Ändra passets inställningar och rörelser.
            </DialogDescription>
          </DialogHeader>
          {selectedWorkout && (
            <HybridWorkoutBuilder
              initialData={{
                id: selectedWorkout.id,
                name: selectedWorkout.name,
                description: selectedWorkout.description,
                format: selectedWorkout.format,
                timeCap: selectedWorkout.timeCap,
                workTime: selectedWorkout.workTime,
                restTime: selectedWorkout.restTime,
                totalRounds: selectedWorkout.totalRounds,
                totalMinutes: selectedWorkout.totalMinutes,
                repScheme: selectedWorkout.repScheme,
                scalingLevel: selectedWorkout.scalingLevel,
                tags: selectedWorkout.tags,
                movements: selectedWorkout.movements?.map((m) => ({
                  id: m.id,
                  exerciseId: m.exercise.id,
                  exercise: m.exercise,
                  order: m.order,
                  reps: m.reps,
                  calories: m.calories,
                  distance: m.distance,
                  duration: m.duration,
                  weightMale: m.weightMale,
                  weightFemale: m.weightFemale,
                })),
              }}
              onSave={() => {
                setIsEditOpen(false);
                setSelectedWorkout(null);
                fetchWorkouts();
              }}
              onCancel={() => {
                setIsEditOpen(false);
                setSelectedWorkout(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteWorkout} onOpenChange={(open) => !open && setDeleteWorkout(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort pass?</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill ta bort &quot;{deleteWorkout?.name}&quot;?
              Detta går inte att ångra.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Tar bort...' : 'Ta bort'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface WorkoutGridProps {
  workouts: HybridWorkout[];
  loading: boolean;
  formatLabels: Record<string, { label: string; labelSv: string; icon: React.ReactNode }>;
  scalingLabels: Record<string, { label: string; color: string }>;
  formatWorkoutDescription: (workout: HybridWorkout) => string;
  getMovementSummary: (movements: HybridMovement[]) => string;
  onView?: (workout: HybridWorkout) => void;
  onEdit?: (workout: HybridWorkout) => void;
  onDelete?: (workout: HybridWorkout) => void;
}

function WorkoutGrid({
  workouts,
  loading,
  formatLabels,
  scalingLabels,
  formatWorkoutDescription,
  getMovementSummary,
  onView,
  onEdit,
  onDelete,
}: WorkoutGridProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/2 mt-2" />
            </CardHeader>
            <CardContent>
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-2/3 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (workouts.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Inga pass hittades</h3>
        <p className="text-muted-foreground">Prova att ändra dina sökfilter.</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {workouts.map((workout) => (
        <Card
          key={workout.id}
          className="hover:border-primary/50 transition-colors cursor-pointer group"
          onClick={() => onView?.(workout)}
        >
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg flex items-center gap-2">
                  {workout.isBenchmark && (
                    <Trophy className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                  )}
                  <span className="truncate">{workout.name}</span>
                </CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  {formatLabels[workout.format]?.icon}
                  {formatLabels[workout.format]?.labelSv || workout.format}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge
                  className={`${scalingLabels[workout.scalingLevel]?.color || 'bg-gray-500'} text-white`}
                >
                  {scalingLabels[workout.scalingLevel]?.label || workout.scalingLevel}
                </Badge>
                {!workout.isBenchmark && (onEdit || onDelete) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onEdit && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(workout);
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Redigera
                        </DropdownMenuItem>
                      )}
                      {onDelete && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(workout);
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Ta bort
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {workout.description}
            </p>
            <div className="mt-3 text-xs text-muted-foreground">
              {formatWorkoutDescription(workout)}
            </div>
            <div className="mt-2 text-xs font-medium">
              {getMovementSummary(workout.movements)}
            </div>
            {workout._count?.results > 0 && (
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <Target className="h-3 w-3" />
                {workout._count.results} resultat
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
