'use client';

/**
 * Ergometer Field Test Form
 *
 * Submit and analyze ergometer conditioning tests:
 * - Concept2 Row/SkiErg/BikeErg
 * - Wattbike
 * - Air Bike (Assault, Echo, Schwinn)
 *
 * Supports protocols:
 * - Peak Power (6s, 7-stroke, 30s)
 * - Time Trials (1K, 2K, 10min, 20min)
 * - Critical Power (3-min all-out, multi-trial)
 * - 4x4min Intervals
 * - MAP Ramp Test
 */

import { useState } from 'react';
import { ErgometerType, ErgometerTestProtocol } from '@prisma/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, Activity, Dumbbell, Bike, Wind, Timer } from 'lucide-react';
import { Concept2RowTestForm } from './protocols/Concept2RowTestForm';
import { Concept2SkiErgTestForm } from './protocols/Concept2SkiErgTestForm';
import { Concept2BikeErgTestForm } from './protocols/Concept2BikeErgTestForm';
import { WattbikeTestForm } from './protocols/WattbikeTestForm';
import { AirBikeTestForm } from './protocols/AirBikeTestForm';
import { ErgometerTestResults } from './results/ErgometerTestResults';

interface Athlete {
  id: string;
  name: string;
  gender?: 'MALE' | 'FEMALE';
  weight?: number;
}

interface ErgometerTestResult {
  test: {
    id: string;
    ergometerType: ErgometerType;
    testProtocol: ErgometerTestProtocol;
    avgPower?: number;
    peakPower?: number;
    criticalPower?: number;
    wPrime?: number;
    confidence?: string;
  };
  analysis: Record<string, unknown>;
  benchmark?: {
    tier?: string;
    percentile?: number;
    comparedTo?: string;
    message?: string;
  };
  recommendations: string[];
}

interface ErgometerFieldTestFormProps {
  athletes: Athlete[];
  defaultErgometer?: ErgometerType;
  onTestComplete?: (result: ErgometerTestResult) => void;
}

const ERGOMETER_ICONS: Record<ErgometerType, React.ReactNode> = {
  CONCEPT2_ROW: <Activity className="h-4 w-4" />,
  CONCEPT2_SKIERG: <Wind className="h-4 w-4" />,
  CONCEPT2_BIKEERG: <Bike className="h-4 w-4" />,
  WATTBIKE: <Bike className="h-4 w-4" />,
  ASSAULT_BIKE: <Dumbbell className="h-4 w-4" />,
};

const ERGOMETER_LABELS: Record<ErgometerType, string> = {
  CONCEPT2_ROW: 'Roddmaskin',
  CONCEPT2_SKIERG: 'SkiErg',
  CONCEPT2_BIKEERG: 'BikeErg',
  WATTBIKE: 'Wattbike',
  ASSAULT_BIKE: 'Air Bike',
};

export function ErgometerFieldTestForm({
  athletes,
  defaultErgometer = 'CONCEPT2_ROW',
  onTestComplete,
}: ErgometerFieldTestFormProps) {
  const [selectedErgometer, setSelectedErgometer] = useState<ErgometerType>(defaultErgometer);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ErgometerTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(data: Record<string, unknown>) {
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/ergometer-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          ergometerType: selectedErgometer,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit test');
      }

      const resultData = await response.json();
      setResult(resultData.data);

      if (onTestComplete) {
        onTestComplete(resultData.data);
      }
    } catch (err) {
      console.error('Ergometer test submission failed:', err);
      setError(err instanceof Error ? err.message : 'Test submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setResult(null);
    setError(null);
  }

  return (
    <div className="space-y-6">
      {/* Ergometer Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Ergometer Konditionstest
          </CardTitle>
          <CardDescription>
            Registrera falttest for att berakna troskeleffekt, zoner och benchmark-jamforelse
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={selectedErgometer}
            onValueChange={(v) => {
              setSelectedErgometer(v as ErgometerType);
              handleReset();
            }}
          >
            <TabsList className="grid w-full grid-cols-5 lg:grid-cols-5">
              {Object.entries(ERGOMETER_LABELS).map(([type, label]) => (
                <TabsTrigger
                  key={type}
                  value={type}
                  className="flex items-center gap-1 text-xs sm:text-sm"
                >
                  {ERGOMETER_ICONS[type as ErgometerType]}
                  <span className="hidden sm:inline">{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="CONCEPT2_ROW" className="mt-6">
              <Concept2RowTestForm
                athletes={athletes}
                onSubmit={handleSubmit}
                submitting={submitting}
              />
            </TabsContent>

            <TabsContent value="CONCEPT2_SKIERG" className="mt-6">
              <Concept2SkiErgTestForm
                athletes={athletes}
                onSubmit={handleSubmit}
                submitting={submitting}
              />
            </TabsContent>

            <TabsContent value="CONCEPT2_BIKEERG" className="mt-6">
              <Concept2BikeErgTestForm
                athletes={athletes}
                onSubmit={handleSubmit}
                submitting={submitting}
              />
            </TabsContent>

            <TabsContent value="WATTBIKE" className="mt-6">
              <WattbikeTestForm
                athletes={athletes}
                onSubmit={handleSubmit}
                submitting={submitting}
              />
            </TabsContent>

            <TabsContent value="ASSAULT_BIKE" className="mt-6">
              <AirBikeTestForm
                athletes={athletes}
                onSubmit={handleSubmit}
                submitting={submitting}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Fel vid inskickning</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Results Display */}
      {result && (
        <ErgometerTestResults
          result={result}
          ergometerType={selectedErgometer}
          onClose={handleReset}
        />
      )}
    </div>
  );
}
