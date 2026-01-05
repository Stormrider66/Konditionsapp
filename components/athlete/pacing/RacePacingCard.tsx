'use client';

/**
 * Race Pacing Card (Athlete View)
 *
 * Generate and display race pacing plans:
 * - Distance selector
 * - Strategy options (even, negative, positive)
 * - Split targets with W' balance
 * - Printable pace card
 */

import { useState, useEffect } from 'react';
import { ErgometerType } from '@prisma/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Flag,
  Target,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Printer,
  Ship,
  Mountain,
  Bike,
  Dumbbell,
  Battery,
  Clock,
} from 'lucide-react';

interface SplitTarget {
  distance: number;
  splitNumber: number;
  targetPower: number;
  targetPace: number;
  targetPaceFormatted: string;
  targetHR?: number;
  zone: number;
  wPrimeRemaining: number;
  wPrimeRemainingKJ: number;
  cumulativeTime: number;
  cumulativeTimeFormatted: string;
  splitTime: number;
  effort: 'easy' | 'moderate' | 'hard' | 'maximal';
}

interface RacePacingResult {
  splits: SplitTarget[];
  summary: {
    predictedTime: number;
    predictedTimeFormatted: string;
    avgPower: number;
    avgPace: number;
    avgPaceFormatted: string;
    peakPower: number;
    minWPrime: number;
    finishWPrime: number;
  };
  strategy: {
    name: string;
    nameSwedish: string;
    description: string;
    rationale: string;
  };
  warnings: string[];
  confidence: string;
}

interface RacePacingCardProps {
  clientId: string;
  ergometerType?: ErgometerType;
  variant?: 'default' | 'compact' | 'glass';
}

const ERGOMETER_CONFIG: Record<ErgometerType, { label: string; icon: React.ReactNode }> = {
  CONCEPT2_ROW: { label: 'Roddmaskin', icon: <Ship className="h-4 w-4" /> },
  CONCEPT2_SKIERG: { label: 'SkiErg', icon: <Mountain className="h-4 w-4" /> },
  CONCEPT2_BIKEERG: { label: 'BikeErg', icon: <Bike className="h-4 w-4" /> },
  WATTBIKE: { label: 'Wattbike', icon: <Bike className="h-4 w-4" /> },
  ASSAULT_BIKE: { label: 'Air Bike', icon: <Dumbbell className="h-4 w-4" /> },
};

const DISTANCE_PRESETS = [
  { meters: 500, label: '500m' },
  { meters: 1000, label: '1K' },
  { meters: 2000, label: '2K' },
  { meters: 5000, label: '5K' },
  { meters: 6000, label: '6K' },
  { meters: 10000, label: '10K' },
];

const STRATEGY_OPTIONS = [
  { value: 'EVEN', label: 'Jamn fart', icon: <Minus className="h-4 w-4" /> },
  { value: 'NEGATIVE', label: 'Negativ split', icon: <TrendingUp className="h-4 w-4" /> },
  { value: 'POSITIVE', label: 'Positiv split', icon: <TrendingDown className="h-4 w-4" /> },
];

const ZONE_COLORS: Record<number, string> = {
  1: 'bg-green-100 text-green-800',
  2: 'bg-blue-100 text-blue-800',
  3: 'bg-yellow-100 text-yellow-800',
  4: 'bg-orange-100 text-orange-800',
  5: 'bg-red-100 text-red-800',
  6: 'bg-purple-100 text-purple-800',
};

function WPrimeBar({ percent }: { percent: number }) {
  const color = percent > 50 ? 'bg-green-500' : percent > 20 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
      <div
        className={`h-full ${color} transition-all`}
        style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
      />
    </div>
  );
}

