'use client';

/**
 * Ergometer Dashboard (Athlete View)
 *
 * Athlete-facing dashboard showing:
 * - Current training zones per ergometer
 * - Recent test results
 * - Progression summary
 * - Next recommended test
 */

import { useState, useEffect } from 'react';
import { ErgometerType } from '@prisma/client';
import { usePageContextOptional } from '@/components/ai-studio/PageContextProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Ship,
  Bike,
  Mountain,
  Dumbbell,
  Zap,
  Target,
  TrendingUp,
  Calendar,
  Clock,
  Info,
  Waves,
} from 'lucide-react';
import { Concept2WorkoutList } from './integrations';
import { TeamRankCard } from './TeamRankCard';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { PerformancePredictionCard } from './predictions';
import { RacePacingCard } from './pacing';
import { format, formatDistanceToNow, differenceInWeeks } from 'date-fns';
import { sv } from 'date-fns/locale';

interface ErgometerThreshold {
  id: string;
  ergometerType: ErgometerType;
  criticalPower?: number | null;
  wPrime?: number | null;
  ftp?: number | null;
  testDate: string;
  expiresAt?: string | null;
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
  description: string;
  typicalDuration?: string | null;
}

interface ErgometerDashboardProps {
  clientId: string;
}

const ERGOMETER_CONFIG: Record<
  ErgometerType,
  { label: string; icon: React.ReactNode; shortLabel: string }
> = {
  CONCEPT2_ROW: { label: 'Roddmaskin', icon: <Ship className="h-4 w-4" />, shortLabel: 'Rodd' },
  CONCEPT2_SKIERG: { label: 'SkiErg', icon: <Mountain className="h-4 w-4" />, shortLabel: 'Ski' },
  CONCEPT2_BIKEERG: { label: 'BikeErg', icon: <Bike className="h-4 w-4" />, shortLabel: 'Bike' },
  WATTBIKE: { label: 'Wattbike', icon: <Bike className="h-4 w-4" />, shortLabel: 'Watt' },
  ASSAULT_BIKE: { label: 'Air Bike', icon: <Dumbbell className="h-4 w-4" />, shortLabel: 'Air' },
};

const ZONE_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  2: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  3: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  4: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
  5: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
  6: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
};

function formatPace(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = (seconds % 60).toFixed(1);
  return `${min}:${sec.padStart(4, '0')}`;
}

function isConcept2(ergometerType: ErgometerType): boolean {
  return ['CONCEPT2_ROW', 'CONCEPT2_SKIERG', 'CONCEPT2_BIKEERG'].includes(ergometerType);
}

