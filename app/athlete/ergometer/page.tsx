import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils';
import { ErgometerDashboard } from '@/components/athlete/ErgometerDashboard';
import { getTranslations } from '@/i18n/server'

export async function generateMetadata() {
  const t = await getTranslations('metadata.athlete.ergometer')

  return {
    title: t('title'),
    description: t('description'),
  }
}

export default async function AthleteErgometerPage() {
  const t = await getTranslations('pages.athlete.ergometer')
  const { clientId } = await requireAthleteOrCoachInAthleteMode();

  return (
    <div className="container mx-auto py-4 sm:py-6 px-4 sm:px-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">
          {t('subtitle')}
        </p>
      </div>

      <ErgometerDashboard clientId={clientId} />
    </div>
  );
}
