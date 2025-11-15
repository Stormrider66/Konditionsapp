'use client';

/**
 * Test Results Display
 *
 * Display field test results with analysis and recommendations
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, Info } from 'lucide-react';

interface TestResultsDisplayProps {
  testType: 'THIRTY_MIN_TT' | 'HR_DRIFT' | 'CRITICAL_VELOCITY';
  results: any;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  recommendations: string[];
}

export function TestResultsDisplay({
  testType,
  results,
  confidence,
  validation,
  recommendations
}: TestResultsDisplayProps) {
  return (
    <div className="space-y-6">
      {/* Confidence Badge */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Test Results</h2>
        <Badge variant={confidence === 'HIGH' ? 'default' : confidence === 'MEDIUM' ? 'secondary' : 'destructive'}>
          {confidence} Confidence
        </Badge>
      </div>

      {/* Validation Alerts */}
      {!validation.isValid && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-1">Validation Errors:</p>
            <ul className="list-disc list-inside">
              {validation.errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {validation.warnings.length > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-1">Warnings:</p>
            <ul className="list-disc list-inside">
              {validation.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Test-Specific Results */}
      {testType === 'THIRTY_MIN_TT' && <ThirtyMinTTResults results={results} />}
      {testType === 'HR_DRIFT' && <HRDriftResults results={results} />}
      {testType === 'CRITICAL_VELOCITY' && <CriticalVelocityResults results={results} />}

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function ThirtyMinTTResults({ results }: { results: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>30-Minute Time Trial Analysis</CardTitle>
        <CardDescription>Gold standard for LT2 (r=0.96 with MLSS)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">LT2 Pace</p>
            <p className="text-2xl font-bold">{results.lt2Pace?.toFixed(2)} min/km</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">LT2 HR</p>
            <p className="text-2xl font-bold">{results.lt2HR?.toFixed(0)} bpm</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Avg Speed</p>
            <p className="text-2xl font-bold">{results.avgSpeed?.toFixed(2)} km/h</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">% of Max HR</p>
            <p className="text-2xl font-bold">{results.percentOfMaxHR?.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Distance</p>
            <p className="text-2xl font-bold">{(results.distance / 1000).toFixed(2)} km</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Confidence</p>
            <p className="text-2xl font-bold">{results.confidence}</p>
          </div>
        </div>

        {results.trainingZones && (
          <div className="mt-6">
            <h4 className="font-medium mb-3">Recommended Training Zones</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 bg-muted rounded">
                <span>Zone 1 (Recovery)</span>
                <span className="font-mono">{results.trainingZones.zone1} min/km</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-muted rounded">
                <span>Zone 2 (Easy)</span>
                <span className="font-mono">{results.trainingZones.zone2} min/km</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-muted rounded">
                <span>Zone 3 (Tempo)</span>
                <span className="font-mono">{results.trainingZones.zone3} min/km</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-muted rounded">
                <span>Zone 4 (LT2)</span>
                <span className="font-mono font-bold">{results.trainingZones.zone4} min/km</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HRDriftResults({ results }: { results: any }) {
  const driftPercentage = results.drift || 0;
  const isGoodPace = driftPercentage < 5;

  return (
    <Card>
      <CardHeader>
        <CardTitle>HR Drift Analysis</CardTitle>
        <CardDescription>Validates easy pace (target: &lt;5% drift)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className={`p-6 rounded-lg ${isGoodPace ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
            <p className="text-sm text-muted-foreground mb-2">HR Drift</p>
            <p className="text-4xl font-bold">{driftPercentage.toFixed(1)}%</p>
            {isGoodPace && (
              <p className="text-sm text-green-700 mt-2">✅ Pace is below LT1 - suitable for easy runs</p>
            )}
            {!isGoodPace && (
              <p className="text-sm text-orange-700 mt-2">⚠️ Significant drift - reduce pace for next test</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">First Half HR</p>
              <p className="text-2xl font-bold">{results.firstHalfAvgHR} bpm</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Second Half HR</p>
              <p className="text-2xl font-bold">{results.secondHalfAvgHR} bpm</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Test Pace</p>
              <p className="text-2xl font-bold">{results.pace?.toFixed(2)} min/km</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="text-2xl font-bold">{results.duration} min</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CriticalVelocityResults({ results }: { results: any }) {
  const r2 = results.r2 || 0;
  const isReliable = r2 > 0.95;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Critical Velocity Analysis</CardTitle>
        <CardDescription>Distance-time relationship (target: R² &gt; 0.95)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className={`p-6 rounded-lg ${isReliable ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
            <p className="text-sm text-muted-foreground mb-2">R² (Fit Quality)</p>
            <p className="text-4xl font-bold">{r2.toFixed(3)}</p>
            {isReliable && (
              <p className="text-sm text-green-700 mt-2">✅ Excellent fit - reliable CV estimate</p>
            )}
            {!isReliable && (
              <p className="text-sm text-orange-700 mt-2">⚠️ Lower R² - perform additional trials for better accuracy</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Critical Velocity</p>
              <p className="text-2xl font-bold">{results.criticalVelocity?.toFixed(2)} m/s</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">D' (Anaerobic Capacity)</p>
              <p className="text-2xl font-bold">{results.dPrime?.toFixed(0)} m</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">CV Pace</p>
              <p className="text-2xl font-bold">{results.cvPace?.toFixed(2)} min/km</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Trials Used</p>
              <p className="text-2xl font-bold">{results.trialsCount}</p>
            </div>
          </div>

          {results.trials && (
            <div className="mt-4">
              <h4 className="font-medium mb-3">Trial Data</h4>
              <div className="space-y-2">
                {results.trials.map((trial: any, i: number) => (
                  <div key={i} className="flex justify-between items-center p-2 bg-muted rounded">
                    <span>Trial {i + 1}: {trial.distance}m</span>
                    <span className="font-mono">{trial.timeSeconds}s ({trial.velocity?.toFixed(2)} m/s)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
