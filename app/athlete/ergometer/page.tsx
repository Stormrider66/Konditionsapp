import { redirect } from 'next/navigation';
import { requireAthlete } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { ErgometerDashboard } from '@/components/athlete/ErgometerDashboard';

export const metadata = {
  title: 'Ergometer | Star by Thomson',
  description: 'Ergometertester, zoner och progression',
};

export default async function AthleteErgometerPage() {
  const user = await requireAthlete();

  // Get athlete account
  const athleteAccount = await prisma.athleteAccount.findUnique({
    where: { userId: user.id },
    select: { clientId: true },
  });

  if (!athleteAccount) {
    redirect('/login');
  }

  return (
    <div className="container mx-auto py-4 sm:py-6 px-4 sm:px-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Ergometertester</h1>
        <p className="text-muted-foreground text-sm">
          Rodd, SkiErg, BikeErg, Wattbike och Air Bike
        </p>
      </div>

      <ErgometerDashboard clientId={athleteAccount.clientId} />
    </div>
  );
}
