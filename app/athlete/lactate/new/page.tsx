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

export default async function NewLactateEntryPage() {
  const basePath = '' // Standard athlete route
  const { clientId } = await requireAthleteOrCoachInAthleteMode();

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Rapportera laktatvärden</h1>
        <p className="text-muted-foreground">
          Registrera dina laktatvärden från ett test. Minst 4 steg krävs för D-max analys.
        </p>
      </div>

      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <p className="font-medium mb-1">Tips för bästa resultat:</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Varje steg ska vara 3 minuter långt</li>
            <li>Mät laktat direkt efter varje steg</li>
            <li>Öka intensiteten gradvis mellan stegen</li>
            <li>Minst 4 steg krävs, men 6-8 steg ger bättre analys</li>
            <li>Ta ett foto på laktatmätaren för verifiering</li>
          </ul>
        </AlertDescription>
      </Alert>

      <SelfReportedLactateForm clientId={clientId} basePath={basePath} />
    </div>
  );
}