export function ErgometerDashboard({ clientId }: ErgometerDashboardProps) {
  const pageCtx = usePageContextOptional();
  const [thresholds, setThresholds] = useState<ErgometerThreshold[]>([]);
  const [zones, setZones] = useState<Record<ErgometerType, ErgometerZone[]>>(
    {} as Record<ErgometerType, ErgometerZone[]>
  );
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ErgometerType | null>(null);

  // Set rich page context for AI chat
  useEffect(() => {
    if (thresholds.length === 0) return;
    const activeThreshold = thresholds.find(t => t.ergometerType === activeTab);
    const availableErgometers = Object.keys(zones) as ErgometerType[];
    const activeZones = activeTab ? zones[activeTab] || [] : [];
    pageCtx?.setPageContext({
      type: 'ergometer',
      title: 'Ergometer-zoner',
      conceptKeys: ['criticalPower', 'ftp', 'wprime'],
      data: {
        availableErgometers,
        activeErgometer: activeTab,
        thresholds: thresholds.map(t => ({
          ergometerType: t.ergometerType,
          criticalPower: t.criticalPower,
          ftp: t.ftp,
          wPrime: t.wPrime,
          testDate: t.testDate,
        })),
        activeZones: activeZones.map(z => ({
          zone: z.zone,
          name: z.nameSwedish,
          powerMin: z.powerMin,
          powerMax: z.powerMax,
          percentMin: z.percentMin,
          percentMax: z.percentMax,
        })),
      },
      summary: `Ergometer: ${availableErgometers.length} maskiner med zoner.${activeThreshold ? ` Aktiv: ${activeTab} med ${activeThreshold.criticalPower ? `CP ${activeThreshold.criticalPower}W` : `FTP ${activeThreshold.ftp}W`}${activeThreshold.wPrime ? `, W' ${(activeThreshold.wPrime / 1000).toFixed(1)}kJ` : ''}.` : ''} ${activeZones.length} traningszoner.`,
    });
  }, [thresholds, zones, activeTab, pageCtx]);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);

        // Fetch thresholds
        const thresholdRes = await fetch(`/api/ergometer-thresholds/${clientId}`);
        if (thresholdRes.ok) {
          const thresholdData = await thresholdRes.json();
          setThresholds(thresholdData.data?.thresholds || []);
        }

        // Fetch zones
        const zonesRes = await fetch(`/api/ergometer-zones/${clientId}`);
        if (zonesRes.ok) {
          const zonesData = await zonesRes.json();
          const zonesResult = zonesData.data?.zones || {};
          setZones(zonesResult);

          // Set active tab to first ergometer with zones
          const availableTypes = Object.keys(zonesResult) as ErgometerType[];
          if (availableTypes.length > 0) {
            setActiveTab(availableTypes[0]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch ergometer data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [clientId]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[100px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  const availableErgometers = Object.keys(zones) as ErgometerType[];

  if (availableErgometers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Mina Ergometer-zoner
            <InfoTooltip conceptKey="criticalPower" />
          </CardTitle>
          <CardDescription>Inga traningszoner beraknade annu</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <Target className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">
              Genomfor ett ergometertest for att fa personliga traningszoner.
            </p>
            <p className="text-sm text-muted-foreground">
              Kontakta din tranare for att boka ett test.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentThreshold = thresholds.find((t) => t.ergometerType === activeTab);
  const currentZones = activeTab ? zones[activeTab] || [] : [];
  const showPace = activeTab ? isConcept2(activeTab) : false;

  // Check if retest is recommended (>8 weeks old)
  const needsRetest = currentThreshold
    ? differenceInWeeks(new Date(), new Date(currentThreshold.testDate)) > 8
    : false;

  return (
    <div className="space-y-4">
      {/* Quick Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {thresholds.slice(0, 4).map((threshold) => {
          const config = ERGOMETER_CONFIG[threshold.ergometerType] || ERGOMETER_CONFIG.CONCEPT2_ROW;
          const mainValue = threshold.criticalPower || threshold.ftp;
          const isActive = threshold.ergometerType === activeTab;

          return (
            <button
              key={threshold.id}
              onClick={() => setActiveTab(threshold.ergometerType)}
              className={`p-3 rounded-lg border text-left transition-all ${
                isActive
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {config.icon}
                <span className="text-xs font-medium text-muted-foreground">
                  {config.shortLabel}
                </span>
              </div>
              <p className="text-xl font-bold">
                {mainValue || '-'}
                <span className="text-sm font-normal text-muted-foreground">W</span>
              </p>
            </button>
          );
        })}
      </div>

      {/* Retest Alert */}
      {needsRetest && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            Ditt senaste test ar {formatDistanceToNow(new Date(currentThreshold!.testDate), { locale: sv })} gammalt.
            Overvag att genomfora ett nytt test for att uppdatera dina zoner.
          </AlertDescription>
        </Alert>
      )}

      {/* Zone Details */}
      {activeTab && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  {(ERGOMETER_CONFIG[activeTab] || ERGOMETER_CONFIG.CONCEPT2_ROW).icon}
                  {(ERGOMETER_CONFIG[activeTab] || ERGOMETER_CONFIG.CONCEPT2_ROW).label} Zoner
                  <InfoTooltip conceptKey="criticalPower" />
                </CardTitle>
                {currentThreshold && (
                  <CardDescription>
                    Baserat pa {currentThreshold.criticalPower ? 'CP' : 'FTP'}:{' '}
                    <strong>{currentThreshold.criticalPower || currentThreshold.ftp}W</strong>
                    {' • '}
                    Testad {format(new Date(currentThreshold.testDate), 'd MMM yyyy', { locale: sv })}
                  </CardDescription>
                )}
              </div>
              {currentThreshold?.wPrime && (
                <Badge variant="outline" className="flex items-center gap-1.5">
                  W&apos; {(currentThreshold.wPrime / 1000).toFixed(1)}kJ
                  <InfoTooltip conceptKey="wprime" />
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currentZones.map((zone) => {
                const colors = ZONE_COLORS[zone.zone];
                return (
                  <div
                    key={zone.zone}
                    className={`rounded-lg border p-4 ${colors.bg} ${colors.border}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${colors.text} bg-white/50`}
                        >
                          Z{zone.zone}
                        </div>
                        <div>
                          <h4 className={`font-semibold ${colors.text}`}>{zone.nameSwedish}</h4>
                          <p className="text-sm text-muted-foreground">{zone.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold font-mono">
                          {zone.powerMin}-{zone.powerMax}W
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {zone.percentMin}-{zone.percentMax}%
                        </p>
                      </div>
                    </div>

                    {/* Pace (Concept2 only) */}
                    {showPace && zone.paceMin && zone.paceMax && (
                      <div className="mt-3 pt-3 border-t border-white/30 flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Tempo /500m:</span>
                        <span className="font-mono font-medium">
                          {formatPace(zone.paceMax)} - {formatPace(zone.paceMin)}
                        </span>
                      </div>
                    )}

                    {/* Typical Duration */}
                    {zone.typicalDuration && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {zone.typicalDuration}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Zone Legend */}
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    <strong>Z1-Z2:</strong> Aterhämtning och basuthallighet. Använd for langre pass.
                  </p>
                  <p>
                    <strong>Z3:</strong> Tempotröskeln. Lattare intervaller och langre arbetspass.
                  </p>
                  <p>
                    <strong>Z4:</strong> Troskeltraning. 4-20 minuters intervaller.
                  </p>
                  <p>
                    <strong>Z5-Z6:</strong> Hög intensitet. Korta, harda intervaller (30s-5min).
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs for multiple ergometers */}
      {availableErgometers.length > 1 && (
        <div className="flex justify-center gap-2">
          {availableErgometers.map((type) => {
            const config = ERGOMETER_CONFIG[type] || ERGOMETER_CONFIG.CONCEPT2_ROW;
            const isActive = type === activeTab;
            return (
              <Button
                key={type}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab(type)}
                className="flex items-center gap-1"
              >
                {config.icon}
                {config.shortLabel}
              </Button>
            );
          })}
        </div>
      )}

      {/* Performance Predictions */}
      <div className="mt-6">
        <PerformancePredictionCard clientId={clientId} ergometerType={activeTab || undefined} />
      </div>

      {/* Race Day Pacing */}
      <div className="mt-6">
        <RacePacingCard clientId={clientId} ergometerType={activeTab || undefined} />
      </div>

      {/* Team Ranking */}
      <div className="mt-6">
        <TeamRankCard clientId={clientId} />
      </div>

      {/* Concept2 Synced Workouts */}
      <div className="mt-6">
        <Concept2WorkoutList clientId={clientId} maxItems={10} />
      </div>
    </div>
  );
}
