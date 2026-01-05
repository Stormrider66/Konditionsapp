'use client';

/**
 * Team Rank Card (Athlete View)
 *
 * Shows athlete's position in team ergometer leaderboards:
 * - "Du ar #3 av 12"
 * - Percentile: "Topp 25%"
 * - Gap to leader
 * - Nearby competitors
 */

import { useState, useEffect } from 'react';
import { ErgometerType, ErgometerTestProtocol } from '@prisma/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Trophy,
  Medal,
  Target,
  TrendingUp,
  Users,
  Ship,
  Mountain,
  Bike,
  Dumbbell,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

interface TeamRanking {
  teamId: string;
  teamName: string;
  ergometerType: ErgometerType;
  testProtocol: ErgometerTestProtocol;
  rank: number;
  totalAthletes: number;
  percentile: number;
  value: number;
  valueFormatted: string;
  tier: string;
  gapToLeader: string | null;
  nearby: {
    above: Array<{ rank: number; name: string; value: string }>;
    below: Array<{ rank: number; name: string; value: string }>;
  };
}

interface TeamRankCardProps {
  clientId: string;
  variant?: 'default' | 'compact' | 'glass';
}

const ERGOMETER_CONFIG: Record<ErgometerType, { label: string; icon: React.ReactNode; shortLabel: string }> = {
  CONCEPT2_ROW: { label: 'Roddmaskin', icon: <Ship className="h-4 w-4" />, shortLabel: 'Rodd' },
  CONCEPT2_SKIERG: { label: 'SkiErg', icon: <Mountain className="h-4 w-4" />, shortLabel: 'Ski' },
  CONCEPT2_BIKEERG: { label: 'BikeErg', icon: <Bike className="h-4 w-4" />, shortLabel: 'Bike' },
  WATTBIKE: { label: 'Wattbike', icon: <Bike className="h-4 w-4" />, shortLabel: 'Watt' },
  ASSAULT_BIKE: { label: 'Air Bike', icon: <Dumbbell className="h-4 w-4" />, shortLabel: 'Air' },
};

const PROTOCOL_LABELS: Record<ErgometerTestProtocol, string> = {
  PEAK_POWER_6S: '6s Peak',
  PEAK_POWER_7_STROKE: '7-Stroke',
  PEAK_POWER_30S: '30s Sprint',
  TT_1K: '1K TT',
  TT_2K: '2K TT',
  TT_10MIN: '10min',
  TT_20MIN: '20min',
  MAP_RAMP: 'MAP',
  CP_3MIN_ALL_OUT: '3min CP',
  CP_MULTI_TRIAL: 'CP Multi',
  INTERVAL_4X4: '4x4min',
};

const TIER_COLORS: Record<string, string> = {
  ELITE: 'bg-yellow-100 text-yellow-800',
  ADVANCED: 'bg-blue-100 text-blue-800',
  INTERMEDIATE: 'bg-green-100 text-green-800',
  BEGINNER: 'bg-gray-100 text-gray-800',
  UNKNOWN: 'bg-gray-50 text-gray-600',
};

function getPercentileText(percentile: number): string {
  if (percentile >= 90) return 'Topp 10%';
  if (percentile >= 75) return 'Topp 25%';
  if (percentile >= 50) return 'Topp 50%';
  return `${percentile}:e percentilen`;
}

