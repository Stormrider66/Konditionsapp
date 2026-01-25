'use client';

/**
 * Ergometer Athlete View
 *
 * Coach dashboard for viewing athlete's ergometer data:
 * - Current thresholds (CP, FTP, MAP) per ergometer type
 * - Training zones with power/pace targets
 * - Recent test history
 * - Progression trends
 * - Benchmark comparison
 */

import { useState, useEffect, useCallback } from 'react';
import { ErgometerType } from '@prisma/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Ship,
  Bike,
  Mountain,
  Dumbbell,
  Zap,
  Timer,
  TrendingUp,
  Calendar,
  AlertCircle,
  ChevronRight,
  Trophy,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { sv } from 'date-fns/locale';
import { useWorkoutThemeOptional, MINIMALIST_WHITE_THEME } from '@/lib/themes';

interface ErgometerThreshold {
  id: string;
  ergometerType: ErgometerType;
  criticalPower?: number | null;
  wPrime?: number | null;
  ftp?: number | null;
  mapWatts?: number | null;
  peakPower?: number | null;
  testDate: string;
  confidence?: string | null;
  sourceMethod: string;
}

interface ErgometerZone {
  zone: number;
  name: string;
  nameSwedish: string;
  powerMin: number;
  powerMax: number;
  percentMin: number;
  percentMax: number;
  paceMin?: number | null;
  paceMax?: number | null;
}

interface RecentTest {
  id: string;
  testDate: string;
  ergometerType: ErgometerType;
  testProtocol: string;
  avgPower?: number | null;
  peakPower?: number | null;
  criticalPower?: number | null;
}

interface ErgometerAthleteViewProps {
  clientId: string;
  clientName: string;
}

const ERGOMETER_CONFIG: Record<
  ErgometerType,
  { label: string; icon: React.ReactNode; color: string }
> = {
  CONCEPT2_ROW: { label: 'Roddmaskin', icon: <Ship className="h-4 w-4" />, color: 'blue' },
  CONCEPT2_SKIERG: { label: 'SkiErg', icon: <Mountain className="h-4 w-4" />, color: 'purple' },
  CONCEPT2_BIKEERG: { label: 'BikeErg', icon: <Bike className="h-4 w-4" />, color: 'green' },
  WATTBIKE: { label: 'Wattbike', icon: <Bike className="h-4 w-4" />, color: 'orange' },
  ASSAULT_BIKE: { label: 'Air Bike', icon: <Dumbbell className="h-4 w-4" />, color: 'red' },
};

const ZONE_COLORS: Record<number, string> = {
  1: 'bg-green-500',
  2: 'bg-blue-500',
  3: 'bg-yellow-500',
  4: 'bg-orange-500',
  5: 'bg-red-500',
  6: 'bg-purple-500',
};

function formatPace(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = (seconds % 60).toFixed(1);
  return `${min}:${sec.padStart(4, '0')}`;
}

