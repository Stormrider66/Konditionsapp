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
  RolePanel as Card,
  RolePanelContent as CardContent,
  RolePanelDescription as CardDescription,
  RolePanelHeader as CardHeader,
  RolePanelTitle as CardTitle,
} from '@/components/layouts/role-shell/RolePage';
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
  Timer,
  AlertTriangle,
  Trophy,
} from 'lucide-react';
import { useLocale } from 'next-intl';

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

type AppLocale = 'en' | 'sv';

function t(locale: AppLocale, en: string, sv: string): string {
  return locale === 'sv' ? sv : en;
}

// Station info mapping
const STATION_INFO: Record<AppLocale, Record<HyroxStationType, { label: string; distance: string }>> = {
  en: {
    SKIERG: { label: 'SkiErg', distance: '1000m' },
    SLED_PUSH: { label: 'Sled Push', distance: '50m' },
    SLED_PULL: { label: 'Sled Pull', distance: '50m' },
    BURPEE_BROAD_JUMP: { label: 'Burpee Broad Jump', distance: '80 reps' },
    ROWING: { label: 'Rowing', distance: '1000m' },
    FARMERS_CARRY: { label: 'Farmers Carry', distance: '200m' },
    SANDBAG_LUNGE: { label: 'Sandbag Lunge', distance: '100m' },
    WALL_BALLS: { label: 'Wall Balls', distance: '75-100 reps' },
  },
  sv: {
  SKIERG: { label: 'SkiErg', distance: '1000m' },
  SLED_PUSH: { label: 'Sled Push', distance: '50m' },
  SLED_PULL: { label: 'Sled Pull', distance: '50m' },
  BURPEE_BROAD_JUMP: { label: 'Burpee Broad Jump', distance: '80 reps' },
  ROWING: { label: 'Rodd', distance: '1000m' },
  FARMERS_CARRY: { label: 'Farmers Carry', distance: '200m' },
  SANDBAG_LUNGE: { label: 'Sandbag Lunge', distance: '100m' },
  WALL_BALLS: { label: 'Wall Balls', distance: '75-100 reps' },
  },
};

