'use client';

/**
 * Hybrid Studio Client Component
 *
 * Main client component for the Hybrid Studio featuring:
 * - Workout list with filtering
 * - Benchmark workouts browser
 * - Create new workout dialog
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import { useLocale } from '@/i18n/client';
import { Button } from '@/components/ui/button';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle, GlassCardDescription } from '@/components/ui/GlassCard';
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
  FileUp,
  CalendarPlus,
} from 'lucide-react';
import { toast } from 'sonner';
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
import { TeamWorkoutAssignmentDialog } from '@/components/coach/team/TeamWorkoutAssignmentDialog';
import type { HybridWorkoutWithSections, HybridMetconData, HybridSectionData } from '@/types';
import { CalendarAssignDialog } from '@/components/calendar/CalendarAssignDialog';
import { ImportWorkoutDialog } from '@/components/workouts/import/ImportWorkoutDialog';
import { toHybridBuilderInitialData } from '@/components/workouts/import/converters';
import { TeamCalendarStudioContextBanner } from '@/components/coach/team-calendar/TeamCalendarStudioContextBanner';
import { PlanTeamWorkoutDialog } from '@/components/coach/team-calendar/PlanTeamWorkoutDialog';
import { useTeamCalendarWorkoutLink } from '@/lib/team-calendar/use-team-calendar-workout-link';
import { getBusinessScopeHeaders } from '@/lib/business-scope-client';
import {
  useTeamNameLookup,
  useWorkoutLibraryTeams,
  WorkoutTeamYearBadges,
  WorkoutTeamYearFilters,
} from '@/components/workouts/WorkoutLibraryMetadataFields';

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
  teamId?: string | null;
  trainingYear?: number | null;
  tags: string[];
  movements: HybridMovement[];
  // Section data
  warmupData?: HybridSectionData;
  strengthData?: HybridSectionData;
  metconData?: HybridMetconData;
  cooldownData?: HybridSectionData;
  coachId?: string;
  isPublic?: boolean;
  _count: {
    results: number;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

type AppLocale = 'en' | 'sv';

const COPY: Record<AppLocale, {
  description: string;
  importWorkout: string;
  newWorkout: string;
  reviewImported: string;
  createNewHybrid: string;
  createDescription: string;
  searchPlaceholder: string;
  allFormats: string;
  all: string;
  myWorkouts: string;
  emptyCustomTitle: string;
  emptyCustomDescription: string;
  createWorkout: string;
  editWorkout: string;
  editDescription: string;
  deleteTitle: string;
  deleteDescription: (name?: string) => string;
  cancel: string;
  deleting: string;
  delete: string;
  openError: string;
  openErrorTitle: string;
  movementCount: (count: number) => string;
  unmatchedMovements: (count: number) => string;
  importSuccess: string;
  noWorkoutsTitle: string;
  noWorkoutsDescription: string;
  results: string;
  actions: string;
  edit: string;
  assign: string;
  plan: string;
  remove: string;
}> = {
  en: {
    description: 'Create and manage CrossFit, HYROX, and functional workouts',
    importWorkout: 'Import workout',
    newWorkout: 'New workout',
    reviewImported: 'Review imported workout',
    createNewHybrid: 'Create new hybrid workout',
    createDescription: 'Choose a format and add movements to create your workout.',
    searchPlaceholder: 'Search workouts...',
    allFormats: 'All formats',
    all: 'All',
    myWorkouts: 'My workouts',
    emptyCustomTitle: 'No custom workouts yet',
    emptyCustomDescription: 'Create your first hybrid workout to get started.',
    createWorkout: 'Create workout',
    editWorkout: 'Edit workout',
    editDescription: 'Change the workout settings and movements.',
    deleteTitle: 'Delete workout?',
    deleteDescription: (name) => `Are you sure you want to delete "${name ?? ''}"? This cannot be undone.`,
    cancel: 'Cancel',
    deleting: 'Deleting...',
    delete: 'Delete',
    openError: 'Could not open the hybrid workout',
    openErrorTitle: 'Could not open workout',
    movementCount: (count) => `${count} movements`,
    unmatchedMovements: (count) =>
      `${count} movement${count === 1 ? '' : 's'} did not match the library. Choose the correct exercise for each one before saving.`,
    importSuccess: 'Workout imported. Review and save it in the builder.',
    noWorkoutsTitle: 'No workouts found',
    noWorkoutsDescription: 'Try changing your search filters.',
    results: 'results',
    actions: 'Actions',
    edit: 'Edit',
    assign: 'Assign',
    plan: 'Plan',
    remove: 'Delete',
  },
  sv: {
    description: 'Skapa och hantera CrossFit, HYROX och funktionella pass',
    importWorkout: 'Importera pass',
    newWorkout: 'Nytt Pass',
    reviewImported: 'Granska importerat pass',
    createNewHybrid: 'Skapa Nytt Hybrid Pass',
    createDescription: 'Välj format och lägg till rörelser för att skapa ditt pass.',
    searchPlaceholder: 'Sök pass...',
    allFormats: 'Alla format',
    all: 'Alla',
    myWorkouts: 'Mina Pass',
    emptyCustomTitle: 'Inga egna pass än',
    emptyCustomDescription: 'Skapa ditt första hybrid pass för att komma igång.',
    createWorkout: 'Skapa Pass',
    editWorkout: 'Redigera Pass',
    editDescription: 'Ändra passets inställningar och rörelser.',
    deleteTitle: 'Ta bort pass?',
    deleteDescription: (name) => `Är du säker på att du vill ta bort "${name ?? ''}"? Detta går inte att ångra.`,
    cancel: 'Avbryt',
    deleting: 'Tar bort...',
    delete: 'Ta bort',
    openError: 'Kunde inte öppna hybridpasset',
    openErrorTitle: 'Kunde inte öppna passet',
    movementCount: (count) => `${count} rörelser`,
    unmatchedMovements: (count) =>
      `${count} rörelse${count === 1 ? '' : 'r'} matchades inte i biblioteket - välj rätt övning för var och en innan du sparar.`,
    importSuccess: 'Pass importerat. Granska och spara i byggaren.',
    noWorkoutsTitle: 'Inga pass hittades',
    noWorkoutsDescription: 'Prova att ändra dina sökfilter.',
    results: 'resultat',
    actions: 'Åtgärder',
    edit: 'Redigera',
    assign: 'Tilldela',
    plan: 'Planera',
    remove: 'Ta bort',
  },
};

const formatLabels: Record<string, { label: Record<AppLocale, string>; icon: React.ReactNode }> = {
  AMRAP: { label: { en: 'AMRAP', sv: 'AMRAP' }, icon: <Repeat className="h-4 w-4" /> },
  FOR_TIME: { label: { en: 'For Time', sv: 'På Tid' }, icon: <Timer className="h-4 w-4" /> },
  EMOM: { label: { en: 'EMOM', sv: 'EMOM' }, icon: <Clock className="h-4 w-4" /> },
  TABATA: { label: { en: 'Tabata', sv: 'Tabata' }, icon: <Zap className="h-4 w-4" /> },
  CHIPPER: { label: { en: 'Chipper', sv: 'Chipper' }, icon: <Target className="h-4 w-4" /> },
  LADDER: { label: { en: 'Ladder', sv: 'Stege' }, icon: <Dumbbell className="h-4 w-4" /> },
  INTERVALS: { label: { en: 'Intervals', sv: 'Intervaller' }, icon: <Zap className="h-4 w-4" /> },
  HYROX_SIM: { label: { en: 'HYROX', sv: 'HYROX' }, icon: <Trophy className="h-4 w-4" /> },
  CUSTOM: { label: { en: 'Custom', sv: 'Anpassad' }, icon: <Dumbbell className="h-4 w-4" /> },
};

const scalingLabels: Record<string, { label: string; color: string }> = {
  RX: { label: 'Rx', color: 'bg-green-500' },
  SCALED: { label: 'Scaled', color: 'bg-yellow-500' },
  FOUNDATIONS: { label: 'Foundations', color: 'bg-blue-500' },
};

interface HybridStudioClientProps {
  businessId?: string;
}

export function HybridStudioClient({ businessId }: HybridStudioClientProps = {}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const appLocale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en';
  const copy = COPY[appLocale];
  const [workouts, setWorkouts] = useState<HybridWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [benchmarkOnly] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(
    searchParams.get('fromCalendar') === 'true'
  );
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importedInitialData, setImportedInitialData] = useState<
    Parameters<typeof HybridWorkoutBuilder>[0]['initialData'] | null
  >(null);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedWorkout, setSelectedWorkout] = useState<HybridWorkout | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteWorkout, setDeleteWorkout] = useState<HybridWorkout | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // Detail sheet state
  const [sheetWorkout, setSheetWorkout] = useState<HybridWorkout | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isTeamAssignOpen, setIsTeamAssignOpen] = useState(false);
  const [planWorkout, setPlanWorkout] = useState<HybridWorkout | null>(null);
  const teamCalendarLink = useTeamCalendarWorkoutLink('HYBRID');

  // Calendar assignment flow
  const fromCalendar = searchParams.get('fromCalendar') === 'true';
  const calendarClientId = searchParams.get('clientId');
  const calendarDate = searchParams.get('date');
  const editWorkoutId = searchParams.get('editWorkoutId');
  const appliedEditWorkoutIdRef = useRef<string | null>(null);
  const [calendarAssignSessionId, setCalendarAssignSessionId] = useState<string | null>(null);

  const businessSlug = useMemo(() => {
    if (!pathname) return undefined;
    const match = pathname.match(/^\/([^/]+)\/coach\//);
    if (match && match[1] !== 'coach') return match[1];
    return undefined;
  }, [pathname]);
  const businessHeaders = useMemo(() => ({
    ...(getBusinessScopeHeaders(pathname) ?? {}),
    ...(businessId ? { 'x-business-id': businessId } : {}),
  }), [businessId, pathname]);
  const { teams } = useWorkoutLibraryTeams(businessHeaders);
  const teamNames = useTeamNameLookup(teams);

  useEffect(() => {
    if (!editWorkoutId || appliedEditWorkoutIdRef.current === editWorkoutId) return;
    appliedEditWorkoutIdRef.current = editWorkoutId;

    let cancelled = false;
    fetch(`/api/hybrid-workouts/${editWorkoutId}`, {
      headers: businessHeaders,
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || copy.openError);
        }
        return res.json();
      })
      .then((workout: HybridWorkout) => {
        if (cancelled) return;
        setSelectedWorkout(workout);
        setIsEditOpen(true);
      })
      .catch((error) => {
        if (cancelled) return;
        toast.error(copy.openErrorTitle, {
          description: error instanceof Error ? error.message : undefined,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [businessHeaders, copy.openError, copy.openErrorTitle, editWorkoutId]);

  const handleDelete = async () => {
    if (!deleteWorkout) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/hybrid-workouts/${deleteWorkout.id}`, {
        method: 'DELETE',
        headers: businessHeaders,
      });

      if (response.ok) {
        setDeleteWorkout(null);
        void fetchWorkouts();
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

  const handleSheetTeamAssign = () => {
    setIsTeamAssignOpen(true);
  };

  const fetchWorkouts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (formatFilter && formatFilter !== 'all') params.set('format', formatFilter);
      if (teamFilter && teamFilter !== 'all') params.set('teamId', teamFilter);
      if (yearFilter && yearFilter !== 'all') params.set('trainingYear', yearFilter);
      if (benchmarkOnly) params.set('benchmarkOnly', 'true');
      params.set('limit', '50');

      const response = await fetch(`/api/hybrid-workouts?${params}`, {
        headers: businessHeaders,
      });
      if (response.ok) {
        const data = await response.json();
        setWorkouts(data.workouts);
      }
    } catch (error) {
      console.error('Failed to fetch workouts:', error);
    } finally {
      setLoading(false);
    }
  }, [benchmarkOnly, businessHeaders, formatFilter, search, teamFilter, yearFilter]);

  useEffect(() => {
    void fetchWorkouts();
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
      parts.push(copy.movementCount(movementCount));
    }

    return parts.join(' • ');
  }

  function getMovementSummary(movements: HybridMovement[]): string {
    if (!movements || movements.length === 0) return '';

    return movements
      .slice(0, 3)
      .map((m) => (appLocale === 'sv' ? m.exercise.nameSv : null) || m.exercise.name)
      .join(', ') + (movements.length > 3 ? ` +${movements.length - 3}` : '');
  }

  const benchmarkWorkouts = workouts.filter((w) => w.isBenchmark);
  const customWorkouts = workouts.filter((w) => !w.isBenchmark);

  return (
    <div className="space-y-6">
      <TeamCalendarStudioContextBanner />

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Hybrid Studio</h1>
          <p className="text-muted-foreground">
            {copy.description}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsImportOpen(true)}>
            <FileUp className="mr-2 h-4 w-4" />
            {copy.importWorkout}
          </Button>
          <Dialog
            open={isCreateOpen}
            onOpenChange={(next) => {
              setIsCreateOpen(next);
              if (!next) setImportedInitialData(null);
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {copy.newWorkout}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {importedInitialData ? copy.reviewImported : copy.createNewHybrid}
                </DialogTitle>
                <DialogDescription>
                  {copy.createDescription}
                </DialogDescription>
              </DialogHeader>
              <HybridWorkoutBuilder
                initialData={importedInitialData ?? undefined}
                businessId={businessId}
                onSave={async (workoutId, workoutName) => {
                  if (teamCalendarLink.fromTeamCalendar && workoutId) {
                    await teamCalendarLink.linkSavedWorkout(workoutId, workoutName);
                    setIsCreateOpen(false);
                    setImportedInitialData(null);
                    void fetchWorkouts();
                  } else if (fromCalendar && calendarClientId && calendarDate && workoutId) {
                    setIsCreateOpen(false);
                    setImportedInitialData(null);
                    setCalendarAssignSessionId(workoutId);
                  } else {
                    setIsCreateOpen(false);
                    setImportedInitialData(null);
                    void fetchWorkouts();
                  }
                }}
                onCancel={() => {
                  setIsCreateOpen(false);
                  setImportedInitialData(null);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-white/5 p-3 rounded-xl backdrop-blur-sm shadow-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={copy.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
          />
        </div>
        <Select value={formatFilter} onValueChange={setFormatFilter}>
          <SelectTrigger className="w-[180px] bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
            <SelectValue placeholder={copy.allFormats} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{copy.allFormats}</SelectItem>
            {Object.entries(formatLabels).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>
                {label[appLocale]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <WorkoutTeamYearFilters
          teams={teams}
          teamFilter={teamFilter}
          yearFilter={yearFilter}
          onTeamFilterChange={setTeamFilter}
          onYearFilterChange={setYearFilter}
          className="flex flex-col gap-3 md:flex-row"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 p-1 rounded-xl gap-1">
          <TabsTrigger value="all" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white data-[state=active]:bg-white dark:data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:border data-[state=active]:border-slate-200/80 dark:data-[state=active]:border-blue-500/30 data-[state=active]:shadow-sm">
            {copy.all} ({workouts.length})
          </TabsTrigger>
          <TabsTrigger value="benchmarks" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white data-[state=active]:bg-white dark:data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:border data-[state=active]:border-slate-200/80 dark:data-[state=active]:border-blue-500/30 data-[state=active]:shadow-sm">
            Benchmarks ({benchmarkWorkouts.length})
          </TabsTrigger>
          <TabsTrigger value="custom" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white data-[state=active]:bg-white dark:data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:border data-[state=active]:border-slate-200/80 dark:data-[state=active]:border-blue-500/30 data-[state=active]:shadow-sm">
            {copy.myWorkouts} ({customWorkouts.length})
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
            locale={appLocale}
            copy={copy}
            onView={handleOpenSheet}
            onEdit={handleEdit}
            onPlan={setPlanWorkout}
            onDelete={setDeleteWorkout}
            teamNames={teamNames}
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
                    locale={appLocale}
                    copy={copy}
                    onView={handleOpenSheet}
                    onEdit={handleEdit}
                    onPlan={setPlanWorkout}
                    onDelete={setDeleteWorkout}
                    teamNames={teamNames}
                  />
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="custom" className="mt-6">
          {customWorkouts.length === 0 && !loading ? (
            <GlassCard glow="blue" className="p-8 text-center">
              <GlassCardContent>
                <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-pulse" />
                <h3 className="text-lg font-semibold mb-2 text-white">{copy.emptyCustomTitle}</h3>
                <p className="text-slate-400 mb-4">
                  {copy.emptyCustomDescription}
                </p>
                <Button onClick={() => setIsCreateOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  {copy.createWorkout}
                </Button>
              </GlassCardContent>
            </GlassCard>
          ) : (
            <WorkoutGrid
              workouts={customWorkouts}
              loading={loading}
              formatLabels={formatLabels}
              scalingLabels={scalingLabels}
              formatWorkoutDescription={formatWorkoutDescription}
              getMovementSummary={getMovementSummary}
              locale={appLocale}
              copy={copy}
              onView={handleOpenSheet}
              onEdit={handleEdit}
              onPlan={setPlanWorkout}
              onDelete={setDeleteWorkout}
              teamNames={teamNames}
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
        onTeamAssign={handleSheetTeamAssign}
        businessId={businessId}
      />

      {/* Assignment Dialog */}
      {sheetWorkout && (
        <WorkoutAssignmentDialog
          workout={sheetWorkout}
          open={isAssignOpen}
          onOpenChange={setIsAssignOpen}
          onAssigned={() => {
            setIsAssignOpen(false);
            void fetchWorkouts();
          }}
          businessId={businessId}
        />
      )}

      {/* Team Assignment Dialog */}
      {sheetWorkout && (
        <TeamWorkoutAssignmentDialog
          workoutType="hybrid"
          workoutId={sheetWorkout.id}
          workoutName={sheetWorkout.name}
          open={isTeamAssignOpen}
          onOpenChange={setIsTeamAssignOpen}
          onAssigned={() => {
            setIsTeamAssignOpen(false);
            void fetchWorkouts();
          }}
        />
      )}

      <PlanTeamWorkoutDialog
        key={planWorkout?.id ?? 'hybrid-plan-dialog'}
        open={Boolean(planWorkout)}
        onOpenChange={(open) => {
          if (!open) setPlanWorkout(null);
        }}
        workoutType="HYBRID"
        workoutId={planWorkout?.id ?? null}
        workoutName={planWorkout?.name ?? ''}
        workoutDescription={planWorkout?.description ?? null}
        onPlanned={() => void fetchWorkouts()}
      />

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{copy.editWorkout}</DialogTitle>
            <DialogDescription>
              {copy.editDescription}
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
                teamId: selectedWorkout.teamId,
                trainingYear: selectedWorkout.trainingYear,
                tags: selectedWorkout.tags,
                metconData: selectedWorkout.metconData,
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
              businessId={businessId}
              onSave={() => {
                setIsEditOpen(false);
                setSelectedWorkout(null);
                void fetchWorkouts();
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
            <AlertDialogTitle>{copy.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {copy.deleteDescription(deleteWorkout?.name)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{copy.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? copy.deleting : copy.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportWorkoutDialog
        workoutType="HYBRID"
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        onImported={({ workout, mappings, resolutions }) => {
          if (workout.workoutType !== 'HYBRID') return;
          // Build a name → display-name map from resolutions so the builder
          // shows real exercise names where the resolver matched. Falls back
          // to the imported text for unmapped movements.
          const nameLookup: Record<string, string> = {};
          for (const r of resolutions) {
            const id = mappings[r.name];
            if (id) {
              const cand = r.candidates.find((c) => c.id === id);
              if (cand) nameLookup[r.name] = cand.name;
            }
          }
          setImportedInitialData(toHybridBuilderInitialData(workout, mappings, nameLookup));
          setIsCreateOpen(true);
          // Movements without a library match get a synthetic exerciseId
          // ("MISSING:<name>") so the coach can see the name in the builder
          // — but the API will reject those at save. Warn so they know
          // they need to swap each unmatched movement before saving.
          const unmatched = workout.movements.filter((m) => !mappings[m.exerciseName]).length;
          if (unmatched > 0) {
            toast.warning(copy.unmatchedMovements(unmatched));
          } else {
            toast.success(copy.importSuccess);
          }
        }}
      />

      {/* Calendar Assignment Dialog */}
      {calendarAssignSessionId && calendarClientId && calendarDate && (
        <CalendarAssignDialog
          open={!!calendarAssignSessionId}
          onOpenChange={(open) => {
            if (!open) setCalendarAssignSessionId(null);
          }}
          sessionType="hybrid"
          sessionId={calendarAssignSessionId}
          clientId={calendarClientId}
          date={calendarDate}
          businessSlug={businessSlug}
          businessId={businessId}
        />
      )}
    </div>
  );
}

interface WorkoutGridProps {
  workouts: HybridWorkout[];
  loading: boolean;
  formatLabels: Record<string, { label: Record<AppLocale, string>; icon: React.ReactNode }>;
  scalingLabels: Record<string, { label: string; color: string }>;
  formatWorkoutDescription: (workout: HybridWorkout) => string;
  getMovementSummary: (movements: HybridMovement[]) => string;
  locale: AppLocale;
  copy: typeof COPY[AppLocale];
  onView?: (workout: HybridWorkout) => void;
  onEdit?: (workout: HybridWorkout) => void;
  onPlan?: (workout: HybridWorkout) => void;
  onDelete?: (workout: HybridWorkout) => void;
  teamNames: Map<string, string>;
}

function WorkoutGrid({
  workouts,
  loading,
  formatLabels,
  scalingLabels,
  formatWorkoutDescription,
  getMovementSummary,
  locale,
  copy,
  onView,
  onEdit,
  onPlan,
  onDelete,
  teamNames,
}: WorkoutGridProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <GlassCard key={i} className="animate-pulse">
            <GlassCardHeader>
              <div className="h-6 bg-muted/20 rounded w-3/4 animate-pulse" />
              <div className="h-4 bg-muted/20 rounded w-1/2 mt-2 animate-pulse" />
            </GlassCardHeader>
            <GlassCardContent>
              <div className="h-4 bg-muted/20 rounded w-full animate-pulse" />
              <div className="h-4 bg-muted/20 rounded w-2/3 mt-2 animate-pulse" />
            </GlassCardContent>
          </GlassCard>
        ))}
      </div>
    );
  }

  if (workouts.length === 0) {
    return (
      <GlassCard glow="blue" className="p-8 text-center">
        <GlassCardContent>
          <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-white">{copy.noWorkoutsTitle}</h3>
          <p className="text-muted-foreground">{copy.noWorkoutsDescription}</p>
        </GlassCardContent>
      </GlassCard>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {workouts.map((workout) => {
        const glowColor =
          workout.scalingLevel === 'RX' ? 'emerald' : workout.scalingLevel === 'SCALED' ? 'amber' : 'blue';
        const teamName = workout.teamId ? teamNames.get(workout.teamId) ?? 'Lag' : null;

        return (
          <GlassCard
            key={workout.id}
            glow={glowColor}
            className="hover:border-white/20 transition-all duration-300 cursor-pointer group hover:scale-[1.02]"
            onClick={() => onView?.(workout)}
          >
            <GlassCardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <GlassCardTitle className="text-lg flex items-center gap-2 text-slate-900 group-hover:text-slate-950 dark:text-slate-100 dark:group-hover:text-white">
                    {workout.isBenchmark && (
                      <Trophy className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                    )}
                    <span className="truncate">{workout.name}</span>
                  </GlassCardTitle>
                  <GlassCardDescription className="flex items-center gap-2 mt-1">
                    {formatLabels[workout.format]?.icon}
                    {formatLabels[workout.format]?.label[locale] || workout.format}
                  </GlassCardDescription>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {onPlan && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 border-slate-200 bg-white/75 text-slate-700 hover:bg-white hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white"
                      onClick={(event) => {
                        event.stopPropagation();
                        onPlan(workout);
                      }}
                    >
                      <CalendarPlus className="mr-1.5 h-3.5 w-3.5" />
                      {copy.plan}
                    </Button>
                  )}
                  <Badge
                    className={`${scalingLabels[workout.scalingLevel]?.color || 'bg-gray-500'} text-white border-none`}
                  >
                    {scalingLabels[workout.scalingLevel]?.label || workout.scalingLevel}
                  </Badge>
                  {!workout.isBenchmark && (onEdit || onDelete) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity bg-white/5 hover:bg-white/10 border-none text-slate-300"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-slate-900/90 border border-white/10 backdrop-blur-md">
                        {onEdit && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(workout);
                            }}
                            className="hover:bg-white/5 focus:bg-white/5"
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            {copy.edit}
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(workout);
                            }}
                            className="text-destructive focus:text-destructive hover:bg-red-500/10 focus:bg-red-500/10"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {copy.remove}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </GlassCardHeader>
            <GlassCardContent>
              <p className="text-sm text-slate-400 line-clamp-2">
                {workout.description}
              </p>
              <div className="mt-3 text-xs text-muted-foreground font-medium">
                {formatWorkoutDescription(workout)}
              </div>
              <div className="mt-2 text-xs font-semibold text-blue-400">
                {getMovementSummary(workout.movements)}
              </div>
              <WorkoutTeamYearBadges
                teamName={teamName}
                trainingYear={workout.trainingYear}
                className="mt-3 flex flex-wrap gap-1"
              />
              {workout._count?.results > 0 && (
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground font-mono">
                  <Target className="h-3 w-3 text-emerald-500" />
                  {workout._count.results} {copy.results}
                </div>
              )}
            </GlassCardContent>
          </GlassCard>
        );
      })}
    </div>
  );
}
