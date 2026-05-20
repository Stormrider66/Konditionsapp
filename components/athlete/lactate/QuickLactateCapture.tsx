'use client';

/**
 * Quick Lactate Capture
 *
 * Simple one-tap lactate logging for athletes during training sessions.
 * Use cases:
 * - Self-monitoring during interval sessions
 * - Quick check during long runs/rides
 * - Norwegian double threshold training validation
 */

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Droplets, Heart, CheckCircle, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LactateScanButton } from '@/components/shared/LactateScanButton';
import type { LactateMeterOCRResult } from '@/lib/validations/gemini-schemas';

interface QuickLactateCaptureProps {
  clientId: string;
  workoutId?: string;
  workoutContext?: string;
  intervalNumber?: number;
  onCapture?: (reading: LactateReading) => void;
}

interface LactateReading {
  lactateValue: number;
  heartRate?: number;
  rpe?: number;
  context?: string;
  confidence?: number;
  timestamp: Date;
}

type AppLocale = 'en' | 'sv';

const getAppLocale = (locale: string): AppLocale => (locale === 'sv' ? 'sv' : 'en');

const t = (locale: AppLocale, svText: string, enText: string) => (
  locale === 'sv' ? svText : enText
);

export function QuickLactateCapture({
  clientId,
  workoutId,
  workoutContext,
  intervalNumber: _intervalNumber,
  onCapture,
}: QuickLactateCaptureProps) {
  const locale = getAppLocale(useLocale());
  const { toast } = useToast();
  const [lactateValue, setLactateValue] = useState<number | null>(null);
  const [heartRate, setHeartRate] = useState<string>('');
  const [rpe, setRpe] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [recentReadings, setRecentReadings] = useState<LactateReading[]>([]);

  function handleValueDetected(value: number, conf: number, _rawResult: LactateMeterOCRResult) {
    setLactateValue(value);
    setConfidence(conf);
  }

  async function handleSave() {
    if (lactateValue === null) {
      toast({
        title: t(locale, 'Inget laktatvärde', 'No lactate value'),
        description: t(locale, 'Scanna eller ange ett laktatvärde först', 'Scan or enter a lactate value first'),
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    const reading: LactateReading = {
      lactateValue,
      heartRate: heartRate ? parseInt(heartRate) : undefined,
      rpe: rpe ?? undefined,
      context: workoutContext,
      confidence: confidence ?? undefined,
      timestamp: new Date(),
    };

    try {
      const response = await fetch('/api/lactate/quick-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          workoutId,
          ...reading,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save lactate reading');
      }

      // Add to recent readings
      setRecentReadings(prev => [reading, ...prev].slice(0, 5));

      // Reset form
      setLactateValue(null);
      setHeartRate('');
      setRpe(null);
      setConfidence(null);

      toast({
        title: t(locale, 'Laktatvärde sparat!', 'Lactate value saved!'),
        description: t(locale, `${reading.lactateValue} mmol/L har registrerats`, `${reading.lactateValue} mmol/L has been recorded`),
      });

      onCapture?.(reading);
    } catch (error) {
      console.error('Failed to save lactate reading:', error);
      toast({
        title: t(locale, 'Kunde inte spara', 'Could not save'),
        description: t(locale, 'Försök igen senare', 'Try again later'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }

  function handleManualEntry(value: string) {
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 25) {
      setLactateValue(parsed);
      setConfidence(null); // Manual entry, no AI confidence
    } else if (value === '') {
      setLactateValue(null);
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Droplets className="h-5 w-5 text-red-500" />
          {t(locale, 'Snabbregistrering', 'Quick capture')}
        </CardTitle>
        <CardDescription>
          {t(locale, 'Ta en bild på laktatmätaren eller ange värdet manuellt', 'Take a photo of the lactate meter or enter the value manually')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Primary Action: Scan Button */}
        <div className="flex flex-col items-center gap-3">
          <LactateScanButton
            onValueDetected={handleValueDetected}
            clientId={clientId}
            testStageContext={workoutContext}
            variant="default"
            size="lg"
            buttonText={t(locale, 'Ta foto av mätare', 'Take meter photo')}
            className="w-full h-14 text-lg"
          />

          <div className="flex items-center gap-2 w-full">
            <div className="h-px bg-border flex-1" />
            <span className="text-xs text-muted-foreground px-2">{t(locale, 'eller ange manuellt', 'or enter manually')}</span>
            <div className="h-px bg-border flex-1" />
          </div>
        </div>

        {/* Lactate Value Display/Input */}
        <div className="space-y-2">
          <Label htmlFor="lactate">{t(locale, 'Laktatvärde (mmol/L)', 'Lactate value (mmol/L)')}</Label>
          <div className="flex gap-2 items-center">
            <Input
              id="lactate"
              type="number"
              step="0.1"
              min="0"
              max="25"
              inputMode="decimal"
              placeholder={t(locale, 't.ex. 2.5', 'e.g. 2.5')}
              value={lactateValue ?? ''}
              onChange={(e) => handleManualEntry(e.target.value)}
              className="h-12 text-lg font-semibold"
            />
            {confidence !== null && (
              <Badge variant={confidence >= 0.8 ? 'default' : 'secondary'}>
                {Math.round(confidence * 100)}%
              </Badge>
            )}
          </div>
        </div>

        {/* Optional: Heart Rate */}
        <div className="space-y-2">
          <Label htmlFor="hr" className="flex items-center gap-1">
            <Heart className="h-3 w-3" />
            {t(locale, 'Puls (valfritt)', 'Heart rate (optional)')}
          </Label>
          <Input
            id="hr"
            type="number"
            inputMode="numeric"
            placeholder={t(locale, 't.ex. 155', 'e.g. 155')}
            value={heartRate}
            onChange={(e) => setHeartRate(e.target.value)}
            className="h-10"
          />
        </div>

        {/* Optional: RPE */}
        <div className="space-y-2">
          <Label>{t(locale, 'RPE (1-10, valfritt)', 'RPE (1-10, optional)')}</Label>
          <div className="flex gap-1 flex-wrap">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
              <Button
                key={value}
                type="button"
                variant={rpe === value ? 'default' : 'outline'}
                size="sm"
                className="w-9 h-9"
                onClick={() => setRpe(rpe === value ? null : value)}
              >
                {value}
              </Button>
            ))}
          </div>
        </div>

        {/* Workout Context Badge */}
        {workoutContext && (
          <Alert className="bg-muted/50">
            <AlertDescription className="text-sm">
              <span className="font-medium">{t(locale, 'Träningspass:', 'Workout:')} </span>
              {workoutContext}
            </AlertDescription>
          </Alert>
        )}

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={lactateValue === null || isSaving}
          className="w-full h-12"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          {isSaving ? t(locale, 'Sparar...', 'Saving...') : t(locale, 'Spara laktatvärde', 'Save lactate value')}
        </Button>

        {/* Recent Readings */}
        {recentReadings.length > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <History className="h-4 w-4" />
              {t(locale, 'Senaste mätningar', 'Recent readings')}
            </div>
            <div className="space-y-1">
              {recentReadings.map((reading, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center text-sm p-2 rounded bg-muted/50"
                >
                  <span className="font-medium">{reading.lactateValue} mmol/L</span>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {reading.heartRate && (
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {reading.heartRate}
                      </span>
                    )}
                    <span>
                      {reading.timestamp.toLocaleTimeString(locale === 'sv' ? 'sv-SE' : 'en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
