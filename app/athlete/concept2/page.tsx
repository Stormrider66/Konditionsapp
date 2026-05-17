// app/athlete/concept2/page.tsx
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils';
import { Concept2Dashboard } from '@/components/athlete/Concept2Dashboard';
import { getTranslations } from '@/i18n/server';

export async function generateMetadata() {
  const t = await getTranslations('metadata.athlete.concept2');

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function AthleteConcept2Page() {
  const t = await getTranslations('pages.concept2');
  const { clientId } = await requireAthleteOrCoachInAthleteMode();

  return (
    <div className="container mx-auto py-4 sm:py-6 px-4 sm:px-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Concept2</h1>
        <p className="text-muted-foreground text-sm">
          {t('description')}
        </p>
      </div>

      <Concept2Dashboard clientId={clientId} />
    </div>
  );
}
