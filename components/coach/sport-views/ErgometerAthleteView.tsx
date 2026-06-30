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
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { ErgometerType } from '@prisma/client';
import {
  RolePanel as Card,
  RolePanelContent as CardContent,
  RolePanelDescription as CardDescription,
  RolePanelHeader as CardHeader,
  RolePanelTitle as CardTitle,
} from '@/components/layouts/role-shell/RolePage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { enUS, sv } from 'date-fns/locale';
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
  { label: string; labelSv: string; icon: React.ReactNode; color: string }
> = {
  CONCEPT2_ROW: { label: 'RowErg', labelSv: 'Roddmaskin', icon: <Ship className="h-4 w-4" />, color: 'blue' },
  CONCEPT2_SKIERG: { label: 'SkiErg', labelSv: 'SkiErg', icon: <Mountain className="h-4 w-4" />, color: 'purple' },
  CONCEPT2_BIKEERG: { label: 'BikeErg', labelSv: 'BikeErg', icon: <Bike className="h-4 w-4" />, color: 'green' },
  WATTBIKE: { label: 'Wattbike', labelSv: 'Wattbike', icon: <Bike className="h-4 w-4" />, color: 'orange' },
  ASSAULT_BIKE: { label: 'Air Bike', labelSv: 'Air Bike', icon: <Dumbbell className="h-4 w-4" />, color: 'red' },
};

const ZONE_COLORS: Record<number, string> = {
  1: 'bg-emerald-500',
  2: 'bg-blue-500',
  3: 'bg-amber-500',
  4: 'bg-orange-500',
  5: 'bg-red-500',
  6: 'bg-purple-500',
};

function formatPace(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = (seconds % 60).toFixed(1);
  return `${min}:${sec.padStart(4, '0')}`;
}

export function ErgometerAthleteView({ clientId, clientName: _clientName }: ErgometerAthleteViewProps) {
  const locale = useLocale();
  const isSv = locale === 'sv';
  const dateFnsLocale = isSv ? sv : enUS;
  const t = (svText: string, enText: string) => isSv ? svText : enText;
  const themeContext = useWorkoutThemeOptional();
  const theme = themeContext?.appTheme || MINIMALIST_WHITE_THEME;
  const pathname = usePathname();
  const slugMatch = pathname.match(/^\/([^/]+)\/coach/);
  const basePath = slugMatch ? `/${slugMatch[1]}` : '';

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
    } catch (_err) {
      setError(isSv ? 'Kunde inte hämta ergometerdata' : 'Could not load ergometer data');
    } finally {
      setIsLoading(false);
    }
  }, [clientId, isSv]);

  useEffect(() => {
    void fetchData();
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
            {t('Ergometerprofil', 'Ergometer Profile')}
          </CardTitle>
          <CardDescription style={{ color: theme.colors.textMuted }}>
            {t('Ingen ergometerdata tillgänglig', 'No ergometer data available')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm mb-4" style={{ color: theme.colors.textMuted }}>
            {t(
              'Genomför ett ergometertest för att se tröskelvärden och träningszoner.',
              'Complete an ergometer test to see threshold values and training zones.'
            )}
          </p>
          <Button variant="outline" asChild>
            <a href={`${basePath}/coach/tests/ergometer/new?clientId=${clientId}`}>
              {t('Skapa nytt test', 'Create new test')}
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
                {t('Ergometeröversikt', 'Ergometer Dashboard')}
              </CardTitle>
              <CardDescription style={{ color: theme.colors.textMuted }}>
                {t('Tröskelvärden och träningszoner', 'Threshold values and training zones')}
              </CardDescription>
            </div>
            <Badge variant="outline">
              {availableErgometers.length} {t('maskiner', 'machines')}
            </Badge>
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
                      {isSv ? config.labelSv : config.label}
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
                    <span className="hidden sm:inline">{isSv ? config.labelSv : config.label}</span>
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
                {t('Tröskelvärden', 'Threshold Values')}
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
                  {t('Källa', 'Source')}: {currentThreshold.sourceMethod.replace('_', ' ')}
                </span>
                <span>
                  {t('Testad', 'Tested')}: {formatDistanceToNow(new Date(currentThreshold.testDate), { locale: dateFnsLocale, addSuffix: true })}
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
                {t('Träningszoner', 'Training Zones')}
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
                          {isSv ? zone.nameSwedish : zone.name}
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
                {t('Senaste tester', 'Recent Tests')}
              </h4>
              <div className="space-y-2">
                {currentTests.slice(0, 5).map((test) => (
                  <div
                    key={test.id}
                    className="flex items-center justify-between p-2 rounded hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs" style={{ color: theme.colors.textMuted }}>
                        {format(new Date(test.testDate), 'd MMM', { locale: dateFnsLocale })}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {test.testProtocol.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      {test.avgPower && (
                        <span className="text-sm font-medium" style={{ color: theme.colors.textPrimary }}>
                          {test.avgPower}W {t('snitt', 'avg')}
                        </span>
                      )}
                      {test.criticalPower && (
                        <span className="text-sm font-medium text-emerald-600">
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
