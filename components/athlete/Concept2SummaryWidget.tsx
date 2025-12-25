'use client';

/**
 * Concept2 Summary Widget
 *
 * Compact widget for dashboard showing:
 * - Recent workout count
 * - Total distance/time
 * - Quick link to full Concept2 page
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Ship, ArrowRight, Activity, Timer } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { sv } from 'date-fns/locale';

interface Concept2Result {
  id: string;
  type: string;
  date: string;
  distance: number;
  time: number;
  pace?: number;
}

interface Concept2SummaryWidgetProps {
  clientId: string;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${meters} m`;
}

function formatDuration(tenths: number): string {
  const totalMinutes = Math.floor(tenths / 600);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} min`;
}

const EQUIPMENT_LABELS: Record<string, string> = {
  rower: 'RowErg',
  skierg: 'SkiErg',
  bike: 'BikeErg',
};

export function Concept2SummaryWidget({ clientId }: Concept2SummaryWidgetProps) {
  const [results, setResults] = useState<Concept2Result[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    async function fetchResults() {
      try {
        const response = await fetch(
          `/api/integrations/concept2/sync?clientId=${clientId}&limit=5`
        );

        if (response.status === 404) {
          // Not connected
          setIsConnected(false);
          setResults([]);
        } else if (response.ok) {
          const data = await response.json();
          setResults(data.results || []);
          setIsConnected(true);
        }
      } catch (error) {
        console.error('Error fetching Concept2 results:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchResults();
  }, [clientId]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Ship className="h-4 w-4" />
            Concept2
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const totalDistance = results.reduce((sum, r) => sum + r.distance, 0);
  const totalTime = results.reduce((sum, r) => sum + r.time, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Ship className="h-4 w-4" />
            Concept2
          </CardTitle>
          <Link href="/athlete/concept2">
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              Visa allt
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {!isConnected ? (
          <div className="text-center py-4">
            <Ship className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              Anslut Concept2 Logbook
            </p>
            <Link href="/athlete/settings">
              <Button variant="outline" size="sm">
                Anslut
              </Button>
            </Link>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-4">
            <Ship className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Ingen Concept2-data ännu
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold">{results.length}</p>
                <p className="text-xs text-muted-foreground">Pass</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold">{formatDistance(totalDistance)}</p>
                <p className="text-xs text-muted-foreground">Totalt</p>
              </div>
            </div>

            {/* Latest Session */}
            {results[0] && (
              <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      {formatDistance(results[0].distance)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(results[0].date), {
                        addSuffix: true,
                        locale: sv,
                      })}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {EQUIPMENT_LABELS[results[0].type] || results[0].type}
                </Badge>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