export function HyroxStationDashboard({ data }: HyroxStationDashboardProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en';
  const stationInfo = STATION_INFO[locale][data.stationType];

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
      case 'GOOD': return t(locale, 'Good', 'Bra');
      case 'INCONSISTENT': return t(locale, 'Inconsistent', 'Inkonsekvent');
      case 'POOR': return t(locale, 'Weak', 'Svag');
      default: return pattern;
    }
  };

  const getLengthLabel = (length: string | null | undefined) => {
    if (!length) return '-';
    switch (length) {
      case 'SHORT': return t(locale, 'Short', 'Kort');
      case 'OPTIMAL': return 'Optimal';
      case 'LONG': return t(locale, 'Long', 'Lång');
      case 'OVERSTRIDING': return t(locale, 'Overstriding', 'Översteg');
      default: return length;
    }
  };

  const getDepthLabel = (depth: string | null | undefined) => {
    if (!depth) return '-';
    switch (depth) {
      case 'SHALLOW': return t(locale, 'Shallow', 'Grund');
      case 'OPTIMAL': return 'Optimal';
      case 'EXCESSIVE': return t(locale, 'Excessive', 'Överdriven');
      case 'PARALLEL': return t(locale, 'Parallel', 'Parallell');
      case 'DEEP': return t(locale, 'Deep', 'Djup');
      case 'FULL': return 'Full';
      default: return depth;
    }
  };

  const getExtensionLabel = (ext: string | null | undefined) => {
    if (!ext) return '-';
    switch (ext) {
      case 'INCOMPLETE': return t(locale, 'Incomplete', 'Ofullständig');
      case 'FULL': return 'Full';
      case 'OVEREXTENDED': return t(locale, 'Overextended', 'Överutsträckt');
      default: return ext;
    }
  };

  const getContributionLabel = (level: string | null | undefined) => {
    if (!level) return '-';
    switch (level) {
      case 'MINIMAL': return 'Minimal';
      case 'MODERATE': return t(locale, 'Moderate', 'Måttlig');
      case 'SIGNIFICANT': return t(locale, 'Significant', 'Betydande');
      default: return level;
    }
  };

  const getLockoutLabel = (lockout: string | null | undefined) => {
    if (!lockout) return '-';
    switch (lockout) {
      case 'BENT': return t(locale, 'Bent', 'Böjda');
      case 'LOCKED': return t(locale, 'Locked', 'Låsta');
      case 'OVEREXTENDED': return t(locale, 'Overextended', 'Överutsträckta');
      default: return lockout;
    }
  };

  const getDriveLabel = (drive: string | null | undefined) => {
    if (!drive) return '-';
    switch (drive) {
      case 'WEAK': return t(locale, 'Weak', 'Svag');
      case 'GOOD': return t(locale, 'Good', 'Bra');
      case 'POWERFUL': return t(locale, 'Powerful', 'Kraftfull');
      default: return drive;
    }
  };

  const getTechniqueLabel = (tech: string | null | undefined) => {
    if (!tech) return '-';
    switch (tech) {
      case 'ARM_DOMINANT': return t(locale, 'Arm dominant', 'Armdominant');
      case 'HIP_DRIVEN': return t(locale, 'Hip driven', 'Höftdriven');
      case 'MIXED': return t(locale, 'Mixed', 'Blandad');
      case 'COORDINATED': return t(locale, 'Coordinated', 'Koordinerad');
      default: return tech;
    }
  };

  const getPathLabel = (path: string | null | undefined) => {
    if (!path) return '-';
    switch (path) {
      case 'STRAIGHT': return t(locale, 'Straight', 'Rak');
      case 'DIAGONAL': return 'Diagonal';
      case 'INCONSISTENT': return t(locale, 'Inconsistent', 'Inkonsekvent');
      default: return path;
    }
  };

  const getStabilityLabel = (stability: string | null | undefined) => {
    if (!stability) return '-';
    switch (stability) {
      case 'STABLE': return t(locale, 'Stable', 'Stabil');
      case 'SHIFTING': return t(locale, 'Shifting', 'Skiftande');
      case 'UNSTABLE': return t(locale, 'Unstable', 'Instabil');
      default: return stability;
    }
  };

  const getSpeedLabel = (speed: string | null | undefined) => {
    if (!speed) return '-';
    switch (speed) {
      case 'SLOW': return t(locale, 'Slow', 'Långsam');
      case 'MODERATE': return t(locale, 'Moderate', 'Måttlig');
      case 'FAST': return t(locale, 'Fast', 'Snabb');
      default: return speed;
    }
  };

  const getQualityLabel = (quality: string | null | undefined) => {
    if (!quality) return '-';
    switch (quality) {
      case 'POOR': return t(locale, 'Weak', 'Svag');
      case 'ACCEPTABLE': return t(locale, 'Acceptable', 'Acceptabel');
      case 'GOOD': return t(locale, 'Good', 'Bra');
      case 'SHORT': return t(locale, 'Short', 'Kort');
      case 'EXCELLENT': return t(locale, 'Excellent', 'Utmärkt');
      default: return quality;
    }
  };

  const getSequenceLabel = (seq: string | null | undefined) => {
    if (!seq) return '-';
    switch (seq) {
      case 'CORRECT': return t(locale, 'Correct', 'Korrekt');
      case 'ARMS_EARLY': return t(locale, 'Arms early', 'Armar för tidigt');
      case 'BACK_EARLY': return t(locale, 'Back early', 'Rygg för tidigt');
      default: return seq;
    }
  };

  const getCatchLabel = (pos: string | null | undefined) => {
    if (!pos) return '-';
    switch (pos) {
      case 'COMPRESSED': return t(locale, 'Compressed', 'Komprimerad');
      case 'OPTIMAL': return 'Optimal';
      case 'OVERREACHING': return t(locale, 'Overreaching', 'Överskjutande');
      case 'HIGH': return t(locale, 'High', 'Hög');
      case 'LOW': return t(locale, 'Low', 'Låg');
      default: return pos;
    }
  };

  const getPowerLabel = (power: string | null | undefined) => {
    if (!power) return '-';
    switch (power) {
      case 'FRONT_LOADED': return t(locale, 'Front-loaded', 'Frontlastad');
      case 'EVEN': return t(locale, 'Even', 'Jämn');
      case 'BACK_LOADED': return t(locale, 'Back-loaded', 'Baklastad');
      default: return power;
    }
  };

  const getShoulderLabel = (shoulder: string | null | undefined) => {
    if (!shoulder) return '-';
    switch (shoulder) {
      case 'ELEVATED': return t(locale, 'Elevated', 'Höjda');
      case 'PACKED': return t(locale, 'Packed', 'Packade');
      case 'DEPRESSED': return t(locale, 'Depressed', 'Sänkta');
      default: return shoulder;
    }
  };

  const getPostureLabel = (posture: string | null | undefined) => {
    if (!posture) return '-';
    switch (posture) {
      case 'UPRIGHT': return t(locale, 'Upright', 'Upprätt');
      case 'LEANING': return t(locale, 'Leaning', 'Lutande');
      case 'SWAYING': return t(locale, 'Swaying', 'Svajande');
      case 'FORWARD_LEAN': return t(locale, 'Forward lean', 'Framåtlutning');
      case 'EXCESSIVE_LEAN': return t(locale, 'Excessive lean', 'Överdriven lutning');
      default: return posture;
    }
  };

  const getStrideLabel = (stride: string | null | undefined) => {
    if (!stride) return '-';
    switch (stride) {
      case 'SHORT_CHOPPY': return t(locale, 'Short/choppy', 'Korta hackiga');
      case 'SMOOTH': return t(locale, 'Smooth', 'Mjuka');
      case 'OVERSTRIDING': return t(locale, 'Overstriding', 'Översteg');
      default: return stride;
    }
  };

  const getFatigueLabel = (fatigue: string | null | undefined) => {
    if (!fatigue) return '-';
    switch (fatigue) {
      case 'NONE': return t(locale, 'None', 'Ingen');
      case 'MODERATE': return t(locale, 'Moderate', 'Måttlig');
      case 'SIGNIFICANT': return t(locale, 'Significant', 'Betydande');
      default: return fatigue;
    }
  };

  const getBagLabel = (bag: string | null | undefined) => {
    if (!bag) return '-';
    switch (bag) {
      case 'HIGH_CHEST': return t(locale, 'High chest', 'Högt bröst');
      case 'SHOULDER': return t(locale, 'Shoulder', 'Axel');
      case 'DROPPING': return t(locale, 'Dropping', 'Sjunkande');
      default: return bag;
    }
  };

  const getKneeLabel = (knee: string | null | undefined) => {
    if (!knee) return '-';
    switch (knee) {
      case 'GOOD': return t(locale, 'Good', 'Bra');
      case 'VALGUS': return t(locale, 'Valgus (inward)', 'Valgus (inåt)');
      case 'VARUS': return t(locale, 'Varus (outward)', 'Varus (utåt)');
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
      BEGINNER: t(locale, 'Beginner', 'Nybörjare'),
      INTERMEDIATE: t(locale, 'Intermediate', 'Mellanliggande'),
      ADVANCED: t(locale, 'Advanced', 'Avancerad'),
      ELITE: t(locale, 'Elite', 'Elit'),
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
              <CardTitle className="text-lg">{t(locale, 'SkiErg Technique', 'SkiErg Teknik')}</CardTitle>
              <CardDescription>{t(locale, 'Pull and movement analysis', 'Drag- och rörelseanalys')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">{t(locale, 'Pull length', 'Draglängd')}</span>
                  <span className="text-xl font-semibold">
                    {getLengthLabel(data.pullLength)}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">{t(locale, 'Hip hinge', 'Höftgångjärn')}</span>
                  <span className="text-xl font-semibold">
                    {getDepthLabel(data.hipHingeDepth)}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">{t(locale, 'Arm extension', 'Armextension')}</span>
                  <span className="text-xl font-semibold">
                    {getExtensionLabel(data.armExtension)}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">{t(locale, 'Leg drive', 'Bendrivning')}</span>
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
              <CardTitle className="text-lg">{t(locale, 'Sled Push Technique', 'Sled Push Teknik')}</CardTitle>
              <CardDescription>{t(locale, 'Body angle and drive force', 'Kroppsvinkel och drivkraft')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">{t(locale, 'Body angle', 'Kroppsvinkel')}</span>
                  <span className="text-xl font-semibold">
                    {data.bodyAngle != null ? `${data.bodyAngle}°` : '-'}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">{t(locale, 'Arm lockout', 'Armlåsning')}</span>
                  <span className="text-xl font-semibold">
                    {getLockoutLabel(data.armLockout)}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">{t(locale, 'Stride length', 'Steglängd')}</span>
                  <span className="text-xl font-semibold">
                    {getLengthLabel(data.strideLength)}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">{t(locale, 'Drive phase', 'Drivfas')}</span>
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
              <CardTitle className="text-lg">{t(locale, 'Sled Pull Technique', 'Sled Pull Teknik')}</CardTitle>
              <CardDescription>{t(locale, 'Pull technique and stability', 'Dragteknik och stabilitet')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">{t(locale, 'Pull technique', 'Dragteknik')}</span>
                  <span className="text-xl font-semibold">
                    {getTechniqueLabel(data.pullTechnique)}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">{t(locale, 'Rope path', 'Repbana')}</span>
                  <span className="text-xl font-semibold">
                    {getPathLabel(data.ropePath)}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">{t(locale, 'Anchor stability', 'Ankringsstabilitet')}</span>
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
              <CardTitle className="text-lg">{t(locale, 'Burpee Broad Jump Technique', 'Burpee Broad Jump Teknik')}</CardTitle>
              <CardDescription>{t(locale, 'Transition and jump analysis', 'Övergång och hoppanalys')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">{t(locale, 'Burpee depth', 'Burpee-djup')}</span>
                  <span className="text-xl font-semibold">
                    {getDepthLabel(data.burpeeDepth)}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">{t(locale, 'Jump distance', 'Hoppdistans')}</span>
                  <span className="text-xl font-semibold">
                    {getQualityLabel(data.jumpDistance)}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">{t(locale, 'Transition speed', 'Övergångshastighet')}</span>
                  <span className="text-xl font-semibold">
                    {getSpeedLabel(data.transitionSpeed)}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">{t(locale, 'Landing mechanics', 'Landningsmekanik')}</span>
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
              <CardTitle className="text-lg">{t(locale, 'Rowing technique', 'Roddteknik')}</CardTitle>
              <CardDescription>{t(locale, 'Drive sequence and power application', 'Drivsekvens och krafttillämpning')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">{t(locale, 'Drive sequence', 'Drivsekvens')}</span>
                  <span className="text-xl font-semibold">
                    {getSequenceLabel(data.driveSequence)}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">{t(locale, 'Layback angle', 'Layback-vinkel')}</span>
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
                  <span className="text-sm text-muted-foreground">{t(locale, 'Stroke rate', 'Årtakt')}</span>
                  <span className="text-xl font-semibold">
                    {data.strokeRate != null ? `${data.strokeRate} spm` : '-'}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">{t(locale, 'Power application', 'Krafttillämpning')}</span>
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
              <CardTitle className="text-lg">{t(locale, 'Farmers Carry Technique', 'Farmers Carry Teknik')}</CardTitle>
              <CardDescription>{t(locale, 'Posture and gait pattern', 'Hållning och gångmönster')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">{t(locale, 'Shoulder pack', 'Axelpack')}</span>
                  <span className="text-xl font-semibold">
                    {getShoulderLabel(data.shoulderPack)}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">{t(locale, 'Trunk posture', 'Bålhållning')}</span>
                  <span className="text-xl font-semibold">
                    {getPostureLabel(data.trunkPosture)}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">{t(locale, 'Stride pattern', 'Stegmönster')}</span>
                  <span className="text-xl font-semibold">
                    {getStrideLabel(data.stridePattern)}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">{t(locale, 'Grip fatigue', 'Grepputtröttning')}</span>
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
              <CardTitle className="text-lg">{t(locale, 'Sandbag Lunge Technique', 'Sandbag Lunge Teknik')}</CardTitle>
              <CardDescription>{t(locale, 'Load placement and lunging', 'Belastningsplacering och utfall')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">{t(locale, 'Sandbag position', 'Sandsäcksposition')}</span>
                  <span className="text-xl font-semibold">
                    {getBagLabel(data.bagPosition)}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">{t(locale, 'Knee tracking', 'Knäspårning')}</span>
                  <span className="text-xl font-semibold">
                    {getKneeLabel(data.kneeTracking)}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">{t(locale, 'Step length', 'Steglängd')}</span>
                  <span className="text-xl font-semibold">
                    {getLengthLabel(data.stepLength)}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">{t(locale, 'Trunk position', 'Bålposition')}</span>
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
              <CardTitle className="text-lg">{t(locale, 'Wall Balls Technique', 'Wall Balls Teknik')}</CardTitle>
              <CardDescription>{t(locale, 'Squat and throw mechanics', 'Knäböj och kastmekanik')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">{t(locale, 'Squat depth', 'Knäböjsdjup')}</span>
                  <span className="text-xl font-semibold">
                    {getDepthLabel(data.squatDepth)}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">{t(locale, 'Throw mechanics', 'Kastmekanik')}</span>
                  <span className="text-xl font-semibold">
                    {getTechniqueLabel(data.throwMechanics)}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">{t(locale, 'Catch height', 'Fångsthöjd')}</span>
                  <span className="text-xl font-semibold">
                    {getCatchLabel(data.wallBallCatchHeight)}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">{t(locale, 'Rhythm consistency', 'Rytmkonsistens')}</span>
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
            <p className="text-sm text-muted-foreground">{t(locale, 'AI-powered technique analysis', 'AI-driven teknikanalys')}</p>
          </div>
        </div>
        {data.benchmarkLevel && getBenchmarkBadge(data.benchmarkLevel)}
      </div>

      {/* Overall Scores Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4" /> {t(locale, 'Overall', 'Övergripande')}
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
              <TrendingUp className="h-4 w-4" /> {t(locale, 'Efficiency', 'Effektivitet')}
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
              <Gauge className="h-4 w-4" /> {t(locale, 'Pace consistency', 'Tempokonsistens')}
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
          <CardTitle className="text-lg">{t(locale, 'Core & Breathing', 'Bål & Andning')}</CardTitle>
          <CardDescription>{t(locale, 'Stability and breathing pattern', 'Stabilitet och andningsmönster')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">{t(locale, 'Core stability', 'Bålstabilitet')}</span>
              <span className={`text-xl font-semibold ${getScoreColor(data.coreStability)}`}>
                {data.coreStability != null ? `${data.coreStability}/100` : '-'}
              </span>
            </div>
            <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">{t(locale, 'Breathing pattern', 'Andningsmönster')}</span>
              <span className="text-xl font-semibold">
                {getBreathingLabel(data.breathingPattern)}
              </span>
            </div>
            <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">{t(locale, 'Movement cadence', 'Rörelsekadens')}</span>
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
              <AlertTriangle className="h-5 w-5" /> {t(locale, 'Fatigue indicators', 'Uttröttningsindikatorer')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.fatigueIndicators.earlyPhase && data.fatigueIndicators.earlyPhase.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Timer className="h-4 w-4" /> {t(locale, 'Early phase', 'Tidig fas')}
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
                    <AlertTriangle className="h-4 w-4" /> {t(locale, 'Late phase', 'Sen fas')}
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
              <CheckCircle2 className="h-5 w-5" /> {t(locale, 'Strengths', 'Styrkor')}
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
              <p className="text-muted-foreground">{t(locale, 'No strengths identified', 'Inga styrkor identifierade')}</p>
            )}
          </CardContent>
        </Card>

        {/* Weaknesses */}
        <Card className="border-yellow-200 dark:border-yellow-900/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
              <TrendingUp className="h-5 w-5" /> {t(locale, 'Improvement areas', 'Förbättringsområden')}
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
              <p className="text-muted-foreground">{t(locale, 'No improvement areas identified', 'Inga förbättringsområden identifierade')}</p>
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
              {t(locale, 'Recommended drills', 'Rekommenderade övningar')}
            </CardTitle>
            <CardDescription>{t(locale, 'Prioritized technique drills based on the analysis', 'Prioriterade teknikövningar baserat på analysen')}</CardDescription>
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
                      <Badge variant="secondary">{t(locale, 'Priority', 'Prioritet')} {drill.priority}</Badge>
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
              {t(locale, 'Race strategy tips', 'Tävlingsstrategitips')}
            </CardTitle>
            <CardDescription>{t(locale, 'Advice to optimize your performance on race day', 'Råd för att optimera din prestation på tävlingsdagen')}</CardDescription>
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
