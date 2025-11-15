/**
 * Daily Check-In Page (Athlete Portal)
 *
 * Quick daily check-in (<2 minutes) for:
 * - HRV (optional)
 * - RHR (optional)
 * - Wellness questionnaire (7 questions)
 */

import { requireAthlete } from '@/lib/auth-utils';
import { DailyCheckInForm } from '@/components/athlete/DailyCheckInForm';
import prisma from '@/lib/prisma';

export default async function CheckInPage() {
  const user = await requireAthlete();

  // Get athlete's client ID
  const client = await prisma.client.findFirst({
    where: {
      athleteAccount: {
        userId: user.id
      }
    }
  });

  if (!client) {
    return (
      <div className="container max-w-2xl mx-auto py-8">
        <h1 className="text-3xl font-bold mb-4">Daglig incheckning</h1>
        <p className="text-muted-foreground">
          Ditt atletkonto är inte kopplat till en klient. Kontakta din tränare.
        </p>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Daglig incheckning</h1>
        <p className="text-muted-foreground">
          Ta 2 minuter för att rapportera hur du mår idag. Detta hjälper oss att anpassa din träning.
        </p>
      </div>

      <DailyCheckInForm clientId={client.id} />
    </div>
  );
}
