'use client';

/**
 * Interval Lactate Button
 *
 * Compact lactate scan button for individual intervals in workout displays.
 * Shows inline next to interval segments for quick capture during training.
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Droplets, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LactateScanButton } from '@/components/shared/LactateScanButton';
import type { LactateMeterOCRResult } from '@/lib/validations/gemini-schemas';
import { useTranslations } from '@/i18n/client';

interface IntervalLactateButtonProps {
  clientId: string;
  workoutId: string;
  intervalNumber: number;
  segmentDescription?: string;
}

interface CapturedReading {
  value: number;
  confidence: number;
  timestamp: Date;
}

export function IntervalLactateButton({
  clientId,
  workoutId,
  intervalNumber,
  segmentDescription,
}: IntervalLactateButtonProps) {
  const t = useTranslations('components.intervalLactateButton');
  const { toast } = useToast();
  const [reading, setReading] = useState<CapturedReading | null>(null);

  async function handleValueDetected(
    value: number,
    confidence: number,
    _rawResult: LactateMeterOCRResult
  ) {
    try {
      const response = await fetch('/api/lactate/quick-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          workoutId,
          lactateValue: value,
          confidence,
          intervalNumber,
          context: segmentDescription || t('intervalLabel', { intervalNumber }),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save interval lactate');
      }

      setReading({
        value,
        confidence,
        timestamp: new Date(),
      });

      toast({
        title: t('toast.savedTitle', { intervalNumber, value }),
        description: t('toast.savedDescription'),
      });
    } catch (error) {
      console.error('Failed to save interval lactate:', error);
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.errorDescription'),
        variant: 'destructive',
      });
    }
  }

  // If already captured, show the value
  if (reading) {
    return (
      <Badge
        variant="outline"
        className="flex items-center gap-1 text-xs bg-green-50 border-green-200 text-green-700"
      >
        <Check className="h-3 w-3" />
        {reading.value} mmol/L
      </Badge>
    );
  }

  return (
    <LactateScanButton
      onValueDetected={handleValueDetected}
      clientId={clientId}
      testStageContext={t('intervalLabel', { intervalNumber })}
      size="sm"
      iconOnly
      variant="ghost"
      className="h-7 w-7 p-0"
    />
  );
}

/**
 * Wrapper component to display multiple interval lactate buttons.
 * Useful when showing a summary of all intervals in a workout.
 */
interface IntervalLactateSummaryProps {
  clientId: string;
  workoutId: string;
  intervalCount: number;
}

export function IntervalLactateSummary({
  clientId,
  workoutId,
  intervalCount,
}: IntervalLactateSummaryProps) {
  const t = useTranslations('components.intervalLactateButton');

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-xs text-muted-foreground mr-1">
        <Droplets className="h-3 w-3 inline mr-1" />
        {t('summaryLabel')}:
      </span>
      {Array.from({ length: intervalCount }, (_, i) => (
        <div key={i} className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">{i + 1}.</span>
          <IntervalLactateButton
            clientId={clientId}
            workoutId={workoutId}
            intervalNumber={i + 1}
          />
        </div>
      ))}
    </div>
  );
}
