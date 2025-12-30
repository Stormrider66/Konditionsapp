'use client';

/**
 * HYROX Station Analysis Dashboard
 *
 * Displays structured HYROX station analysis from Gemini.
 * Supports all 8 HYROX stations with station-specific metrics.
 *
 * Features:
 * - Overall scores panel
 * - Station-specific metrics
 * - Fatigue indicators
 * - Strengths and weaknesses
 * - Drill recommendations
 * - Race strategy tips
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Target,
  TrendingUp,
  CheckCircle2,
  Zap,
  Dumbbell,
  Gauge,
  Activity,
  Wind,
  Timer,
  AlertTriangle,
  Trophy,
} from 'lucide-react';

// Station type constants
type HyroxStationType =
  | 'SKIERG'
  | 'SLED_PUSH'
  | 'SLED_PULL'
  | 'BURPEE_BROAD_JUMP'
  | 'ROWING'
  | 'FARMERS_CARRY'
  | 'SANDBAG_LUNGE'
  | 'WALL_BALLS';

// Type for the HYROX station analysis data
interface HyroxAnalysisData {
  stationType: HyroxStationType;
  overallScore: number | null;
  efficiencyScore: number | null;
  formScore: number | null;
  paceConsistency: number | null;
  coreStability: number | null;
  breathingPattern: 'GOOD' | 'INCONSISTENT' | 'POOR' | null;
  movementCadence: number | null;

  // Fatigue indicators
  fatigueIndicators?: {
    earlyPhase?: string[];
    latePhase?: string[];
  } | null;

  // Station-specific metrics
  // SkiErg
  pullLength?: 'SHORT' | 'OPTIMAL' | 'LONG' | null;
  hipHingeDepth?: 'SHALLOW' | 'OPTIMAL' | 'EXCESSIVE' | null;
  armExtension?: 'INCOMPLETE' | 'FULL' | 'OVEREXTENDED' | null;
  legDriveContribution?: 'MINIMAL' | 'MODERATE' | 'SIGNIFICANT' | null;

  // Sled Push
  bodyAngle?: number | null;
  armLockout?: 'BENT' | 'LOCKED' | 'OVEREXTENDED' | null;
  strideLength?: 'SHORT' | 'OPTIMAL' | 'OVERSTRIDING' | null;
  drivePhase?: 'WEAK' | 'GOOD' | 'POWERFUL' | null;

  // Sled Pull
  pullTechnique?: 'ARM_DOMINANT' | 'HIP_DRIVEN' | 'MIXED' | null;
  ropePath?: 'STRAIGHT' | 'DIAGONAL' | 'INCONSISTENT' | null;
  anchorStability?: 'STABLE' | 'SHIFTING' | 'UNSTABLE' | null;

  // Burpee Broad Jump
  burpeeDepth?: 'SHALLOW' | 'FULL' | 'EXCESSIVE' | null;
  jumpDistance?: 'SHORT' | 'GOOD' | 'EXCELLENT' | null;
  transitionSpeed?: 'SLOW' | 'MODERATE' | 'FAST' | null;
  landingMechanics?: 'POOR' | 'ACCEPTABLE' | 'GOOD' | null;

  // Rowing
  driveSequence?: 'CORRECT' | 'ARMS_EARLY' | 'BACK_EARLY' | null;
  laybackAngle?: number | null;
  catchPosition?: 'COMPRESSED' | 'OPTIMAL' | 'OVERREACHING' | null;
  strokeRate?: number | null;
  powerApplication?: 'FRONT_LOADED' | 'EVEN' | 'BACK_LOADED' | null;

  // Farmers Carry
  shoulderPack?: 'ELEVATED' | 'PACKED' | 'DEPRESSED' | null;
  trunkPosture?: 'UPRIGHT' | 'LEANING' | 'SWAYING' | null;
  stridePattern?: 'SHORT_CHOPPY' | 'SMOOTH' | 'OVERSTRIDING' | null;
  gripFatigue?: 'NONE' | 'MODERATE' | 'SIGNIFICANT' | null;

  // Sandbag Lunge
  bagPosition?: 'HIGH_CHEST' | 'SHOULDER' | 'DROPPING' | null;
  kneeTracking?: 'GOOD' | 'VALGUS' | 'VARUS' | null;
  stepLength?: 'SHORT' | 'OPTIMAL' | 'OVERSTRIDING' | null;
  torsoPosition?: 'UPRIGHT' | 'FORWARD_LEAN' | 'EXCESSIVE_LEAN' | null;

  // Wall Balls
  squatDepth?: 'SHALLOW' | 'PARALLEL' | 'DEEP' | null;
  throwMechanics?: 'ARM_DOMINANT' | 'HIP_DRIVEN' | 'COORDINATED' | null;
  wallBallCatchHeight?: 'HIGH' | 'OPTIMAL' | 'LOW' | null;
  rhythmConsistency?: number | null;

  // AI Insights
  primaryStrengths?: string[];
  primaryWeaknesses?: string[];
  improvementDrills?: Array<{ drill: string; focus: string; priority: number }>;
  raceStrategyTips?: string[];

  // Benchmark
  benchmarkLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE' | null;
}

interface HyroxStationDashboardProps {
  data: HyroxAnalysisData;
}

// Station info mapping
const STATION_INFO: Record<HyroxStationType, { label: string; distance: string }> = {
  SKIERG: { label: 'SkiErg', distance: '1000m' },
  SLED_PUSH: { label: 'Sled Push', distance: '50m' },
  SLED_PULL: { label: 'Sled Pull', distance: '50m' },
  BURPEE_BROAD_JUMP: { label: 'Burpee Broad Jump', distance: '80 reps' },
  ROWING: { label: 'Rodd', distance: '1000m' },
  FARMERS_CARRY: { label: 'Farmers Carry', distance: '200m' },
  SANDBAG_LUNGE: { label: 'Sandbag Lunge', distance: '100m' },
  WALL_BALLS: { label: 'Wall Balls', distance: '75-100 reps' },
};

export function HyroxStationDashboard({ data }: HyroxStationDashboardProps) {
  const stationInfo = STATION_INFO[data.stationType];

  const getScoreColor = (score: number | null | undefined) => {
    if (score === null || score === undefined) return 'text-muted-foreground';
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-blue-600 dark:text-blue-400';
    if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getBreathingLabel = (pattern: string | null | undefined) => {
    if (!pattern) return '-';
    switch (pattern) {
      case 'GOOD': return 'Bra';
      case 'INCONSISTENT': return 'Inkonsekvent';
      case 'POOR': return 'Svag';
      default: return pattern;
    }
  };

  const getLengthLabel = (length: string | null | undefined) => {
    if (!length) return '-';
    switch (length) {
      case 'SHORT': return 'Kort';
      case 'OPTIMAL': return 'Optimal';
      case 'LONG': return 'Lång';
      case 'OVERSTRIDING': return 'Översteg';
      default: return length;
    }
  };

  const getDepthLabel = (depth: string | null | undefined) => {
    if (!depth) return '-';
    switch (depth) {
      case 'SHALLOW': return 'Grund';
      case 'OPTIMAL': return 'Optimal';
      case 'EXCESSIVE': return 'Överdriven';
      case 'PARALLEL': return 'Parallell';
      case 'DEEP': return 'Djup';
      case 'FULL': return 'Full';
      default: return depth;
    }
  };

  const getExtensionLabel = (ext: string | null | undefined) => {
    if (!ext) return '-';
    switch (ext) {
      case 'INCOMPLETE': return 'Ofullständig';
      case 'FULL': return 'Full';
      case 'OVEREXTENDED': return 'Överutsträckt';
      default: return ext;
    }
  };

  const getContributionLabel = (level: string | null | undefined) => {
    if (!level) return '-';
    switch (level) {
      case 'MINIMAL': return 'Minimal';
      case 'MODERATE': return 'Måttlig';
      case 'SIGNIFICANT': return 'Betydande';
      default: return level;
    }
  };

  const getLockoutLabel = (lockout: string | null | undefined) => {
    if (!lockout) return '-';
    switch (lockout) {
      case 'BENT': return 'Böjda';
      case 'LOCKED': return 'Låsta';
      case 'OVEREXTENDED': return 'Överutsträckta';
      default: return lockout;
    }
  };

  const getDriveLabel = (drive: string | null | undefined) => {
    if (!drive) return '-';
    switch (drive) {
      case 'WEAK': return 'Svag';
      case 'GOOD': return 'Bra';
      case 'POWERFUL': return 'Kraftfull';
      default: return drive;
    }
  };

  const getTechniqueLabel = (tech: string | null | undefined) => {
    if (!tech) return '-';
    switch (tech) {
      case 'ARM_DOMINANT': return 'Armdominant';
      case 'HIP_DRIVEN': return 'Höftdriven';
      case 'MIXED': return 'Blandad';
      case 'COORDINATED': return 'Koordinerad';
      default: return tech;
    }
  };

  const getPathLabel = (path: string | null | undefined) => {
    if (!path) return '-';
    switch (path) {
      case 'STRAIGHT': return 'Rak';
      case 'DIAGONAL': return 'Diagonal';
      case 'INCONSISTENT': return 'Inkonsekvent';
      default: return path;
    }
  };

  const getStabilityLabel = (stability: string | null | undefined) => {
    if (!stability) return '-';
    switch (stability) {
      case 'STABLE': return 'Stabil';
      case 'SHIFTING': return 'Skiftande';
      case 'UNSTABLE': return 'Instabil';
      default: return stability;
    }
  };

  const getSpeedLabel = (speed: string | null | undefined) => {
    if (!speed) return '-';
    switch (speed) {
      case 'SLOW': return 'Långsam';
      case 'MODERATE': return 'Måttlig';
      case 'FAST': return 'Snabb';
      default: return speed;
    }
  };

  const getQualityLabel = (quality: string | null | undefined) => {
    if (!quality) return '-';
    switch (quality) {
      case 'POOR': return 'Svag';
      case 'ACCEPTABLE': return 'Acceptabel';
      case 'GOOD': return 'Bra';
      case 'SHORT': return 'Kort';
      case 'EXCELLENT': return 'Utmärkt';
      default: return quality;
    }
  };

  const getSequenceLabel = (seq: string | null | undefined) => {
    if (!seq) return '-';
    switch (seq) {
      case 'CORRECT': return 'Korrekt';
      case 'ARMS_EARLY': return 'Armar för tidigt';
      case 'BACK_EARLY': return 'Rygg för tidigt';
      default: return seq;
    }
  };

  const getCatchLabel = (pos: string | null | undefined) => {
    if (!pos) return '-';
    switch (pos) {
      case 'COMPRESSED': return 'Komprimerad';
      case 'OPTIMAL': return 'Optimal';
      case 'OVERREACHING': return 'Överskjutande';
      case 'HIGH': return 'Hög';
      case 'LOW': return 'Låg';
      default: return pos;
    }
  };

  const getPowerLabel = (power: string | null | undefined) => {
    if (!power) return '-';
    switch (power) {
      case 'FRONT_LOADED': return 'Frontlastad';
      case 'EVEN': return 'Jämn';
      case 'BACK_LOADED': return 'Baklastad';
      default: return power;
    }
  };

  const getShoulderLabel = (shoulder: string | null | undefined) => {
    if (!shoulder) return '-';
    switch (shoulder) {
      case 'ELEVATED': return 'Höjda';
      case 'PACKED': return 'Packade';
      case 'DEPRESSED': return 'Sänkta';
      default: return shoulder;
    }
  };

  const getPostureLabel = (posture: string | null | undefined) => {
    if (!posture) return '-';
    switch (posture) {
      case 'UPRIGHT': return 'Upprätt';
      case 'LEANING': return 'Lutande';
      case 'SWAYING': return 'Svajande';
      case 'FORWARD_LEAN': return 'Framåtlutning';
      case 'EXCESSIVE_LEAN': return 'Överdriven lutning';
      default: return posture;
    }
  };

  const getStrideLabel = (stride: string | null | undefined) => {
    if (!stride) return '-';
    switch (stride) {
      case 'SHORT_CHOPPY': return 'Korta hackiga';
      case 'SMOOTH': return 'Mjuka';
      case 'OVERSTRIDING': return 'Översteg';
      default: return stride;
    }
  };

  const getFatigueLabel = (fatigue: string | null | undefined) => {
    if (!fatigue) return '-';
    switch (fatigue) {
      case 'NONE': return 'Ingen';
      case 'MODERATE': return 'Måttlig';
      case 'SIGNIFICANT': return 'Betydande';
      default: return fatigue;
    }
  };

  const getBagLabel = (bag: string | null | undefined) => {
    if (!bag) return '-';
    switch (bag) {
      case 'HIGH_CHEST': return 'Högt bröst';
      case 'SHOULDER': return 'Axel';
      case 'DROPPING': return 'Sjunkande';
      default: return bag;
    }
  };

  const getKneeLabel = (knee: string | null | undefined) => {
    if (!knee) return '-';
    switch (knee) {
      case 'GOOD': return 'Bra';
      case 'VALGUS': return 'Valgus (inåt)';
      case 'VARUS': return 'Varus (utåt)';
      default: return knee;
    }
  };

  const getBenchmarkBadge = (level: string | null | undefined) => {
    if (!level) return null;
    const colors: Record<string, string> = {
      BEGINNER: 'bg-gray-100 text-gray-800',
      INTERMEDIATE: 'bg-blue-100 text-blue-800',
      ADVANCED: 'bg-purple-100 text-purple-800',
      ELITE: 'bg-yellow-100 text-yellow-800',
    };
    const labels: Record<string, string> = {
      BEGINNER: 'Nybörjare',
      INTERMEDIATE: 'Mellanliggande',
      ADVANCED: 'Avancerad',
      ELITE: 'Elit',
    };
    return (
      <Badge className={colors[level] || 'bg-gray-100 text-gray-800'}>
        {labels[level] || level}
      </Badge>
    );
  };

  // Station-specific metrics panels
  const renderStationMetrics = () => {
    switch (data.stationType) {
      case 'SKIERG':
        return (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">SkiErg Teknik</CardTitle>
              <CardDescription>Drag- och rörelseanalys</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Draglängd</span>
                  <span className="text-xl font-semibold">
                    {getLengthLabel(data.pullLength)}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Höftgångjärn</span>
                  <span className="text-xl font-semibold">
                    {getDepthLabel(data.hipHingeDepth)}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Armextension</span>
                  <span className="text-xl font-semibold">
                    {getExtensionLabel(data.armExtension)}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Bendrivning</span>
                  <span className="text-xl font-semibold">
                    {getContributionLabel(data.legDriveContribution)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'SLED_PUSH':
        return (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Sled Push Teknik</CardTitle>
              <CardDescription>Kroppsvinkel och drivkraft</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Kroppsvinkel</span>
                  <span className="text-xl font-semibold">
                    {data.bodyAngle != null ? `${data.bodyAngle}°` : '-'}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Armlåsning</span>
                  <span className="text-xl font-semibold">
                    {getLockoutLabel(data.armLockout)}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Steglängd</span>
                  <span className="text-xl font-semibold">
                    {getLengthLabel(data.strideLength)}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Drivfas</span>
                  <span className="text-xl font-semibold">
                    {getDriveLabel(data.drivePhase)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'SLED_PULL':
        return (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Sled Pull Teknik</CardTitle>
              <CardDescription>Dragteknik och stabilitet</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Dragteknik</span>
                  <span className="text-xl font-semibold">
                    {getTechniqueLabel(data.pullTechnique)}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Repbana</span>
                  <span className="text-xl font-semibold">
                    {getPathLabel(data.ropePath)}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Ankringsstabilitet</span>
                  <span className="text-xl font-semibold">
                    {getStabilityLabel(data.anchorStability)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'BURPEE_BROAD_JUMP':
        return (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Burpee Broad Jump Teknik</CardTitle>
              <CardDescription>Övergång och hoppanalys</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Burpee-djup</span>
                  <span className="text-xl font-semibold">
                    {getDepthLabel(data.burpeeDepth)}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Hoppdistans</span>
                  <span className="text-xl font-semibold">
                    {getQualityLabel(data.jumpDistance)}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Övergångshastighet</span>
                  <span className="text-xl font-semibold">
                    {getSpeedLabel(data.transitionSpeed)}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Landningsmekanik</span>
                  <span className="text-xl font-semibold">
                    {getQualityLabel(data.landingMechanics)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'ROWING':
        return (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Roddteknik</CardTitle>
              <CardDescription>Drivsekvens och krafttillämpning</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Drivsekvens</span>
                  <span className="text-xl font-semibold">
                    {getSequenceLabel(data.driveSequence)}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Layback-vinkel</span>
                  <span className="text-xl font-semibold">
                    {data.laybackAngle != null ? `${data.laybackAngle}°` : '-'}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Catch-position</span>
                  <span className="text-xl font-semibold">
                    {getCatchLabel(data.catchPosition)}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Årtakt</span>
                  <span className="text-xl font-semibold">
                    {data.strokeRate != null ? `${data.strokeRate} spm` : '-'}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Krafttillämpning</span>
                  <span className="text-xl font-semibold">
                    {getPowerLabel(data.powerApplication)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'FARMERS_CARRY':
        return (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Farmers Carry Teknik</CardTitle>
              <CardDescription>Hållning och gångmönster</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Axelpack</span>
                  <span className="text-xl font-semibold">
                    {getShoulderLabel(data.shoulderPack)}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Bålhållning</span>
                  <span className="text-xl font-semibold">
                    {getPostureLabel(data.trunkPosture)}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Stegmönster</span>
                  <span className="text-xl font-semibold">
                    {getStrideLabel(data.stridePattern)}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Grepputtröttning</span>
                  <span className="text-xl font-semibold">
                    {getFatigueLabel(data.gripFatigue)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'SANDBAG_LUNGE':
        return (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Sandbag Lunge Teknik</CardTitle>
              <CardDescription>Belastningsplacering och utfall</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Sandsäcksposition</span>
                  <span className="text-xl font-semibold">
                    {getBagLabel(data.bagPosition)}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Knäspårning</span>
                  <span className="text-xl font-semibold">
                    {getKneeLabel(data.kneeTracking)}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Steglängd</span>
                  <span className="text-xl font-semibold">
                    {getLengthLabel(data.stepLength)}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Bålposition</span>
                  <span className="text-xl font-semibold">
                    {getPostureLabel(data.torsoPosition)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'WALL_BALLS':
        return (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Wall Balls Teknik</CardTitle>
              <CardDescription>Knäböj och kastmekanik</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Knäböjsdjup</span>
                  <span className="text-xl font-semibold">
                    {getDepthLabel(data.squatDepth)}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Kastmekanik</span>
                  <span className="text-xl font-semibold">
                    {getTechniqueLabel(data.throwMechanics)}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Fångsthöjd</span>
                  <span className="text-xl font-semibold">
                    {getCatchLabel(data.wallBallCatchHeight)}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Rytmkonsistens</span>
                  <span className="text-xl font-semibold">
                    {data.rhythmConsistency != null ? `${data.rhythmConsistency}%` : '-'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Station Type */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
            <Zap className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              {stationInfo.label}
              <span className="text-sm font-normal text-muted-foreground">
                ({stationInfo.distance})
              </span>
            </h2>
            <p className="text-sm text-muted-foreground">AI-driven teknikanalys</p>
          </div>
        </div>
        {data.benchmarkLevel && getBenchmarkBadge(data.benchmarkLevel)}
      </div>

      {/* Overall Scores Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4" /> Övergripande
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className={`text-3xl font-bold ${getScoreColor(data.overallScore)}`}>
                {data.overallScore ?? '-'}
              </div>
              <div className="text-sm text-muted-foreground">/100</div>
            </div>
            {data.overallScore && (
              <Progress value={data.overallScore} className="h-2 mt-2" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Effektivitet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className={`text-3xl font-bold ${getScoreColor(data.efficiencyScore)}`}>
                {data.efficiencyScore ?? '-'}
              </div>
              <div className="text-sm text-muted-foreground">/100</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" /> Form
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className={`text-3xl font-bold ${getScoreColor(data.formScore)}`}>
                {data.formScore ?? '-'}
              </div>
              <div className="text-sm text-muted-foreground">/100</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Gauge className="h-4 w-4" /> Tempokonsistens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className={`text-3xl font-bold ${getScoreColor(data.paceConsistency)}`}>
                {data.paceConsistency ?? '-'}
              </div>
              <div className="text-sm text-muted-foreground">/100</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Core & Breathing Panel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Bål & Andning</CardTitle>
          <CardDescription>Stabilitet och andningsmönster</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Bålstabilitet</span>
              <span className={`text-xl font-semibold ${getScoreColor(data.coreStability)}`}>
                {data.coreStability != null ? `${data.coreStability}/100` : '-'}
              </span>
            </div>
            <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Andningsmönster</span>
              <span className="text-xl font-semibold">
                {getBreathingLabel(data.breathingPattern)}
              </span>
            </div>
            <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Rörelsekadens</span>
              <span className="text-xl font-semibold">
                {data.movementCadence != null ? `${data.movementCadence} rpm` : '-'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Station-specific metrics */}
      {renderStationMetrics()}

      {/* Fatigue Indicators */}
      {data.fatigueIndicators &&
        (data.fatigueIndicators.earlyPhase?.length || data.fatigueIndicators.latePhase?.length) && (
        <Card className="border-yellow-200 dark:border-yellow-900/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
              <AlertTriangle className="h-5 w-5" /> Uttröttningsindikatorer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.fatigueIndicators.earlyPhase && data.fatigueIndicators.earlyPhase.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Timer className="h-4 w-4" /> Tidig fas
                  </h4>
                  <ul className="space-y-1">
                    {data.fatigueIndicators.earlyPhase.map((indicator, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-yellow-600 mt-0.5">•</span>
                        {indicator}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {data.fatigueIndicators.latePhase && data.fatigueIndicators.latePhase.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Sen fas
                  </h4>
                  <ul className="space-y-1">
                    {data.fatigueIndicators.latePhase.map((indicator, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-orange-600 mt-0.5">•</span>
                        {indicator}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths */}
        <Card className="border-green-200 dark:border-green-900/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" /> Styrkor
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.primaryStrengths && data.primaryStrengths.length > 0 ? (
              <ul className="space-y-2">
                {data.primaryStrengths.map((strength, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">+</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">Inga styrkor identifierade</p>
            )}
          </CardContent>
        </Card>

        {/* Weaknesses */}
        <Card className="border-yellow-200 dark:border-yellow-900/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
              <TrendingUp className="h-5 w-5" /> Förbättringsområden
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.primaryWeaknesses && data.primaryWeaknesses.length > 0 ? (
              <ul className="space-y-2">
                {data.primaryWeaknesses.map((weakness, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-yellow-600 mt-0.5">!</span>
                    <span>{weakness}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">Inga förbättringsområden identifierade</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Drill Recommendations */}
      {data.improvementDrills && data.improvementDrills.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="h-6 w-6 text-primary" />
              Rekommenderade övningar
            </CardTitle>
            <CardDescription>Prioriterade teknikövningar baserat på analysen</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.improvementDrills
                .sort((a, b) => a.priority - b.priority)
                .map((drill, i) => (
                  <div
                    key={i}
                    className="p-4 bg-background rounded-lg border shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-lg">{drill.drill}</span>
                      <Badge variant="secondary">Prioritet {drill.priority}</Badge>
                    </div>
                    <p className="text-muted-foreground">{drill.focus}</p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Race Strategy Tips */}
      {data.raceStrategyTips && data.raceStrategyTips.length > 0 && (
        <Card className="bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-900/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
              <Trophy className="h-6 w-6" />
              Tävlingsstrategitips
            </CardTitle>
            <CardDescription>Råd för att optimera din prestation på tävlingsdagen</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {data.raceStrategyTips.map((tip, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-orange-200 dark:bg-orange-800 rounded-full flex items-center justify-center text-sm font-medium text-orange-700 dark:text-orange-300">
                    {i + 1}
                  </span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
