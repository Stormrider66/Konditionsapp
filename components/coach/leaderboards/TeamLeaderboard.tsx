'use client';

/**
 * Team Ergometer Leaderboard Component
 *
 * Displays team rankings for ergometer tests with:
 * - Ergometer/protocol selector
 * - Sortable by power, pace, time, W/kg
 * - Tier badges (ELITE/ADVANCED/etc)
 * - Trend indicators
 * - Gap to leader display
 */

import { useState, useEffect, useCallback } from 'react';
import { ErgometerType, ErgometerTestProtocol } from '@prisma/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Trophy,
  Medal,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Users,
  Ship,
  Mountain,
  Bike,
  Dumbbell,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { sv } from 'date-fns/locale';

interface LeaderboardEntry {
  rank: number;
  athleteId: string;
  athleteName: string;
  value: number;
  valueFormatted: string;
  secondaryValue?: number;
  secondaryFormatted?: string;
  testId: string;
  testDate: string;
  tier: string;
  percentile: number;
  previousRank?: number;
  trend: 'up' | 'down' | 'same' | 'new';
  improvement?: number;
}

interface LeaderboardResult {
  ergometerType: ErgometerType;
  testProtocol: ErgometerTestProtocol;
  sortMetric: string;
  entries: LeaderboardEntry[];
  teamStats: {
    totalAthletes: number;
    testedAthletes: number;
    averageValue: number;
    averageFormatted: string;
    bestValue: number;
    bestFormatted: string;
  };
  lastUpdated: string;
}

interface TeamLeaderboardProps {
  teamId: string;
  variant?: 'default' | 'compact';
}

const ERGOMETER_CONFIG: Record<ErgometerType, { label: string; icon: React.ReactNode }> = {
  CONCEPT2_ROW: { label: 'Roddmaskin', icon: <Ship className="h-4 w-4" /> },
  CONCEPT2_SKIERG: { label: 'SkiErg', icon: <Mountain className="h-4 w-4" /> },
  CONCEPT2_BIKEERG: { label: 'BikeErg', icon: <Bike className="h-4 w-4" /> },
  WATTBIKE: { label: 'Wattbike', icon: <Bike className="h-4 w-4" /> },
  ASSAULT_BIKE: { label: 'Air Bike', icon: <Dumbbell className="h-4 w-4" /> },
};

const PROTOCOL_LABELS: Record<ErgometerTestProtocol, string> = {
  PEAK_POWER_6S: '6s Peak Power',
  PEAK_POWER_7_STROKE: '7-Stroke Max',
  PEAK_POWER_30S: '30s Sprint',
  TT_1K: '1K Time Trial',
  TT_2K: '2K Time Trial',
  TT_10MIN: '10min Max',
  TT_20MIN: '20min FTP',
  MAP_RAMP: 'MAP Ramp',
  CP_3MIN_ALL_OUT: '3min CP Test',
  CP_MULTI_TRIAL: 'Multi-Trial CP',
  INTERVAL_4X4: '4x4min Intervall',
};

const TIER_COLORS: Record<string, { bg: string; text: string }> = {
  ELITE: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  ADVANCED: { bg: 'bg-blue-100', text: 'text-blue-800' },
  INTERMEDIATE: { bg: 'bg-green-100', text: 'text-green-800' },
  BEGINNER: { bg: 'bg-gray-100', text: 'text-gray-800' },
  UNKNOWN: { bg: 'bg-gray-50', text: 'text-gray-600' },
};

const SORT_OPTIONS = [
  { value: 'power', label: 'Watt' },
  { value: 'watts_per_kg', label: 'W/kg' },
  { value: 'pace', label: 'Tempo' },
  { value: 'time', label: 'Tid' },
];

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100">
        <Trophy className="h-4 w-4 text-yellow-600" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100">
        <Medal className="h-4 w-4 text-gray-500" />
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100">
        <Medal className="h-4 w-4 text-amber-600" />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
      <span className="text-sm font-medium text-muted-foreground">{rank}</span>
    </div>
  );
}