export function ErgometerAthleteView({ clientId, clientName }: ErgometerAthleteViewProps) {
  const themeContext = useWorkoutThemeOptional();
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME;

  const [thresholds, setThresholds] = useState<ErgometerThreshold[]>([]);
  const [zones, setZones] = useState<Record<ErgometerType, ErgometerZone[]>>({} as Record<ErgometerType, ErgometerZone[]>);
  const [recentTests, setRecentTests] = useState<RecentTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ErgometerType>('CONCEPT2_ROW');

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch thresholds
      const thresholdRes = await fetch(`/api/ergometer-thresholds/${clientId}`);
      if (thresholdRes.ok) {
        const thresholdData = await thresholdRes.json();
        setThresholds(thresholdData.data?.thresholds || []);
      }

      // Fetch zones
      const zonesRes = await fetch(`/api/ergometer-zones/${clientId}`);
      let fetchedZones: Record<ErgometerType, ErgometerZone[]> = {} as Record<ErgometerType, ErgometerZone[]>;
      if (zonesRes.ok) {
        const zonesData = await zonesRes.json();
        fetchedZones = zonesData.data?.zones || {};
        setZones(fetchedZones);
      }

      // Fetch recent tests
      const testsRes = await fetch(`/api/ergometer-tests?clientId=${clientId}&limit=10`);
      if (testsRes.ok) {
        const testsData = await testsRes.json();
        setRecentTests(testsData.data?.tests || []);
      }

      // Set active tab to first ergometer with data
      const availableTypes = Object.keys(fetchedZones) as ErgometerType[];
      if (availableTypes.length > 0) {
        setActiveTab(availableTypes[0]);
      }
    } catch (err) {
      setError('Kunde inte hamta ergometerdata');
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[120px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const hasData = thresholds.length > 0 || recentTests.length > 0;

  if (!hasData) {
    return (
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
            <Zap className="h-5 w-5" />
            Ergometer Profil
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>
            Ingen ergometerdata tillganglig
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm mb-4" style={{ color: theme.colors.textMuted }}>
            Genomfor ett ergometertest for att se troskelvarden och traningszoner.
          </p>
          <Button variant="outline" asChild>
            <a href={`/coach/tests/ergometer/new?clientId=${clientId}`}>
              Skapa nytt test
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const availableErgometers = [...new Set([
    ...thresholds.map((t) => t.ergometerType),
    ...recentTests.map((t) => t.ergometerType),
  ])];

  const currentThreshold = thresholds.find((t) => t.ergometerType === activeTab);
  const currentZones = zones[activeTab] || [];
  const currentTests = recentTests.filter((t) => t.ergometerType === activeTab);

  return (
    <div className="space-y-4">
      {/* Overview Card */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
                <Zap className="h-5 w-5" />
                Ergometer Dashboard
              </CardTitle>
              <CardDescription style={{ color: theme.colors.textMuted }}>
                Troskelvarden och traningszoner
              </CardDescription>
            </div>
            <Badge variant="outline">{availableErgometers.length} maskiner</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            {thresholds.slice(0, 4).map((threshold) => {
              const config = ERGOMETER_CONFIG[threshold.ergometerType];
              const mainValue = threshold.criticalPower || threshold.ftp || threshold.mapWatts;
              return (
                <div
                  key={threshold.id}
                  className="p-3 rounded-lg"
                  style={{
                    backgroundColor:
                      theme.id === 'FITAPP_DARK' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {config.icon}
                    <span className="text-xs font-medium" style={{ color: theme.colors.textMuted }}>
                      {config.label}
                    </span>
                  </div>
                  <p className="text-xl font-bold" style={{ color: theme.colors.textPrimary }}>
                    {mainValue || '-'}
                    <span className="text-sm font-normal text-muted-foreground">W</span>
                  </p>
                  <p className="text-xs" style={{ color: theme.colors.textMuted }}>
                    {threshold.criticalPower ? 'CP' : threshold.ftp ? 'FTP' : 'MAP'}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Detailed View by Ergometer */}
      <Card style={{ backgroundColor: theme.colors.backgroundCard, borderColor: theme.colors.border }}>
        <CardHeader className="pb-2">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ErgometerType)}>
            <TabsList className="w-full justify-start overflow-x-auto">
              {availableErgometers.map((type) => {
                const config = ERGOMETER_CONFIG[type];
                return (
                  <TabsTrigger key={type} value={type} className="flex items-center gap-1">
                    {config.icon}
                    <span className="hidden sm:inline">{config.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Threshold Details */}
          {currentThreshold && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
                <Timer className="h-4 w-4" />
                Troskelvarden
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {currentThreshold.criticalPower && (
                  <MetricBox label="Critical Power" value={currentThreshold.criticalPower} unit="W" />
                )}
                {currentThreshold.wPrime && (
                  <MetricBox
                    label="W'"
                    value={(currentThreshold.wPrime / 1000).toFixed(1)}
                    unit="kJ"
                  />
                )}
                {currentThreshold.ftp && (
                  <MetricBox label="FTP" value={currentThreshold.ftp} unit="W" />
                )}
                {currentThreshold.mapWatts && (
                  <MetricBox label="MAP" value={currentThreshold.mapWatts} unit="W" />
                )}
                {currentThreshold.peakPower && (
                  <MetricBox label="Peak Power" value={currentThreshold.peakPower} unit="W" />
                )}
              </div>
              <div className="flex items-center gap-4 text-xs" style={{ color: theme.colors.textMuted }}>
                <span>
                  Kalla: {currentThreshold.sourceMethod.replace('_', ' ')}
                </span>
                <span>
                  Testad: {formatDistanceToNow(new Date(currentThreshold.testDate), { locale: sv, addSuffix: true })}
                </span>
                {currentThreshold.confidence && (
                  <Badge variant="outline" className="text-xs">
                    {currentThreshold.confidence}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Zones */}
          {currentZones.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
                <TrendingUp className="h-4 w-4" />
                Traningszoner
              </h4>
              <div className="space-y-2">
                {currentZones.map((zone) => (
                  <div
                    key={zone.zone}
                    className="flex items-center gap-3 p-2 rounded"
                    style={{
                      backgroundColor:
                        theme.id === 'FITAPP_DARK' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    }}
                  >
                    <div className={`w-8 h-8 rounded flex items-center justify-center text-white font-bold text-sm ${ZONE_COLORS[zone.zone]}`}>
                      Z{zone.zone}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm" style={{ color: theme.colors.textPrimary }}>
                          {zone.nameSwedish}
                        </span>
                        <span className="text-sm font-mono" style={{ color: theme.colors.textPrimary }}>
                          {zone.powerMin}-{zone.powerMax}W
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs" style={{ color: theme.colors.textMuted }}>
                        <span>{zone.percentMin}-{zone.percentMax}%</span>
                        {zone.paceMin && zone.paceMax && (
                          <span>{formatPace(zone.paceMax)}-{formatPace(zone.paceMin)}/500m</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Tests */}
          {currentTests.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2" style={{ color: theme.colors.textPrimary }}>
                <Calendar className="h-4 w-4" />
                Senaste tester
              </h4>
              <div className="space-y-2">
                {currentTests.slice(0, 5).map((test) => (
                  <div
                    key={test.id}
                    className="flex items-center justify-between p-2 rounded hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs" style={{ color: theme.colors.textMuted }}>
                        {format(new Date(test.testDate), 'd MMM', { locale: sv })}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {test.testProtocol.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      {test.avgPower && (
                        <span className="text-sm font-medium" style={{ color: theme.colors.textPrimary }}>
                          {test.avgPower}W avg
                        </span>
                      )}
                      {test.criticalPower && (
                        <span className="text-sm font-medium text-green-600">
                          CP {test.criticalPower}W
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4" style={{ color: theme.colors.textMuted }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricBox({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | string;
  unit: string;
}) {
  return (
    <div className="p-3 rounded-lg border bg-background">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">
        {value}
        <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
      </p>
    </div>
  );
}
