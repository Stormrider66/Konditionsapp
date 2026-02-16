// app/athlete/vbt/page.tsx
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils';
import { VBTDashboard } from '@/components/athlete/VBTDashboard';

export const metadata = {
  title: 'VBT Data | Trainomics',
  description: 'Velocity-Based Training data och analys',
};

export default async function AthleteVBTPage() {
  const { clientId } = await requireAthleteOrCoachInAthleteMode();

  return (
    <div className="container mx-auto py-4 sm:py-6 px-4 sm:px-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">VBT Data</h1>
        <p className="text-muted-foreground text-sm">
          Velocity-Based Training - hastighetsbaserad styrketräning
        </p>
      </div>

      <VBTDashboard clientId={clientId} />
    </div>
  );
}