export function RacePacingCard({
  clientId,
  ergometerType: initialErgometerType,
  variant = 'default',
}: RacePacingCardProps) {
  const [ergometerType, setErgometerType] = useState<ErgometerType>(
    initialErgometerType || 'CONCEPT2_ROW'
  );
  const [distance, setDistance] = useState<number>(2000);
  const [customDistance, setCustomDistance] = useState<string>('');
  const [strategy, setStrategy] = useState<string>('EVEN');
  const [goalTime, setGoalTime] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pacing, setPacing] = useState<RacePacingResult | null>(null);
  const [recommendation, setRecommendation] = useState<{
    recommended: string;
    rationale: string;
  } | null>(null);

  async function generatePacing() {
    try {
      setIsLoading(true);
      setError(null);

      // Parse goal time if provided (M:SS or M:SS.s format)
      let goalSeconds: number | undefined;
      if (goalTime) {
        const parts = goalTime.split(':');
        if (parts.length === 2) {
          goalSeconds = parseInt(parts[0]) * 60 + parseFloat(parts[1]);
        }
      }

      const res = await fetch('/api/ergometer/pacing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          ergometerType,
          targetDistance: customDistance ? parseInt(customDistance) : distance,
          strategy,
          goalTime: goalSeconds,
          includeRecommendation: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'NO_CP_DATA') {
          setError('Genomfor ett CP-test for att generera pacing');
        } else {
          setError(data.error || 'Kunde inte generera pacing');
        }
        return;
      }

      setPacing(data.pacing);
      setRecommendation(data.recommendation);
    } catch (err) {
      console.error('Failed to generate pacing:', err);
      setError('Kunde inte generera pacing');
    } finally {
      setIsLoading(false);
    }
  }

  const handlePrint = () => {
    window.print();
  };

  const cardClass = variant === 'glass'
    ? 'backdrop-blur-sm bg-white/80 dark:bg-gray-900/80 border-white/20'
    : '';

  return (
    <Card className={cardClass}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flag className="h-5 w-5" />
          Tavlingspacing
        </CardTitle>
        <CardDescription>
          Generera optimal pacing-strategi for ditt lopp
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Configuration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Ergometer selector */}
          <div className="space-y-2">
            <Label>Maskin</Label>
            <Select
              value={ergometerType}
              onValueChange={(v) => setErgometerType(v as ErgometerType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ERGOMETER_CONFIG).map(([type, config]) => (
                  <SelectItem key={type} value={type}>
                    <div className="flex items-center gap-2">
                      {config.icon}
                      {config.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Distance selector */}
          <div className="space-y-2">
            <Label>Distans</Label>
            <Select
              value={customDistance || distance.toString()}
              onValueChange={(v) => {
                if (v === 'custom') {
                  setCustomDistance('');
                } else {
                  setCustomDistance('');
                  setDistance(parseInt(v));
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DISTANCE_PRESETS.map((d) => (
                  <SelectItem key={d.meters} value={d.meters.toString()}>
                    {d.label}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Anpassad...</SelectItem>
              </SelectContent>
            </Select>
            {customDistance !== '' && (
              <Input
                type="number"
                placeholder="Distans i meter"
                value={customDistance}
                onChange={(e) => setCustomDistance(e.target.value)}
                className="mt-2"
              />
            )}
          </div>

          {/* Strategy selector */}
          <div className="space-y-2">
            <Label>Strategi</Label>
            <Select value={strategy} onValueChange={setStrategy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STRATEGY_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    <div className="flex items-center gap-2">
                      {s.icon}
                      {s.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Goal time (optional) */}
          <div className="space-y-2">
            <Label>Maltid (valfritt)</Label>
            <Input
              type="text"
              placeholder="6:30.0"
              value={goalTime}
              onChange={(e) => setGoalTime(e.target.value)}
            />
          </div>
        </div>

        {/* Generate button */}
        <Button onClick={generatePacing} disabled={isLoading} className="w-full sm:w-auto">
          {isLoading ? 'Genererar...' : 'Generera pacing'}
        </Button>

        {/* Error display */}
        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg">
            <p>{error}</p>
          </div>
        )}

        {/* Recommendation */}
        {recommendation && !pacing && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="font-medium text-blue-900">Rekommenderad strategi: {recommendation.recommended}</p>
            <p className="text-sm text-blue-700 mt-1">{recommendation.rationale}</p>
          </div>
        )}

        {/* Pacing results */}
        {pacing && (
          <div className="space-y-6 print:space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Prediktion</p>
                <p className="text-2xl font-bold font-mono">{pacing.summary.predictedTimeFormatted}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Snittempo</p>
                <p className="text-xl font-bold font-mono">{pacing.summary.avgPaceFormatted}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Snitteffekt</p>
                <p className="text-xl font-bold">{pacing.summary.avgPower}W</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">W&apos; vid mal</p>
                <p className="text-xl font-bold">{pacing.summary.finishWPrime}%</p>
              </div>
            </div>

            {/* Strategy info */}
            <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg">
              <Target className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">{pacing.strategy.nameSwedish}</p>
                <p className="text-sm text-muted-foreground">{pacing.strategy.rationale}</p>
              </div>
            </div>

            {/* Warnings */}
            {pacing.warnings.length > 0 && (
              <div className="space-y-2">
                {pacing.warnings.map((warning, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 bg-yellow-50 text-yellow-800 rounded-lg text-sm">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{warning}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Split table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Split</TableHead>
                    <TableHead>Tempo</TableHead>
                    <TableHead className="text-center">Effekt</TableHead>
                    <TableHead className="text-center">Zon</TableHead>
                    <TableHead className="hidden sm:table-cell">W&apos; kvar</TableHead>
                    <TableHead className="text-right">Tid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pacing.splits.map((split) => (
                    <TableRow key={split.splitNumber}>
                      <TableCell className="font-medium">
                        {split.splitNumber}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono font-bold">{split.targetPaceFormatted}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        {split.targetPower}W
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={ZONE_COLORS[split.zone]}>Z{split.zone}</Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                          <WPrimeBar percent={split.wPrimeRemaining} />
                          <span className="text-xs text-muted-foreground w-8">
                            {split.wPrimeRemaining}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {split.cumulativeTimeFormatted}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* W' balance visualization */}
            <div className="p-4 bg-muted/30 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <Battery className="h-4 w-4" />
                <span className="text-sm font-medium">W&apos; balans genom loppet</span>
              </div>
              <div className="flex items-end gap-1 h-16">
                {pacing.splits.map((split) => (
                  <div
                    key={split.splitNumber}
                    className="flex-1 rounded-t transition-all"
                    style={{
                      height: `${split.wPrimeRemaining}%`,
                      backgroundColor:
                        split.wPrimeRemaining > 50
                          ? '#22c55e'
                          : split.wPrimeRemaining > 20
                          ? '#eab308'
                          : '#ef4444',
                    }}
                    title={`Split ${split.splitNumber}: ${split.wPrimeRemaining}%`}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Start</span>
                <span>Mal ({pacing.summary.finishWPrime}% kvar)</span>
              </div>
            </div>

            {/* Print button */}
            <Button variant="outline" onClick={handlePrint} className="print:hidden">
              <Printer className="h-4 w-4 mr-2" />
              Skriv ut pacing-kort
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
