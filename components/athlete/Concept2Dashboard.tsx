'use client';

/**
 * Concept2 Dashboard Component
 *
 * Main dashboard for Concept2 data including:
 * - Recent activity list
 * - Equipment breakdown
 * - Pace analysis
 * - Detailed result view
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Concept2EquipmentChart } from './Concept2EquipmentChart';
import { Concept2PaceAnalysis } from './Concept2PaceAnalysis';
import { Concept2ResultDetail } from './Concept2ResultDetail';
import { Ship, RefreshCw, ArrowLeft, Calendar, Clock, TrendingUp } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { sv } from 'date-fns/locale';

interface SplitData {
  type?: string;
  time?: number;
  distance?: number;
  stroke_rate?: number;
  calories?: number;
  heart_rate?: { average?: number };
}

interface Concept2Result {
  id: string;
  type: string;
  workoutType?: string;
  date: string;
  distance: number;
  time: number;
  calories?: number;
  strokeRate?: number;
  dragFactor?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  minHeartRate?: number;
  pace?: number;
  tss?: number;
  trimp?: number;
  mappedIntensity?: string;
  isVerified: boolean;
  splits?: SplitData[];
  comments?: string;
}

interface Concept2DashboardProps {
  clientId: string;
}

const EQUIPMENT_OPTIONS = [
  { value: 'all', label: 'All utrustning' },
  { value: 'rower', label: 'RowErg' },
  { value: 'skierg', label: 'SkiErg' },
  { value: 'bike', label: 'BikeErg' },
];

export function Concept2Dashboard({ clientId }: Concept2DashboardProps) {
  const [results, setResults] = useState<Concept2Result[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<Concept2Result | null>(null);
  const [equipmentFilter, setEquipmentFilter] = useState('all');
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchResults = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/integrations/concept2/sync?clientId=${clientId}&limit=100`
      );

      if (!response.ok) {
        if (response.status === 404) {
          // Not connected - show empty state
          setResults([]);
          return;
        }
        throw new Error('Kunde inte hämta Concept2-data');
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      const response = await fetch('/api/integrations/concept2/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, daysBack: 30 }),
      });

      if (!response.ok) {
        throw new Error('Synkronisering misslyckades');
      }

      // Refresh results after sync
      await fetchResults();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Synkronisering misslyckades');
    } finally {
      setIsSyncing(false);
    }
  };

  // Filter results by equipment
  const filteredResults =
    equipmentFilter === 'all'
      ? results
      : results.filter((r) => r.type === equipmentFilter);

  if (selectedResult) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => setSelectedResult(null)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Tillbaka
        </Button>
        <Concept2ResultDetail result={selectedResult} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
        </div>
        <Skeleton className="h-[200px]" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center space-y-4">
            <Ship className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={fetchResults}>Försök igen</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center space-y-4">
            <Ship className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="font-medium">Ingen Concept2-data</h3>
            <p className="text-sm text-muted-foreground">
              Anslut ditt Concept2 Logbook-konto för att synkronisera träningsdata.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters and sync button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Ship className="h-6 w-6" />
          <h2 className="text-lg font-semibold">Concept2</h2>
          <Badge variant="outline">{results.length} pass</Badge>
        </div>
        <div className="flex items-center gap-3">
          <Select value={equipmentFilter} onValueChange={setEquipmentFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EQUIPMENT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Synkar...' : 'Synka'}
          </Button>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Concept2EquipmentChart results={results} />
        <Concept2PaceAnalysis
          results={filteredResults}
          equipmentFilter={equipmentFilter === 'all' ? undefined : equipmentFilter}
        />
      </div>

      {/* Recent Results List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Senaste pass
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredResults.slice(0, 10).map((result) => (
              <ResultRow
                key={result.id}
                result={result}
                onClick={() => setSelectedResult(result)}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ResultRow({
  result,
  onClick,
}: {
  result: Concept2Result;
  onClick: () => void;
}) {
  const equipmentLabels: Record<string, string> = {
    rower: 'RowErg',
    skierg: 'SkiErg',
    bike: 'BikeErg',
    dynamic: 'Dynamic',
    slides: 'Slides',
    multierg: 'MultiErg',
  };

  const formatTime = (tenths: number) => {
    const totalSeconds = tenths / 10;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatPace = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${secs.padStart(4, '0')}`;
  };

  const formatDistance = (meters: number) => {
    return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;
  };

  return (
    <div
      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className="text-center w-12">
          <p className="text-xs text-muted-foreground">
            {format(new Date(result.date), 'd MMM', { locale: sv })}
          </p>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {equipmentLabels[result.type] || result.type}
            </span>
            {result.workoutType && (
              <span className="text-sm text-muted-foreground">
                - {result.workoutType}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {formatDistance(result.distance)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(result.time)}
            </span>
            {result.pace && (
              <span>{formatPace(result.pace)}/500m</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {result.tss && (
          <Badge variant="outline" className="text-xs">
            TSS {Math.round(result.tss)}
          </Badge>
        )}
        {result.avgHeartRate && (
          <Badge variant="outline" className="text-xs">
            {Math.round(result.avgHeartRate)} bpm
          </Badge>
        )}
      </div>
    </div>
  );
}
