import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils';
import { Activity } from 'lucide-react'
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
      <div className="mb-6 flex items-start gap-4">
        <div className="p-3 bg-orange-100 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-2xl shadow-xl shadow-orange-500/5 transition-colors">
          <Activity className="h-8 w-8 text-orange-600 dark:text-orange-400 transition-colors" />
        </div>
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold italic uppercase tracking-tight leading-none mb-1 text-slate-900 dark:text-white transition-colors">{t('title')}</h1>
          <p className="text-slate-600 dark:text-slate-400 font-medium transition-colors">
            {t('subtitle')}
          </p>
        </div>
      </div>

      <ErgometerDashboard clientId={clientId} />
    </div>
  );
}
