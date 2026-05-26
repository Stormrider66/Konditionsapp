'use client';

/**
 * Running Gait Analysis Dashboard
 *
 * Displays structured running gait analysis from Gemini 3.1 Pro.
 * Features:
 * - Biometrics gauges (cadence, GCT, vertical oscillation)
 * - Injury risk panel with clickable timestamps
 * - Coaching cues action plan
 * - Efficiency rating
 */

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  Activity,
  Footprints,
  Timer,
  ArrowUpCircle,
  PlayCircle,
  Dumbbell,
  Target,
  TrendingUp,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useLocale } from '@/i18n/client';
import type { RunningGaitAnalysisResult } from '@/lib/validations/gemini-schemas';

interface RunningGaitDashboardProps {
  data: RunningGaitAnalysisResult;
  onJumpToTimestamp?: (timestamp: string) => void;
}

type AppLocale = 'en' | 'sv';

function copy(locale: AppLocale, en: string, sv: string) {
  return locale === 'sv' ? sv : en;
}

export function RunningGaitDashboard({
  data,
  onJumpToTimestamp,
}: RunningGaitDashboardProps) {
  const locale: AppLocale = useLocale() === 'sv' ? 'sv' : 'en';
  const [activeTimestamp, setActiveTimestamp] = useState<string | null>(null);

  const handleJumpToTimestamp = (timestamp: string) => {
    setActiveTimestamp(timestamp);
    onJumpToTimestamp?.(timestamp);
    // Clear highlight after 2 seconds
    setTimeout(() => setActiveTimestamp(null), 2000);
  };

  const getSeverityBadge = (severity: 'LOW' | 'MEDIUM' | 'HIGH') => {
    const variants = {
      LOW: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      HIGH: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return (
      <Badge className={variants[severity]} variant="outline">
        {severity === 'LOW'
          ? copy(locale, 'Low', 'Låg')
          : severity === 'MEDIUM'
            ? copy(locale, 'Medium', 'Medel')
            : copy(locale, 'High', 'Hög')}
      </Badge>
    );
  };

  const getEfficiencyColor = (rating: string) => {
    switch (rating) {
      case 'EXCELLENT':
        return 'text-green-600 dark:text-green-400';
      case 'GOOD':
        return 'text-blue-600 dark:text-blue-400';
      case 'MODERATE':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'POOR':
        return 'text-red-600 dark:text-red-400';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Score & Efficiency Header */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Card className="flex-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5" /> {copy(locale, 'Overall score', 'Övergripande poäng')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold">{data.overallScore}</div>
              <div className="flex-1">
                <Progress value={data.overallScore} className="h-3" />
              </div>
              <div className="text-sm text-muted-foreground">/100</div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" /> {copy(locale, 'Running efficiency', 'Löpeffektivitet')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className={`text-2xl font-bold ${getEfficiencyColor(data.efficiency.rating)}`}>
                {data.efficiency.rating === 'EXCELLENT'
                  ? copy(locale, 'Excellent', 'Utmärkt')
                  : data.efficiency.rating === 'GOOD'
                  ? copy(locale, 'Good', 'Bra')
                  : data.efficiency.rating === 'MODERATE'
                  ? copy(locale, 'Moderate', 'Måttlig')
                  : copy(locale, 'Needs improvement', 'Behöver förbättras')}
              </div>
              <Badge variant="secondary">{data.efficiency.score}/100</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Biometrics Panel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" /> {copy(locale, 'Biometric metrics', 'Biometriska mätvärden')}
          </CardTitle>
          <CardDescription>{copy(locale, 'Estimated values from video analysis', 'Uppskattade värden från videoanalys')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Timer className="h-3 w-3" /> {copy(locale, 'Cadence', 'Kadens')}
              </span>
              <span className="text-2xl font-bold">
                {data.biometrics.estimatedCadence}
                <span className="text-sm font-normal ml-1">spm</span>
              </span>
            </div>

            <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">{copy(locale, 'Ground contact time', 'Markontakttid')}</span>
              <span className="text-xl font-semibold capitalize">
                {data.biometrics.groundContactTime === 'SHORT'
                  ? copy(locale, 'Short', 'Kort')
                  : data.biometrics.groundContactTime === 'NORMAL'
                  ? copy(locale, 'Normal', 'Normal')
                  : copy(locale, 'Long', 'Lång')}
              </span>
            </div>

            <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <ArrowUpCircle className="h-3 w-3" /> {copy(locale, 'Vertical osc.', 'Vertikal osc.')}
              </span>
              <span className="text-xl font-semibold capitalize">
                {data.biometrics.verticalOscillation === 'MINIMAL'
                  ? copy(locale, 'Minimal', 'Minimal')
                  : data.biometrics.verticalOscillation === 'MODERATE'
                  ? copy(locale, 'Moderate', 'Måttlig')
                  : copy(locale, 'Excessive', 'Överdriven')}
              </span>
            </div>

            <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">{copy(locale, 'Stride length', 'Steglängd')}</span>
              <span className="text-xl font-semibold capitalize">
                {data.biometrics.strideLength === 'SHORT'
                  ? copy(locale, 'Short', 'Kort')
                  : data.biometrics.strideLength === 'OPTIMAL'
                  ? copy(locale, 'Optimal', 'Optimal')
                  : copy(locale, 'Overstriding', 'Överstriding')}
              </span>
            </div>

            <div className="flex flex-col p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Footprints className="h-3 w-3" /> {copy(locale, 'Foot strike', 'Fotisättning')}
              </span>
              <span className="text-xl font-semibold">
                {data.biometrics.footStrike === 'HEEL'
                  ? copy(locale, 'Heel', 'Häl')
                  : data.biometrics.footStrike === 'MIDFOOT'
                  ? copy(locale, 'Midfoot', 'Mittfot')
                  : copy(locale, 'Forefoot', 'Framfot')}
              </span>
            </div>
          </div>

          {/* Asymmetry */}
          {data.asymmetry.overallPercent > 5 && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">
                  Asymmetri: {data.asymmetry.overallPercent.toFixed(1)}%
                </span>
                {data.asymmetry.overallPercent > 10 && (
                  <Badge variant="destructive" className="ml-2">
                    {copy(locale, 'Needs action', 'Behöver åtgärdas')}
                  </Badge>
                )}
              </div>
              {data.asymmetry.significantDifferences.length > 0 && (
                <ul className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                  {data.asymmetry.significantDifferences.map((diff, i) => (
                    <li key={i}>• {diff}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Injury Risk & Energy Leakages Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Injury Risk Panel */}
        <Card className="border-red-100 dark:border-red-900/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" /> {copy(locale, 'Injury risk assessment', 'Skaderiskbedömning')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-3xl font-bold">
                {data.injuryRiskAnalysis.riskScore}
                <span className="text-lg text-muted-foreground">/10</span>
              </div>
              <Progress
                value={data.injuryRiskAnalysis.riskScore * 10}
                className="h-3 flex-1"
              />
            </div>

            {/* Posterior Chain Status */}
            <div className="mb-4 flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{copy(locale, 'Posterior chain:', 'Bakre kedjan:')}</span>
              {data.injuryRiskAnalysis.posteriorChainEngagement ? (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {copy(locale, 'Good activation', 'God aktivering')}
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-red-100 text-red-800">
                  <XCircle className="h-3 w-3 mr-1" />
                  {copy(locale, 'Weak activation', 'Svag aktivering')}
                </Badge>
              )}
            </div>

            {/* Detected Compensations */}
            <div className="space-y-3">
              {data.injuryRiskAnalysis.detectedCompensations.map((comp, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-2.5 rounded-lg transition-colors border ${
                    activeTimestamp === comp.timestamp
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-muted border-transparent hover:border-border'
                  }`}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 mt-0.5 text-primary"
                    onClick={() => handleJumpToTimestamp(comp.timestamp)}
                  >
                    <PlayCircle className="h-5 w-5" />
                  </Button>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{comp.issue}</span>
                      {getSeverityBadge(comp.severity)}
                      <Badge variant="secondary" className="text-xs">
                        {comp.timestamp}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 leading-snug">
                      {comp.observation}
                    </p>
                  </div>
                </div>
              ))}

              {data.injuryRiskAnalysis.detectedCompensations.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {copy(locale, 'No significant compensation patterns detected', 'Inga signifikanta kompensationsmönster upptäckta')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Energy Leakages Panel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" /> {copy(locale, 'Energy leaks', 'Energiläckage')}
            </CardTitle>
            <CardDescription>
              {copy(locale, 'Identified inefficiencies that affect running economy', 'Identifierade ineffektiviteter som påverkar löpekonomi')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.efficiency.energyLeakages.map((leak, index) => (
                <div
                  key={index}
                  className="p-3 bg-muted/50 rounded-lg border border-border"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{leak.type}</span>
                    <Badge
                      variant={
                        leak.impactLevel === 'SIGNIFICANT'
                          ? 'destructive'
                          : leak.impactLevel === 'MODERATE'
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {leak.impactLevel === 'SIGNIFICANT'
                        ? copy(locale, 'Significant', 'Betydande')
                        : leak.impactLevel === 'MODERATE'
                        ? copy(locale, 'Moderate', 'Måttlig')
                        : copy(locale, 'Minor', 'Mindre')}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {leak.description}
                  </p>
                </div>
              ))}

              {data.efficiency.energyLeakages.length === 0 && (
                <div className="text-center py-4">
                  <CheckCircle2 className="h-8 w-8 mx-auto text-green-500 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {copy(locale, 'No significant energy leaks identified', 'Inga betydande energiläckage identifierade')}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coach's Action Plan */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-6 w-6 text-primary" />
            {copy(locale, "Coach's action plan", 'Coachens handlingsplan')}
          </CardTitle>
          <CardDescription>{copy(locale, 'AI-generated interventions based on the analysis', 'AI-genererade interventioner baserat på analysen')}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <h3 className="font-semibold text-primary flex items-center gap-2">
              🎯 {copy(locale, 'Immediate correction', 'Omedelbar korrigering')}
            </h3>
            <p className="text-lg font-medium leading-tight p-3 bg-background rounded-lg border shadow-sm">
              &ldquo;{data.coachingCues.immediateCorrection}&rdquo;
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              🛠️ {copy(locale, 'Recommended drill', 'Rekommenderad övning')}
            </h3>
            <div className="p-3 bg-background rounded-lg border shadow-sm">
              <span className="font-medium">{data.coachingCues.drillRecommendation}</span>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              💪 {copy(locale, 'Strength priorities', 'Styrkeprioriteringar')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {data.coachingCues.strengthFocus.map((muscle, i) => (
                <Badge key={i} variant="secondary" className="text-sm px-3 py-1">
                  {muscle}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{copy(locale, 'Summary', 'Sammanfattning')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-relaxed">{data.summary}</p>
        </CardContent>
      </Card>
    </div>
  );
}
