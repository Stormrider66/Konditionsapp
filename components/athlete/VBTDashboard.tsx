'use client';

/**
 * VBT Dashboard Component
 *
 * Main dashboard for Velocity-Based Training data:
 * - Upload VBT CSV files
 * - View session history
 * - View load-velocity profiles
 * - Track progression with VBT data
 */

import { useState, useCallback, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VBTUploadWidget } from './VBTUploadWidget';
import { VBTSessionHistory } from './VBTSessionHistory';
import { VBTProgressionWidget } from './VBTProgressionWidget';
import { Upload, History, TrendingUp, Gauge } from 'lucide-react';

interface VBTDashboardProps {
  clientId: string;
}

export function VBTDashboard({ clientId }: VBTDashboardProps) {
  const [activeTab, setActiveTab] = useState('upload');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadComplete = useCallback(async (sessionId?: string) => {
    // Trigger progression update if we have a session ID
    if (sessionId) {
      try {
        await fetch('/api/athlete/vbt/progression', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId, sessionId }),
        });
      } catch (error) {
        console.error('Failed to update progression:', error);
      }
    }

    // Switch to history tab and refresh
    setActiveTab('history');
    setRefreshKey((prev) => prev + 1);
  }, [clientId]);

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Ladda upp
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Historik
          </TabsTrigger>
          <TabsTrigger value="progression" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Progression
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-4">
          <VBTUploadWidget
            clientId={clientId}
            onUploadComplete={handleUploadComplete}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <VBTSessionHistory
            key={refreshKey}
            clientId={clientId}
            limit={20}
          />
        </TabsContent>

        <TabsContent value="progression" className="mt-4">
          <VBTProgressionView key={refreshKey} clientId={clientId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * VBT Progression View - Full page progression display
 */
function VBTProgressionView({ clientId }: { clientId: string }) {
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch summary on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(
          `/api/athlete/vbt/progression?clientId=${clientId}&type=summary`
        );
        if (response.ok) {
          const result = await response.json();
          setData(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch progression data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [clientId]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-32 bg-muted rounded-lg mb-4" />
          <div className="h-48 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  if (!data || data.exercisesWithVBT === 0) {
    return (
      <div className="text-center py-12">
        <Gauge className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-medium mb-2">Ingen progressionsdata</h3>
        <p className="text-sm text-muted-foreground">
          Ladda upp VBT-data för att börja spåra din styrketräningsprogression
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Widget */}
      <VBTProgressionWidget clientId={clientId} />

      {/* Exercise List */}
      <div className="space-y-4">
        <h3 className="font-medium">Övningsöversikt</h3>
        <div className="grid gap-3">
          {data.exerciseSummaries.map((exercise: any) => (
            <ExerciseCard
              key={exercise.exerciseId}
              exercise={exercise}
              isSelected={selectedExercise === exercise.exerciseId}
              onClick={() =>
                setSelectedExercise(
                  selectedExercise === exercise.exerciseId
                    ? null
                    : exercise.exerciseId
                )
              }
              clientId={clientId}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Exercise Card with expandable details
 */
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Dumbbell } from 'lucide-react';
import { VBTExerciseProgression } from './VBTProgressionWidget';

function ExerciseCard({
  exercise,
  isSelected,
  onClick,
  clientId,
}: {
  exercise: any;
  isSelected: boolean;
  onClick: () => void;
  clientId: string;
}) {
  const TREND_COLORS = {
    IMPROVING: 'text-green-600 bg-green-50',
    STABLE: 'text-blue-600 bg-blue-50',
    DECLINING: 'text-red-600 bg-red-50',
  };

  const trendClass = exercise.velocityTrend
    ? TREND_COLORS[exercise.velocityTrend as keyof typeof TREND_COLORS]
    : '';

  return (
    <Card className="cursor-pointer transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div onClick={onClick}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Dumbbell className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium">{exercise.exerciseName}</p>
                <div className="flex items-center gap-2 mt-1">
                  {exercise.recommended1RM > 0 && (
                    <Badge variant="outline" className="text-xs">
                      e1RM: {exercise.recommended1RM} kg
                    </Badge>
                  )}
                  {exercise.velocityTrend && (
                    <Badge className={`text-xs ${trendClass}`}>
                      {exercise.velocityTrend === 'IMPROVING'
                        ? 'Förbättras'
                        : exercise.velocityTrend === 'DECLINING'
                        ? 'Sjunker'
                        : 'Stabil'}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            {isSelected ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Expanded Details */}
        {isSelected && (
          <div className="mt-4 pt-4 border-t">
            <VBTExerciseProgression
              clientId={clientId}
              exerciseId={exercise.exerciseId}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
