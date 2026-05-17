/**
 * Self-Reported Lactate Entry Page (Athlete Portal)
 *
 * Submit lactate test results with:
 * - Multi-stage data entry
 * - Speed/power/pace input
 * - Heart rate and lactate values
 * - Photo verification
 * - Automatic validation
 */

import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils';
import { SelfReportedLactateForm } from '@/components/athlete/lactate/SelfReportedLactateForm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { getTranslations } from '@/i18n/server';

export default async function NewLactateEntryPage() {
  const t = await getTranslations('pages.lactateEntry');
  const basePath = '' // Standard athlete route
  const { clientId } = await requireAthleteOrCoachInAthleteMode();

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('description')}
        </p>
      </div>

      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <p className="font-medium mb-1">{t('tips.title')}</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>{t('tips.stageDuration')}</li>
            <li>{t('tips.measureImmediately')}</li>
            <li>{t('tips.increaseGradually')}</li>
            <li>{t('tips.minimumStages')}</li>
            <li>{t('tips.photoVerification')}</li>
          </ul>
        </AlertDescription>
      </Alert>

      <SelfReportedLactateForm clientId={clientId} basePath={basePath} />
    </div>
  );
}