function TrendIndicator({ trend, improvement }: { trend: string; improvement?: number }) {
  if (trend === 'new') {
    return (
      <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
        <Sparkles className="h-3 w-3 mr-1" />
        Ny
      </Badge>
    );
  }
  if (trend === 'up') {
    return (
      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
        <TrendingUp className="h-3 w-3 mr-1" />
        {improvement ? `+${improvement.toFixed(1)}%` : 'Upp'}
      </Badge>
    );
  }
  if (trend === 'down') {
    return (
      <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
        <TrendingDown className="h-3 w-3 mr-1" />
        {improvement ? `${improvement.toFixed(1)}%` : 'Ner'}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs">
      <Minus className="h-3 w-3 mr-1" />
      Samma
    </Badge>
  );
}

export function TeamLeaderboard({ teamId, variant = 'default' }: TeamLeaderboardProps) {
  const [leaderboards, setLeaderboards] = useState<LeaderboardResult[]>([]);
  const [selectedLeaderboard, setSelectedLeaderboard] = useState<LeaderboardResult | null>(null);
  const [sortMetric, setSortMetric] = useState<'power' | 'pace' | 'time' | 'watts_per_kg'>('power');
  const [isLoading, setIsLoading] = useState(true);
  const [teamStats, setTeamStats] = useState<{ totalMembers: number; testedMembers: number } | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/teams/${teamId}/leaderboard?sortMetric=${sortMetric}`);
      if (res.ok) {
        const data = await res.json();
        setLeaderboards(data.data.leaderboards || []);
        setTeamStats(data.data.teamStats);

        // Select first leaderboard by default
        if (data.data.leaderboards?.length > 0) {
          setSelectedLeaderboard((current) => {
            if (!current) {
              return data.data.leaderboards[0];
            }
            // Update selected leaderboard with new data
            const updated = data.data.leaderboards?.find(
              (lb: LeaderboardResult) =>
                lb.ergometerType === current.ergometerType &&
                lb.testProtocol === current.testProtocol
            );
            return updated || current;
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  }, [teamId, sortMetric]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (leaderboards.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Ergometer-topplista
          </CardTitle>
          <CardDescription>Inga ergometertester registrerade for laget</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Nar lagmedlemmar genomfor ergometertester visas rankingen har.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Ergometer-topplista
            </CardTitle>
            <CardDescription>
              {teamStats?.testedMembers} av {teamStats?.totalMembers} spelare har testat
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {/* Ergometer/Protocol selector */}
            <Select
              value={selectedLeaderboard ? `${selectedLeaderboard.ergometerType}|${selectedLeaderboard.testProtocol}` : ''}
              onValueChange={(value) => {
                const lb = leaderboards.find(
                  (l) => `${l.ergometerType}|${l.testProtocol}` === value
                );
                if (lb) setSelectedLeaderboard(lb);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Valj test..." />
              </SelectTrigger>
              <SelectContent>
                {leaderboards.map((lb) => {
                  const config = ERGOMETER_CONFIG[lb.ergometerType];
                  return (
                    <SelectItem
                      key={`${lb.ergometerType}|${lb.testProtocol}`}
                      value={`${lb.ergometerType}|${lb.testProtocol}`}
                    >
                      <div className="flex items-center gap-2">
                        {config.icon}
                        <span>{config.label}</span>
                        <span className="text-muted-foreground text-xs">
                          {PROTOCOL_LABELS[lb.testProtocol]}
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* Sort selector */}
            <Select value={sortMetric} onValueChange={(v) => setSortMetric(v as typeof sortMetric)}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {selectedLeaderboard && (
          <>
            {/* Team stats summary */}
            <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <p className="text-2xl font-bold">{selectedLeaderboard.teamStats.bestFormatted}</p>
                <p className="text-xs text-muted-foreground">Bast i laget</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{selectedLeaderboard.teamStats.averageFormatted}</p>
                <p className="text-xs text-muted-foreground">Lagsnitt</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{selectedLeaderboard.entries.length}</p>
                <p className="text-xs text-muted-foreground">Testade</p>
              </div>
            </div>

            {/* Leaderboard table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Rank</TableHead>
                  <TableHead>Spelare</TableHead>
                  <TableHead className="text-right">Resultat</TableHead>
                  {variant === 'default' && <TableHead className="text-center">Niva</TableHead>}
                  <TableHead className="text-center">Trend</TableHead>
                  {variant === 'default' && <TableHead className="text-right">Testad</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedLeaderboard.entries.map((entry) => {
                  const tierColor = TIER_COLORS[entry.tier] || TIER_COLORS.UNKNOWN;
                  return (
                    <TableRow key={entry.athleteId}>
                      <TableCell>
                        <RankBadge rank={entry.rank} />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{entry.athleteName}</p>
                          {entry.secondaryFormatted && (
                            <p className="text-xs text-muted-foreground">{entry.secondaryFormatted}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-mono font-bold text-lg">{entry.valueFormatted}</span>
                      </TableCell>
                      {variant === 'default' && (
                        <TableCell className="text-center">
                          <Badge className={`${tierColor.bg} ${tierColor.text} border-0`}>
                            {entry.tier}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell className="text-center">
                        <TrendIndicator trend={entry.trend} improvement={entry.improvement} />
                      </TableCell>
                      {variant === 'default' && (
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(entry.testDate), {
                            addSuffix: true,
                            locale: sv,
                          })}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  );
}
