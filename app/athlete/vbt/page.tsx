// app/athlete/vbt/page.tsx
import { redirect } from 'next/navigation';
import { requireAthlete } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { VBTDashboard } from '@/components/athlete/VBTDashboard';

export const metadata = {
  title: 'VBT Data | Star by Thomson',
  description: 'Velocity-Based Training data och analys',
};

export default async function AthleteVBTPage() {
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
        <h1 className="text-2xl font-bold">VBT Data</h1>
        <p className="text-muted-foreground text-sm">
          Velocity-Based Training - hastighetsbaserad styrketräning
        </p>
      </div>

      <VBTDashboard clientId={athleteAccount.clientId} />
    </div>
  );
}
