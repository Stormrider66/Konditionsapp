'use client';

/**
 * Workout Modification Banner
 *
 * Displays when a workout has been modified based on readiness assessment
 */

import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, TrendingDown, Info } from 'lucide-react';
import { useTranslations } from '@/i18n/client';

interface ModificationBannerProps {
  modification: {
    decision: 'PROCEED_NORMAL' | 'REDUCE_INTENSITY' | 'REDUCE_VOLUME' | 'EASY_DAY' | 'REST';
    reasoning: string[];
    intensityAdjustment?: number;
    volumeAdjustment?: number;
    originalWorkout?: unknown;
    modifiedWorkout?: unknown;
  };
}

export function ModificationBanner({ modification }: ModificationBannerProps) {
  const t = useTranslations('components.modificationBanner');

  if (modification.decision === 'PROCEED_NORMAL') {
    return null; // No modification needed
  }

  const getAlertVariant = (decision: string): 'default' | 'destructive' => {
    if (decision === 'REST') return 'destructive';
    return 'default';
  };

  const getSeverityClass = (decision: string): string => {
    if (decision === 'EASY_DAY' || decision === 'REDUCE_VOLUME') {
      return 'border-yellow-300 text-yellow-800 dark:border-yellow-700 dark:text-yellow-200';
    }
    return '';
  };

  const getIcon = (decision: string) => {
    if (decision === 'REST') return <AlertCircle className="h-5 w-5" />;
    return <TrendingDown className="h-5 w-5" />;
  };

  const getTitle = (decision: string): string => {
    switch (decision) {
      case 'REDUCE_INTENSITY':
        return t('titles.reduceIntensity')
      case 'REDUCE_VOLUME':
        return t('titles.reduceVolume')
      case 'EASY_DAY':
        return t('titles.easyDay')
      case 'REST':
        return t('titles.rest')
      default:
        return t('titles.default')
    }
  };

  const getDescription = (decision: string): string => {
    switch (decision) {
      case 'REDUCE_INTENSITY':
        return t('descriptions.reduceIntensity')
      case 'REDUCE_VOLUME':
        return t('descriptions.reduceVolume')
      case 'EASY_DAY':
        return t('descriptions.easyDay')
      case 'REST':
        return t('descriptions.rest')
      default:
        return t('descriptions.default')
    }
  };

  return (
    <Alert variant={getAlertVariant(modification.decision)} className={`mb-4 ${getSeverityClass(modification.decision)}`}>
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
                  {t('intensity', { value: modification.intensityAdjustment })}
                </Badge>
              )}
              {modification.volumeAdjustment && modification.volumeAdjustment < 0 && (
                <Badge variant="outline" className="text-xs">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  {t('volume', { value: modification.volumeAdjustment })}
                </Badge>
              )}
            </div>
          )}

          {/* Reasoning */}
          <div className="space-y-1">
            <p className="text-xs font-medium flex items-center gap-1">
              <Info className="h-3 w-3" />
              {t('reasons')}
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
