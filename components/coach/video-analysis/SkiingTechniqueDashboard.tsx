'use client';

/**
 * Skiing Technique Analysis Dashboard
 *
 * Displays structured skiing technique analysis from Gemini.
 * Supports three technique types: Classic, Skating, Double Pole
 *
 * Features:
 * - Overall scores panel
 * - Technique-specific metrics
 * - Pole mechanics analysis
 * - Insights and drill recommendations
 * - Comparison to elite skiers
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
  Snowflake,
  Zap,
  Timer,
  ArrowUpDown,
  Dumbbell,
  Gauge,
  MoveHorizontal,
} from 'lucide-react';
import { useLocale } from '@/i18n/client';

// Type for the skiing technique analysis data
interface SkiingAnalysisData {
  techniqueType: 'CLASSIC' | 'SKATING' | 'DOUBLE_POLE';
  skatingVariant?: 'V1' | 'V2' | 'V2_ALT' | null;
  overallScore: number | null;
  balanceScore?: number | null;
  timingScore?: number | null;
  efficiencyScore: number | null;
  powerScore?: number | null;
  rhythmScore?: number | null;

  // Pole mechanics
  poleAngleAtPlant?: number | null;
  poleAngleAtRelease?: number | null;
  polePlantTiming?: string | null;
  poleForceApplication?: string | null;
  armSwingSymmetry?: number | null;

  // Hip and core
  hipPositionScore?: number | null;
  hipHeightConsistency?: number | null;
  coreEngagement?: string | null;
  forwardLean?: number | null;

  // Weight transfer
  weightTransferScore?: number | null;
  weightShiftTiming?: string | null;
  lateralStability?: number | null;

  // Classic-specific
  kickTimingScore?: number | null;
  kickExtension?: string | null;
  glidePhaseDuration?: number | null;
  legRecoveryPattern?: string | null;
  waxPocketEngagement?: string | null;

  // Skating-specific
  edgeAngleLeft?: number | null;
  edgeAngleRight?: number | null;
  edgeAngleSymmetry?: number | null;
  pushOffAngle?: number | null;
  vPatternWidth?: number | null;
  skateFrequency?: number | null;
  recoveryLegPath?: string | null;

  // Double pole-specific
  trunkFlexionRange?: number | null;
  compressionDepth?: string | null;
  returnPhaseSpeed?: string | null;
  legDriveContribution?: string | null;
  rhythmConsistency?: number | null;

  // Insights
  primaryStrengths?: string[];
  primaryWeaknesses?: string[];
  techniqueDrills?: Array<{ drill: string; focus: string; priority: number }>;
  comparisonToElite?: string | null;
}

interface SkiingTechniqueDashboardProps {
  data: SkiingAnalysisData;
}

type AppLocale = 'en' | 'sv';

function copy(locale: AppLocale, en: string, sv: string) {
  return locale === 'sv' ? sv : en;
}

export function SkiingTechniqueDashboard({ data }: SkiingTechniqueDashboardProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en';

  const getTechniqueLabel = () => {
    switch (data.techniqueType) {
      case 'CLASSIC':
        return copy(locale, 'Classic (diagonal stride)', 'Klassisk (Diagonalgång)');
      case 'SKATING':
        return data.skatingVariant
          ? `Skating (${data.skatingVariant.replace('_', '-')})`
          : 'Skating';
      case 'DOUBLE_POLE':
        return copy(locale, 'Double poling', 'Dubbelstakning');
      default:
        return copy(locale, 'Unknown technique', 'Okänd teknik');
    }
  };

  const getScoreColor = (score: number | null | undefined) => {
    if (score === null || score === undefined) return 'text-muted-foreground';
    if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 60) return 'text-blue-600 dark:text-blue-400';
    if (score >= 40) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getTimingLabel = (timing: string | null | undefined) => {
    if (!timing) return '-';
    switch (timing) {
      case 'EARLY':
        return copy(locale, 'Early', 'Tidig');
      case 'ON_TIME':
        return copy(locale, 'On time', 'I tid');
      case 'LATE':
        return copy(locale, 'Late', 'Sen');
      default:
        return timing;
    }
  };

  const getEngagementLabel = (level: string | null | undefined) => {
    if (!level) return '-';
    switch (level) {
      case 'GOOD':
        return copy(locale, 'Good', 'Bra');
      case 'MODERATE':
        return copy(locale, 'Moderate', 'Måttlig');
      case 'POOR':
        return copy(locale, 'Weak', 'Svag');
      case 'SIGNIFICANT':
        return copy(locale, 'Significant', 'Betydande');
      case 'MINIMAL':
        return copy(locale, 'Minimal', 'Minimal');
      default:
        return level;
    }
  };

  const getExtensionLabel = (ext: string | null | undefined) => {
    if (!ext) return '-';
    switch (ext) {
      case 'FULL':
        return copy(locale, 'Full', 'Full');
      case 'PARTIAL':
        return copy(locale, 'Partial', 'Partiell');
      case 'INCOMPLETE':
        return copy(locale, 'Incomplete', 'Ofullständig');
      default:
        return ext;
    }
  };

  const getDepthLabel = (depth: string | null | undefined) => {
    if (!depth) return '-';
    switch (depth) {
      case 'SHALLOW':
        return copy(locale, 'Shallow', 'Grund');
      case 'OPTIMAL':
        return copy(locale, 'Optimal', 'Optimal');
      case 'EXCESSIVE':
        return copy(locale, 'Excessive', 'Överdriven');
      default:
        return depth;
    }
  };

  const getSpeedLabel = (speed: string | null | undefined) => {
    if (!speed) return '-';
    switch (speed) {
      case 'FAST':
        return copy(locale, 'Fast', 'Snabb');
      case 'MODERATE':
        return copy(locale, 'Moderate', 'Måttlig');
      case 'SLOW':
        return copy(locale, 'Slow', 'Långsam');
      default:
        return speed;
    }
  };

  const getLegPathLabel = (path: string | null | undefined) => {
    if (!path) return '-';
    switch (path) {
      case 'COMPACT':
        return copy(locale, 'Compact', 'Kompakt');
      case 'WIDE':
        return copy(locale, 'Wide', 'Bred');
      case 'INCONSISTENT':
        return copy(locale, 'Inconsistent', 'Inkonsekvent');
      case 'EFFICIENT':
        return copy(locale, 'Efficient', 'Effektiv');
      case 'INEFFICIENT':
        return copy(locale, 'Inefficient', 'Ineffektiv');
      default:
        return path;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Technique Type */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <Snowflake className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">{getTechniqueLabel()}</h2>
          <p className="text-sm text-muted-foreground">{copy(locale, 'AI-driven technique analysis', 'AI-driven teknikanalys')}</p>
        </div>
      </div>

      {/* Overall Scores Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4" /> {copy(locale, 'Overall', 'Övergripande')}
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

        {/* Balance or Power Score */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {data.techniqueType === 'DOUBLE_POLE' ? (
                <>
                  <Zap className="h-4 w-4" /> {copy(locale, 'Power', 'Kraft')}
                </>
              ) : (
                <>
                  <ArrowUpDown className="h-4 w-4" /> {copy(locale, 'Balance', 'Balans')}
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className={`text-3xl font-bold ${getScoreColor(
                data.techniqueType === 'DOUBLE_POLE' ? data.powerScore : data.balanceScore
              )}`}>
                {(data.techniqueType === 'DOUBLE_POLE' ? data.powerScore : data.balanceScore) ?? '-'}
              </div>
              <div className="text-sm text-muted-foreground">/100</div>
            </div>
          </CardContent>
        </Card>

        {/* Timing or Rhythm Score */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {data.techniqueType === 'DOUBLE_POLE' ? (
                <>
                  <Gauge className="h-4 w-4" /> {copy(locale, 'Rhythm', 'Rytm')}
                </>
              ) : (
                <>
                  <Timer className="h-4 w-4" /> Timing
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className={`text-3xl font-bold ${getScoreColor(
                data.techniqueType === 'DOUBLE_POLE' ? data.rhythmScore : data.timingScore
              )}`}>
                {(data.techniqueType === 'DOUBLE_POLE' ? data.rhythmScore : data.timingScore) ?? '-'}
              </div>
              <div className="text-sm text-muted-foreground">/100</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> {copy(locale, 'Efficiency', 'Effektivitet')}
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
      </div>

      {/* Pole Mechanics Panel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{copy(locale, 'Pole mechanics', 'Stavmekanik')}</CardTitle>
          <CardDescription>{copy(locale, 'Analysis of pole technique and timing', 'Analys av stavteknik och timing')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">{copy(locale, 'Plant angle', 'Plantvinkel')}</span>
              <span className="text-xl font-semibold">
                {data.poleAngleAtPlant != null ? `${data.poleAngleAtPlant}°` : '-'}
              </span>
            </div>
            <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">{copy(locale, 'Release angle', 'Släppvinkel')}</span>
              <span className="text-xl font-semibold">
                {data.poleAngleAtRelease != null ? `${data.poleAngleAtRelease}°` : '-'}
              </span>
            </div>
            <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Timing</span>
              <span className="text-xl font-semibold">
                {getTimingLabel(data.polePlantTiming)}
              </span>
            </div>
            <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">{copy(locale, 'Force transfer', 'Kraftöverföring')}</span>
              <span className="text-xl font-semibold">
                {getEngagementLabel(data.poleForceApplication)}
              </span>
            </div>
            <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">{copy(locale, 'Arm symmetry', 'Armsymmetri')}</span>
              <span className="text-xl font-semibold">
                {data.armSwingSymmetry != null ? `${data.armSwingSymmetry}%` : '-'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hip & Core Panel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{copy(locale, 'Hip & Trunk', 'Höft & Bål')}</CardTitle>
          <CardDescription>{copy(locale, 'Position and stability', 'Position och stabilitet')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">{copy(locale, 'Hip position', 'Höftposition')}</span>
              <span className={`text-xl font-semibold ${getScoreColor(data.hipPositionScore)}`}>
                {data.hipPositionScore != null ? `${data.hipPositionScore}/100` : '-'}
              </span>
            </div>
            <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">{copy(locale, 'Height consistency', 'Höjdkonsistens')}</span>
              <span className="text-xl font-semibold">
                {data.hipHeightConsistency != null ? `${data.hipHeightConsistency}%` : '-'}
              </span>
            </div>
            <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">{copy(locale, 'Trunk engagement', 'Bålengagemang')}</span>
              <span className="text-xl font-semibold">
                {getEngagementLabel(data.coreEngagement)}
              </span>
            </div>
            <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">{copy(locale, 'Forward lean', 'Framåtlutning')}</span>
              <span className="text-xl font-semibold">
                {data.forwardLean != null ? `${data.forwardLean}°` : '-'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technique-specific panels */}
      {data.techniqueType === 'CLASSIC' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{copy(locale, 'Classic technique', 'Klassisk Teknik')}</CardTitle>
            <CardDescription>{copy(locale, 'Kick and glide phase', 'Frånspark och glidfas')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">{copy(locale, 'Kick timing', 'Frånspark timing')}</span>
                <span className={`text-xl font-semibold ${getScoreColor(data.kickTimingScore)}`}>
                  {data.kickTimingScore != null ? `${data.kickTimingScore}/100` : '-'}
                </span>
              </div>
              <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">{copy(locale, 'Kick extension', 'Frånspark extension')}</span>
                <span className="text-xl font-semibold">
                  {getExtensionLabel(data.kickExtension)}
                </span>
              </div>
              <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">{copy(locale, 'Glide phase', 'Glidfas')}</span>
                <span className="text-xl font-semibold">
                  {data.glidePhaseDuration != null ? `${data.glidePhaseDuration}s` : '-'}
                </span>
              </div>
              <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">{copy(locale, 'Leg recovery', 'Benåterhämtning')}</span>
                <span className="text-xl font-semibold">
                  {getLegPathLabel(data.legRecoveryPattern)}
                </span>
              </div>
              <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">{copy(locale, 'Grip zone', 'Fästezon')}</span>
                <span className="text-xl font-semibold">
                  {getEngagementLabel(data.waxPocketEngagement)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {data.techniqueType === 'SKATING' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <MoveHorizontal className="h-5 w-5" /> {copy(locale, 'Skate technique', 'Skate Teknik')}
              {data.skatingVariant && (
                <Badge variant="secondary">{data.skatingVariant.replace('_', '-')}</Badge>
              )}
            </CardTitle>
            <CardDescription>{copy(locale, 'Edge angles and V-pattern', 'Kantvinklar och V-mönster')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">{copy(locale, 'Left edge angle', 'Kantvinkel vänster')}</span>
                <span className="text-xl font-semibold">
                  {data.edgeAngleLeft != null ? `${data.edgeAngleLeft}°` : '-'}
                </span>
              </div>
              <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">{copy(locale, 'Right edge angle', 'Kantvinkel höger')}</span>
                <span className="text-xl font-semibold">
                  {data.edgeAngleRight != null ? `${data.edgeAngleRight}°` : '-'}
                </span>
              </div>
              <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">{copy(locale, 'Edge symmetry', 'Kantsymmetri')}</span>
                <span className="text-xl font-semibold">
                  {data.edgeAngleSymmetry != null ? `${data.edgeAngleSymmetry}%` : '-'}
                </span>
              </div>
              <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">{copy(locale, 'Push-off angle', 'Avsparksvinkel')}</span>
                <span className="text-xl font-semibold">
                  {data.pushOffAngle != null ? `${data.pushOffAngle}°` : '-'}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
              <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">{copy(locale, 'V-pattern width', 'V-mönster bredd')}</span>
                <span className="text-xl font-semibold">
                  {data.vPatternWidth != null ? `${data.vPatternWidth} cm` : '-'}
                </span>
              </div>
              <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">{copy(locale, 'Skate frequency', 'Skatefrekvens')}</span>
                <span className="text-xl font-semibold">
                  {data.skateFrequency != null ? `${data.skateFrequency} Hz` : '-'}
                </span>
              </div>
              <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">{copy(locale, 'Leg recovery', 'Återhämtning ben')}</span>
                <span className="text-xl font-semibold">
                  {getLegPathLabel(data.recoveryLegPath)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {data.techniqueType === 'DOUBLE_POLE' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{copy(locale, 'Double poling', 'Dubbelstakning')}</CardTitle>
            <CardDescription>{copy(locale, 'Trunk movement and rhythm', 'Bålrörelse och rytm')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">{copy(locale, 'Trunk flexion', 'Bålflexion')}</span>
                <span className="text-xl font-semibold">
                  {data.trunkFlexionRange != null ? `${data.trunkFlexionRange}°` : '-'}
                </span>
              </div>
              <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">{copy(locale, 'Compression depth', 'Kompressionsdjup')}</span>
                <span className="text-xl font-semibold">
                  {getDepthLabel(data.compressionDepth)}
                </span>
              </div>
              <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">{copy(locale, 'Return phase', 'Återgångsfas')}</span>
                <span className="text-xl font-semibold">
                  {getSpeedLabel(data.returnPhaseSpeed)}
                </span>
              </div>
              <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">{copy(locale, 'Leg drive', 'Bendrivning')}</span>
                <span className="text-xl font-semibold">
                  {getEngagementLabel(data.legDriveContribution)}
                </span>
              </div>
              <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">{copy(locale, 'Rhythm consistency', 'Rytmkonsistens')}</span>
                <span className="text-xl font-semibold">
                  {data.rhythmConsistency != null ? `${data.rhythmConsistency}%` : '-'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths */}
        <Card className="border-emerald-200 dark:border-emerald-900/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" /> {copy(locale, 'Strengths', 'Styrkor')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.primaryStrengths && data.primaryStrengths.length > 0 ? (
              <ul className="space-y-2">
                {data.primaryStrengths.map((strength, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-600 mt-0.5">+</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">{copy(locale, 'No strengths identified', 'Inga styrkor identifierade')}</p>
            )}
          </CardContent>
        </Card>

        {/* Weaknesses */}
        <Card className="border-amber-200 dark:border-amber-900/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <TrendingUp className="h-5 w-5" /> {copy(locale, 'Improvement areas', 'Förbättringsområden')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.primaryWeaknesses && data.primaryWeaknesses.length > 0 ? (
              <ul className="space-y-2">
                {data.primaryWeaknesses.map((weakness, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-amber-600 mt-0.5">!</span>
                    <span>{weakness}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">{copy(locale, 'No improvement areas identified', 'Inga förbättringsområden identifierade')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Drill Recommendations */}
      {data.techniqueDrills && data.techniqueDrills.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="h-6 w-6 text-primary" />
              {copy(locale, 'Recommended drills', 'Rekommenderade övningar')}
            </CardTitle>
            <CardDescription>{copy(locale, 'Prioritized technique drills based on the analysis', 'Prioriterade teknikövningar baserat på analysen')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.techniqueDrills
                .sort((a, b) => a.priority - b.priority)
                .map((drill, i) => (
                  <div
                    key={i}
                    className="p-4 bg-background rounded-lg border shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-lg">{drill.drill}</span>
                      <Badge variant="secondary">{copy(locale, 'Priority', 'Prioritet')} {drill.priority}</Badge>
                    </div>
                    <p className="text-muted-foreground">{drill.focus}</p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Elite Comparison */}
      {data.comparisonToElite && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{copy(locale, 'Comparison with elite skiers', 'Jämförelse med elitåkare')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              {data.comparisonToElite}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
