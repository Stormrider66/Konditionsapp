'use client';

/**
 * Athlete Hybrid Client Component
 *
 * Main client component for athletes to browse and log hybrid workouts.
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
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
  Search,
  Timer,
  Repeat,
  Dumbbell,
  Trophy,
  Zap,
  Clock,
  Target,
  Medal,
  TrendingUp,
  History,
  Flame,
} from 'lucide-react';

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
  _count: {
    results: number;
  };
}

interface AthleteResult {
  id: string;
  workoutId: string;
  scoreType: string;
  timeScore?: number;
  roundsCompleted?: number;
  repsCompleted?: number;
  scalingLevel: string;
  isPR: boolean;
  completedAt: string;
  workout: {
    id: string;
    name: string;
    format: string;
  };
}

interface AthleteHybridClientProps {
  clientId: string;
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
  CUSTOM: { label: 'Custom', color: 'bg-purple-500' },
};

export function AthleteHybridClient({ clientId }: AthleteHybridClientProps) {
  const [workouts, setWorkouts] = useState<HybridWorkout[]>([]);
  const [results, setResults] = useState<AthleteResult[]>([]);
  const [prs, setPrs] = useState<AthleteResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('workouts');

  const fetchWorkouts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (formatFilter && formatFilter !== 'all') params.set('format', formatFilter);
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
  }, [search, formatFilter]);

  const fetchResults = useCallback(async () => {
    try {
      const response = await fetch(`/api/athletes/${clientId}/hybrid-results`);
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
        setPrs(data.prs || []);
      }
    } catch (error) {
      console.error('Failed to fetch results:', error);
    }
  }, [clientId]);

  useEffect(() => {
    fetchWorkouts();
    fetchResults();
  }, [fetchWorkouts, fetchResults]);

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

  function formatScore(result: AthleteResult): string {
    if (result.scoreType === 'TIME' && result.timeScore) {
      const minutes = Math.floor(result.timeScore / 60);
      const seconds = result.timeScore % 60;
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    if (result.scoreType === 'ROUNDS_REPS') {
      if (result.repsCompleted && !result.roundsCompleted) {
        return `${result.repsCompleted} reps`;
      }
      return `${result.roundsCompleted || 0}+${result.repsCompleted || 0}`;
    }
    return '-';
  }

  const benchmarkWorkouts = workouts.filter((w) => w.isBenchmark);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Flame className="h-8 w-8 text-orange-500" />
            Hybrid Pass
          </h1>
          <p className="text-muted-foreground">
            Dina CrossFit, HYROX och funktionella pass
          </p>
        </div>
      </div>

      {/* PR Summary Cards */}
      {prs.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Medal className="h-4 w-4 text-yellow-600" />
                Personliga Rekord
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-700">{prs.length}</div>
              <p className="text-xs text-muted-foreground">PRs totalt</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <History className="h-4 w-4" />
                Loggade Pass
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{results.length}</div>
              <p className="text-xs text-muted-foreground">genomförda pass</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Senaste PR
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold truncate">{prs[0]?.workout?.name || '-'}</div>
              <p className="text-xs text-muted-foreground">
                {prs[0] ? formatScore(prs[0]) : '-'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="workouts">
            <Dumbbell className="h-4 w-4 mr-2" />
            Pass ({workouts.length})
          </TabsTrigger>
          <TabsTrigger value="benchmarks">
            <Trophy className="h-4 w-4 mr-2" />
            Benchmarks ({benchmarkWorkouts.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            Historik ({results.length})
          </TabsTrigger>
          <TabsTrigger value="prs">
            <Medal className="h-4 w-4 mr-2" />
            PRs ({prs.length})
          </TabsTrigger>
        </TabsList>

        {/* Filters - shown for workouts and benchmarks */}
        {(activeTab === 'workouts' || activeTab === 'benchmarks') && (
          <div className="flex flex-col gap-4 md:flex-row md:items-center mt-4">
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
        )}

        <TabsContent value="workouts" className="mt-6">
          <WorkoutGrid
            workouts={workouts}
            loading={loading}
            formatLabels={formatLabels}
            scalingLabels={scalingLabels}
            formatWorkoutDescription={formatWorkoutDescription}
            getMovementSummary={getMovementSummary}
            results={results}
          />
        </TabsContent>

        <TabsContent value="benchmarks" className="mt-6">
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
                    results={results}
                  />
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <ResultsList results={results} formatScore={formatScore} scalingLabels={scalingLabels} />
        </TabsContent>

        <TabsContent value="prs" className="mt-6">
          <PRBoard prs={prs} formatScore={formatScore} scalingLabels={scalingLabels} />
        </TabsContent>
      </Tabs>
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
  results: AthleteResult[];
}

function WorkoutGrid({
  workouts,
  loading,
  formatLabels,
  scalingLabels,
  formatWorkoutDescription,
  getMovementSummary,
  results,
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

  // Get result count per workout
  const resultCounts = results.reduce((acc, r) => {
    acc[r.workoutId] = (acc[r.workoutId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Check if athlete has PR for workout
  const prWorkouts = new Set(results.filter(r => r.isPR).map(r => r.workoutId));

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {workouts.map((workout) => (
        <Link key={workout.id} href={`/athlete/hybrid/${workout.id}`}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {workout.isBenchmark && (
                      <Trophy className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                    )}
                    {prWorkouts.has(workout.id) && (
                      <Medal className="h-4 w-4 text-orange-500 flex-shrink-0" />
                    )}
                    {workout.name}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    {formatLabels[workout.format]?.icon}
                    {formatLabels[workout.format]?.labelSv || workout.format}
                  </CardDescription>
                </div>
                <Badge
                  className={`${scalingLabels[workout.scalingLevel]?.color || 'bg-gray-500'} text-white flex-shrink-0`}
                >
                  {scalingLabels[workout.scalingLevel]?.label || workout.scalingLevel}
                </Badge>
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
              {resultCounts[workout.id] > 0 && (
                <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
                  <History className="h-3 w-3" />
                  {resultCounts[workout.id]} {resultCounts[workout.id] === 1 ? 'gång' : 'gånger'} genomfört
                </div>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

interface ResultsListProps {
  results: AthleteResult[];
  formatScore: (result: AthleteResult) => string;
  scalingLabels: Record<string, { label: string; color: string }>;
}

function ResultsList({ results, formatScore, scalingLabels }: ResultsListProps) {
  if (results.length === 0) {
    return (
      <Card className="p-8 text-center">
        <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Ingen historik än</h3>
        <p className="text-muted-foreground">
          Genomför ditt första pass för att se din historik här.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {results.map((result) => (
        <Link key={result.id} href={`/athlete/hybrid/${result.workoutId}`}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {result.isPR && <Medal className="h-5 w-5 text-yellow-500" />}
                  <div>
                    <div className="font-medium">{result.workout?.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(result.completedAt).toLocaleDateString('sv-SE')}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-lg">{formatScore(result)}</div>
                  <Badge
                    variant="outline"
                    className={`${scalingLabels[result.scalingLevel]?.color || 'bg-gray-500'} text-white text-xs`}
                  >
                    {scalingLabels[result.scalingLevel]?.label || result.scalingLevel}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

interface PRBoardProps {
  prs: AthleteResult[];
  formatScore: (result: AthleteResult) => string;
  scalingLabels: Record<string, { label: string; color: string }>;
}

function PRBoard({ prs, formatScore, scalingLabels }: PRBoardProps) {
  if (prs.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Medal className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Inga personliga rekord än</h3>
        <p className="text-muted-foreground">
          Dina PRs dyker upp här när du loggar resultat.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {prs.map((pr) => (
        <Link key={pr.id} href={`/athlete/hybrid/${pr.workoutId}`}>
          <Card className="hover:border-yellow-500/50 transition-colors cursor-pointer bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Medal className="h-6 w-6 text-yellow-600" />
                  <div>
                    <div className="font-semibold">{pr.workout?.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(pr.completedAt).toLocaleDateString('sv-SE')}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <Badge
                  variant="outline"
                  className={`${scalingLabels[pr.scalingLevel]?.color || 'bg-gray-500'} text-white text-xs`}
                >
                  {scalingLabels[pr.scalingLevel]?.label || pr.scalingLevel}
                </Badge>
                <div className="font-mono font-bold text-xl text-yellow-700">
                  {formatScore(pr)}
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
