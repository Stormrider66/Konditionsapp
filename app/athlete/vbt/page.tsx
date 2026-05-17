// app/athlete/vbt/page.tsx
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils';
import { VBTDashboard } from '@/components/athlete/VBTDashboard';
import { getTranslations } from '@/i18n/server';

export async function generateMetadata() {
  const t = await getTranslations('metadata.athlete.vbt');

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function AthleteVBTPage() {
  const t = await getTranslations('pages.vbt');
  const { clientId } = await requireAthleteOrCoachInAthleteMode();

  return (
    <div className="container mx-auto py-4 sm:py-6 px-4 sm:px-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">VBT Data</h1>
        <p className="text-muted-foreground text-sm">
          {t('description')}
        </p>
      </div>

      <VBTDashboard clientId={clientId} />
    </div>
  );
}
