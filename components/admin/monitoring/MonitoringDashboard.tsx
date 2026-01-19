'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, AlertTriangle, Users, Clock, TrendingUp, Wifi, WifiOff } from 'lucide-react';
import { LiveErrorStream } from './LiveErrorStream';
import { MetricsCharts } from './MetricsCharts';

interface RealtimeMetrics {
  timestamp: string;
  metrics: {
    recentErrors: number;
    unresolvedErrors: number;
    activeUsers: number;
    totalUsers: number;
    recentActivities: number;
    errorRate: string;
  };
  latestErrors: Array<{
    id: string;
    level: string;
    message: string;
    route: string | null;
    createdAt: string;
    sentryEventId: string | null;
  }>;
}

export function MonitoringDashboard() {
  const [metrics, setMetrics] = useState<RealtimeMetrics | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Connect to SSE stream
    const connectSSE = () => {
      const eventSource = new EventSource('/api/admin/monitoring/stream');
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as RealtimeMetrics;
          setMetrics(data);
          setLastUpdate(new Date());
        } catch (e) {
          console.error('Failed to parse SSE data:', e);
        }
      };

      eventSource.onerror = () => {
        setConnected(false);
        eventSource.close();
        // Reconnect after 5 seconds
        setTimeout(connectSSE, 5000);
      };
    };

    connectSSE();

    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Real-Time Monitoring
        </h2>
        <Badge
          variant={connected ? 'default' : 'destructive'}
          className={connected ? 'bg-green-100 text-green-700' : ''}
        >
          {connected ? (
            <>
              <Wifi className="h-3 w-3 mr-1" />
              Live
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3 mr-1" />
              Disconnected
            </>
          )}
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              {metrics && metrics.metrics.unresolvedErrors > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {metrics.metrics.unresolvedErrors}
                </Badge>
              )}
            </div>
            <p className="text-2xl font-bold">
              {metrics?.metrics.unresolvedErrors ?? '-'}
            </p>
            <p className="text-xs text-muted-foreground">Unresolved Errors</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
            </div>
            <p className="text-2xl font-bold">
              {metrics?.metrics.errorRate ?? '-'}%
            </p>
            <p className="text-xs text-muted-foreground">Error Rate (5min)</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold">
              {metrics?.metrics.activeUsers ?? '-'}
            </p>
            <p className="text-xs text-muted-foreground">Active Users (1h)</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Activity className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold">
              {metrics?.metrics.recentActivities ?? '-'}
            </p>
            <p className="text-xs text-muted-foreground">Activities (1h)</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Clock className="h-5 w-5 text-gray-500" />
            </div>
            <p className="text-2xl font-bold">
              {lastUpdate
                ? lastUpdate.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
                : '-'}
            </p>
            <p className="text-xs text-muted-foreground">Last Update</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Error Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MetricsCharts />
        <LiveErrorStream errors={metrics?.latestErrors || []} />
      </div>
    </div>
  );
}
