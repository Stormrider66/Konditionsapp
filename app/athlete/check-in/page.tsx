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
import { prisma } from '@/lib/prisma';

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
    <div className="container max-w-2xl mx-auto py-8 px-4 sm:px-6">
      <div className="mb-10 text-center animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className="text-4xl font-black mb-4 tracking-tighter text-slate-900 dark:text-white uppercase transition-colors">
          Daglig <span className="text-blue-600 dark:text-blue-500 transition-colors">Check-in</span>
        </h1>
        <p className="text-slate-600 dark:text-slate-400 font-medium max-w-md mx-auto transition-colors">
          Ta 60 sekunder för att logga ditt mående. Vi anpassar din träning i realtid baserat på din återhämtning.
        </p>
      </div>

      <DailyCheckInForm clientId={client.id} variant="glass" />
    </div>
  );
}
