'use client';

/**
 * VBT Summary Widget
 *
 * Compact widget for dashboard showing:
 * - Recent VBT session count
 * - Latest session info
 * - Quick link to full VBT page
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Gauge, ArrowRight, Upload, TrendingUp, Dumbbell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { sv } from 'date-fns/locale';

interface VBTSession {
  id: string;
  sessionDate: string;
  deviceType: string;
  totalSets: number;
  totalReps: number;
  exerciseCount: number;
}

interface VBTSummaryWidgetProps {
  clientId: string;
}

export function VBTSummaryWidget({ clientId }: VBTSummaryWidgetProps) {
  const [sessions, setSessions] = useState<VBTSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSessions() {
      try {
        const response = await fetch(`/api/athlete/vbt?clientId=${clientId}&limit=3`);
        if (response.ok) {
          const data = await response.json();
          setSessions(data.sessions || []);
        }
      } catch (error) {
        console.error('Error fetching VBT sessions:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSessions();
  }, [clientId]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            VBT Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const totalRepsLast7Days = sessions.reduce((sum, s) => sum + s.totalReps, 0);
  const totalSetsLast7Days = sessions.reduce((sum, s) => sum + s.totalSets, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            VBT Data
          </CardTitle>
          <Link href="/athlete/vbt">
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              Visa allt
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <div className="text-center py-4">
            <Dumbbell className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              Ingen VBT-data ännu
            </p>
            <Link href="/athlete/vbt">
              <Button variant="outline" size="sm">
                <Upload className="mr-2 h-4 w-4" />
                Ladda upp CSV
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold">{sessions.length}</p>
                <p className="text-xs text-muted-foreground">Pass</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold">{totalRepsLast7Days}</p>
                <p className="text-xs text-muted-foreground">Reps</p>
              </div>
            </div>

            {/* Latest Session */}
            {sessions[0] && (
              <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      {sessions[0].exerciseCount} övningar
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(sessions[0].sessionDate), {
                        addSuffix: true,
                        locale: sv,
                      })}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {sessions[0].deviceType}
                </Badge>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
