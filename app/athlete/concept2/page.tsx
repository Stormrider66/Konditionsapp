// app/athlete/concept2/page.tsx
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils';
import { Concept2Dashboard } from '@/components/athlete/Concept2Dashboard';

export const metadata = {
  title: 'Concept2 | Star by Thomson',
  description: 'Concept2 Logbook data och analys',
};

export default async function AthleteConcept2Page() {
  const { clientId } = await requireAthleteOrCoachInAthleteMode();

  return (
    <div className="container mx-auto py-4 sm:py-6 px-4 sm:px-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Concept2</h1>
        <p className="text-muted-foreground text-sm">
          RowErg, SkiErg och BikeErg träningsdata
        </p>
      </div>

      <Concept2Dashboard clientId={clientId} />
    </div>
  );
}
