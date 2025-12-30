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
  Snowflake,
  Zap,
  Timer,
  ArrowUpDown,
  Dumbbell,
  Gauge,
  MoveHorizontal,
} from 'lucide-react';

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

export function SkiingTechniqueDashboard({ data }: SkiingTechniqueDashboardProps) {
  const getTechniqueLabel = () => {
    switch (data.techniqueType) {
      case 'CLASSIC':
        return 'Klassisk (Diagonalgång)';
      case 'SKATING':
        return data.skatingVariant
          ? `Skating (${data.skatingVariant.replace('_', '-')})`
          : 'Skating';
      case 'DOUBLE_POLE':
        return 'Dubbelstakning';
      default:
        return 'Okänd teknik';
    }
  };

  const getScoreColor = (score: number | null | undefined) => {
    if (score === null || score === undefined) return 'text-muted-foreground';
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-blue-600 dark:text-blue-400';
    if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getTimingLabel = (timing: string | null | undefined) => {
    if (!timing) return '-';
    switch (timing) {
      case 'EARLY':
        return 'Tidig';
      case 'ON_TIME':
        return 'I tid';
      case 'LATE':
        return 'Sen';
      default:
        return timing;
    }
  };

  const getEngagementLabel = (level: string | null | undefined) => {
    if (!level) return '-';
    switch (level) {
      case 'GOOD':
        return 'Bra';
      case 'MODERATE':
        return 'Måttlig';
      case 'POOR':
        return 'Svag';
      case 'SIGNIFICANT':
        return 'Betydande';
      case 'MINIMAL':
        return 'Minimal';
      default:
        return level;
    }
  };

  const getExtensionLabel = (ext: string | null | undefined) => {
    if (!ext) return '-';
    switch (ext) {
      case 'FULL':
        return 'Full';
      case 'PARTIAL':
        return 'Partiell';
      case 'INCOMPLETE':
        return 'Ofullständig';
      default:
        return ext;
    }
  };

  const getDepthLabel = (depth: string | null | undefined) => {
    if (!depth) return '-';
    switch (depth) {
      case 'SHALLOW':
        return 'Grund';
      case 'OPTIMAL':
        return 'Optimal';
      case 'EXCESSIVE':
        return 'Överdriven';
      default:
        return depth;
    }
  };

  const getSpeedLabel = (speed: string | null | undefined) => {
    if (!speed) return '-';
    switch (speed) {
      case 'FAST':
        return 'Snabb';
      case 'MODERATE':
        return 'Måttlig';
      case 'SLOW':
        return 'Långsam';
      default:
        return speed;
    }
  };

  const getLegPathLabel = (path: string | null | undefined) => {
    if (!path) return '-';
    switch (path) {
      case 'COMPACT':
        return 'Kompakt';
      case 'WIDE':
        return 'Bred';
      case 'INCONSISTENT':
        return 'Inkonsekvent';
      case 'EFFICIENT':
        return 'Effektiv';
      case 'INEFFICIENT':
        return 'Ineffektiv';
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
          <p className="text-sm text-muted-foreground">AI-driven teknikanalys</p>
        </div>
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

        {/* Balance or Power Score */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {data.techniqueType === 'DOUBLE_POLE' ? (
                <>
                  <Zap className="h-4 w-4" /> Kraft
                </>
              ) : (
                <>
                  <ArrowUpDown className="h-4 w-4" /> Balans
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
                  <Gauge className="h-4 w-4" /> Rytm
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
      </div>

      {/* Pole Mechanics Panel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Stavmekanik</CardTitle>
          <CardDescription>Analys av stavteknik och timing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Plantvinkel</span>
              <span className="text-xl font-semibold">
                {data.poleAngleAtPlant != null ? `${data.poleAngleAtPlant}°` : '-'}
              </span>
            </div>
            <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Släppvinkel</span>
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
              <span className="text-sm text-muted-foreground">Kraftöverföring</span>
              <span className="text-xl font-semibold">
                {getEngagementLabel(data.poleForceApplication)}
              </span>
            </div>
            <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Armsymmetri</span>
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
          <CardTitle className="text-lg">Höft & Bål</CardTitle>
          <CardDescription>Position och stabilitet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Höftposition</span>
              <span className={`text-xl font-semibold ${getScoreColor(data.hipPositionScore)}`}>
                {data.hipPositionScore != null ? `${data.hipPositionScore}/100` : '-'}
              </span>
            </div>
            <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Höjdkonsistens</span>
              <span className="text-xl font-semibold">
                {data.hipHeightConsistency != null ? `${data.hipHeightConsistency}%` : '-'}
              </span>
            </div>
            <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Bålengagemang</span>
              <span className="text-xl font-semibold">
                {getEngagementLabel(data.coreEngagement)}
              </span>
            </div>
            <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Framåtlutning</span>
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
            <CardTitle className="text-lg">Klassisk Teknik</CardTitle>
            <CardDescription>Frånspark och glidfas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Frånspark timing</span>
                <span className={`text-xl font-semibold ${getScoreColor(data.kickTimingScore)}`}>
                  {data.kickTimingScore != null ? `${data.kickTimingScore}/100` : '-'}
                </span>
              </div>
              <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Frånspark extension</span>
                <span className="text-xl font-semibold">
                  {getExtensionLabel(data.kickExtension)}
                </span>
              </div>
              <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Glidfas</span>
                <span className="text-xl font-semibold">
                  {data.glidePhaseDuration != null ? `${data.glidePhaseDuration}s` : '-'}
                </span>
              </div>
              <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Benåterhämtning</span>
                <span className="text-xl font-semibold">
                  {getLegPathLabel(data.legRecoveryPattern)}
                </span>
              </div>
              <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Fästezon</span>
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
              <MoveHorizontal className="h-5 w-5" /> Skate Teknik
              {data.skatingVariant && (
                <Badge variant="secondary">{data.skatingVariant.replace('_', '-')}</Badge>
              )}
            </CardTitle>
            <CardDescription>Kantvinklar och V-mönster</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Kantvinkel vänster</span>
                <span className="text-xl font-semibold">
                  {data.edgeAngleLeft != null ? `${data.edgeAngleLeft}°` : '-'}
                </span>
              </div>
              <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Kantvinkel höger</span>
                <span className="text-xl font-semibold">
                  {data.edgeAngleRight != null ? `${data.edgeAngleRight}°` : '-'}
                </span>
              </div>
              <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Kantsymmetri</span>
                <span className="text-xl font-semibold">
                  {data.edgeAngleSymmetry != null ? `${data.edgeAngleSymmetry}%` : '-'}
                </span>
              </div>
              <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Avsparksvinkel</span>
                <span className="text-xl font-semibold">
                  {data.pushOffAngle != null ? `${data.pushOffAngle}°` : '-'}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
              <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">V-mönster bredd</span>
                <span className="text-xl font-semibold">
                  {data.vPatternWidth != null ? `${data.vPatternWidth} cm` : '-'}
                </span>
              </div>
              <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Skatefrekvens</span>
                <span className="text-xl font-semibold">
                  {data.skateFrequency != null ? `${data.skateFrequency} Hz` : '-'}
                </span>
              </div>
              <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Återhämtning ben</span>
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
            <CardTitle className="text-lg">Dubbelstakning</CardTitle>
            <CardDescription>Bålrörelse och rytm</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Bålflexion</span>
                <span className="text-xl font-semibold">
                  {data.trunkFlexionRange != null ? `${data.trunkFlexionRange}°` : '-'}
                </span>
              </div>
              <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Kompressionsdjup</span>
                <span className="text-xl font-semibold">
                  {getDepthLabel(data.compressionDepth)}
                </span>
              </div>
              <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Återgångsfas</span>
                <span className="text-xl font-semibold">
                  {getSpeedLabel(data.returnPhaseSpeed)}
                </span>
              </div>
              <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Bendrivning</span>
                <span className="text-xl font-semibold">
                  {getEngagementLabel(data.legDriveContribution)}
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
      {data.techniqueDrills && data.techniqueDrills.length > 0 && (
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
              {data.techniqueDrills
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

      {/* Elite Comparison */}
      {data.comparisonToElite && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Jämförelse med elitåkare</CardTitle>
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
