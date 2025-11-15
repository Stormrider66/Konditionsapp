'use client';

/**
 * Workout Modification Banner
 *
 * Displays when a workout has been modified based on readiness assessment
 */

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, TrendingDown, Info } from 'lucide-react';

interface ModificationBannerProps {
  modification: {
    decision: 'PROCEED_NORMAL' | 'REDUCE_INTENSITY' | 'REDUCE_VOLUME' | 'EASY_DAY' | 'REST';
    reasoning: string[];
    intensityAdjustment?: number;
    volumeAdjustment?: number;
    originalWorkout?: any;
    modifiedWorkout?: any;
  };
}

export function ModificationBanner({ modification }: ModificationBannerProps) {
  if (modification.decision === 'PROCEED_NORMAL') {
    return null; // No modification needed
  }

  const getSeverity = (decision: string): 'default' | 'warning' | 'destructive' => {
    if (decision === 'REST') return 'destructive';
    if (decision === 'EASY_DAY' || decision === 'REDUCE_VOLUME') return 'warning';
    return 'default';
  };

  const getIcon = (decision: string) => {
    if (decision === 'REST') return <AlertCircle className="h-5 w-5" />;
    return <TrendingDown className="h-5 w-5" />;
  };

  const getTitle = (decision: string): string => {
    const titles: Record<string, string> = {
      'REDUCE_INTENSITY': 'Passet har anpassats - lägre intensitet',
      'REDUCE_VOLUME': 'Passet har anpassats - mindre volym',
      'EASY_DAY': 'Passet har bytts till lättare träning',
      'REST': '⚠️ Rekommenderad vila'
    };
    return titles[decision] || 'Passet har modifierats';
  };

  const getDescription = (decision: string): string => {
    const descriptions: Record<string, string> = {
      'REDUCE_INTENSITY': 'Baserat på din beredskap har intensiteten sänkts för bättre återhämtning.',
      'REDUCE_VOLUME': 'Baserat på din beredskap har passets längd reducerats.',
      'EASY_DAY': 'Baserat på din beredskap rekommenderas ett lättare pass istället.',
      'REST': 'Din beredskap indikerar att du behöver vila. Skippa dagens pass och återhämta dig.'
    };
    return descriptions[decision] || 'Passet har anpassats efter din aktuella beredskap.';
  };

  return (
    <Alert variant={getSeverity(modification.decision) as any} className="mb-4">
      <div className="flex items-start gap-3">
        {getIcon(modification.decision)}
        <div className="flex-1">
          <p className="font-semibold mb-1">{getTitle(modification.decision)}</p>
          <p className="text-sm mb-3">{getDescription(modification.decision)}</p>

          {/* Adjustments */}
          {(modification.intensityAdjustment || modification.volumeAdjustment) && (
            <div className="flex gap-2 mb-3">
              {modification.intensityAdjustment && modification.intensityAdjustment < 0 && (
                <Badge variant="outline" className="text-xs">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  Intensitet: {modification.intensityAdjustment}%
                </Badge>
              )}
              {modification.volumeAdjustment && modification.volumeAdjustment < 0 && (
                <Badge variant="outline" className="text-xs">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  Volym: {modification.volumeAdjustment}%
                </Badge>
              )}
            </div>
          )}

          {/* Reasoning */}
          <div className="space-y-1">
            <p className="text-xs font-medium flex items-center gap-1">
              <Info className="h-3 w-3" />
              Anledningar:
            </p>
            <ul className="text-xs space-y-1 ml-4">
              {modification.reasoning.map((reason, i) => (
                <li key={i} className="list-disc">{reason}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Alert>
  );
}