function RankDisplay({ rank, total }: { rank: number; total: number }) {
  const isTop3 = rank <= 3;

  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex items-center justify-center w-14 h-14 rounded-full ${
          rank === 1
            ? 'bg-yellow-100 text-yellow-700'
            : rank === 2
            ? 'bg-gray-100 text-gray-600'
            : rank === 3
            ? 'bg-amber-100 text-amber-700'
            : 'bg-muted text-muted-foreground'
        }`}
      >
        {isTop3 ? (
          rank === 1 ? (
            <Trophy className="h-6 w-6" />
          ) : (
            <Medal className="h-6 w-6" />
          )
        ) : (
          <span className="text-xl font-bold">#{rank}</span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold">
          {isTop3 && <span className="text-lg mr-1">#{rank}</span>}
          av {total}
        </p>
        <p className="text-sm text-muted-foreground">i laget</p>
      </div>
    </div>
  );
}

export function TeamRankCard({ clientId, variant = 'default' }: TeamRankCardProps) {
  const [rankings, setRankings] = useState<TeamRanking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRanking, setSelectedRanking] = useState<TeamRanking | null>(null);

  useEffect(() => {
    fetchRankings();
  }, [clientId]);

  async function fetchRankings() {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/athlete/team-rank?clientId=${clientId}`);
      if (res.ok) {
        const data = await res.json();
        const rankingsData = data.data.rankings || [];
        setRankings(rankingsData);

        // Select best ranking by default
        if (rankingsData.length > 0) {
          setSelectedRanking(rankingsData[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch team rankings:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const cardClass = variant === 'glass'
    ? 'backdrop-blur-sm bg-white/80 dark:bg-gray-900/80 border-white/20'
    : '';

  if (isLoading) {
    return (
      <Card className={cardClass}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (rankings.length === 0) {
    return (
      <Card className={cardClass}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Lagranking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Target className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Genomfor ett ergometertest for att se din ranking
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'compact' && selectedRanking) {
    return (
      <Card className={cardClass}>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  selectedRanking.rank === 1
                    ? 'bg-yellow-100'
                    : selectedRanking.rank === 2
                    ? 'bg-gray-100'
                    : selectedRanking.rank === 3
                    ? 'bg-amber-100'
                    : 'bg-muted'
                }`}
              >
                {selectedRanking.rank <= 3 ? (
                  selectedRanking.rank === 1 ? (
                    <Trophy className="h-5 w-5 text-yellow-600" />
                  ) : (
                    <Medal className="h-5 w-5 text-gray-500" />
                  )
                ) : (
                  <span className="font-bold text-muted-foreground">#{selectedRanking.rank}</span>
                )}
              </div>
              <div>
                <p className="font-medium">
                  {selectedRanking.rank} av {selectedRanking.totalAthletes}
                </p>
                <p className="text-xs text-muted-foreground">
                  {ERGOMETER_CONFIG[selectedRanking.ergometerType].shortLabel} •{' '}
                  {PROTOCOL_LABELS[selectedRanking.testProtocol]}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              {getPercentileText(selectedRanking.percentile)}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cardClass}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Din lagranking
          </CardTitle>
          {rankings.length > 1 && (
            <div className="flex gap-1">
              {rankings.slice(0, 3).map((ranking, idx) => (
                <button
                  key={`${ranking.teamId}-${ranking.ergometerType}-${ranking.testProtocol}`}
                  onClick={() => setSelectedRanking(ranking)}
                  className={`p-2 rounded-lg transition-colors ${
                    selectedRanking === ranking
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                  title={`${ERGOMETER_CONFIG[ranking.ergometerType].label} - ${PROTOCOL_LABELS[ranking.testProtocol]}`}
                >
                  {ERGOMETER_CONFIG[ranking.ergometerType].icon}
                </button>
              ))}
            </div>
          )}
        </div>
        {selectedRanking && (
          <CardDescription>
            {selectedRanking.teamName} • {ERGOMETER_CONFIG[selectedRanking.ergometerType].label} •{' '}
            {PROTOCOL_LABELS[selectedRanking.testProtocol]}
          </CardDescription>
        )}
      </CardHeader>

      {selectedRanking && (
        <CardContent className="space-y-4">
          {/* Main rank display */}
          <div className="flex items-center justify-between">
            <RankDisplay rank={selectedRanking.rank} total={selectedRanking.totalAthletes} />
            <div className="text-right">
              <p className="text-2xl font-mono font-bold">{selectedRanking.valueFormatted}</p>
              <Badge className={TIER_COLORS[selectedRanking.tier] || TIER_COLORS.UNKNOWN}>
                {selectedRanking.tier}
              </Badge>
            </div>
          </div>

          {/* Percentile and gap */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
            <div className="text-center">
              <p className="text-lg font-semibold">{getPercentileText(selectedRanking.percentile)}</p>
              <p className="text-xs text-muted-foreground">Percentil</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">
                {selectedRanking.gapToLeader || '-'}
              </p>
              <p className="text-xs text-muted-foreground">Till ledaren</p>
            </div>
          </div>

          {/* Nearby competitors */}
          {(selectedRanking.nearby.above.length > 0 || selectedRanking.nearby.below.length > 0) && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Nara dig
              </p>

              {/* Above */}
              {selectedRanking.nearby.above.map((athlete) => (
                <div
                  key={athlete.rank}
                  className="flex items-center justify-between p-2 rounded-lg bg-green-50 dark:bg-green-900/20"
                >
                  <div className="flex items-center gap-2">
                    <ChevronUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">#{athlete.rank}</span>
                    <span className="text-sm text-muted-foreground">{athlete.name}</span>
                  </div>
                  <span className="text-sm font-mono">{athlete.value}</span>
                </div>
              ))}

              {/* Current (you) */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold">#{selectedRanking.rank}</span>
                  <span className="text-sm font-medium">Du</span>
                </div>
                <span className="text-sm font-mono font-bold">{selectedRanking.valueFormatted}</span>
              </div>

              {/* Below */}
              {selectedRanking.nearby.below.map((athlete) => (
                <div
                  key={athlete.rank}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">#{athlete.rank}</span>
                    <span className="text-sm text-muted-foreground">{athlete.name}</span>
                  </div>
                  <span className="text-sm font-mono">{athlete.value}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
