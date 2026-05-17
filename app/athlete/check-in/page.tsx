/**
 * Daily Check-In Page (Athlete Portal)
 *
 * Quick daily check-in (<2 minutes) for:
 * - HRV (optional)
 * - RHR (optional)
 * - Wellness questionnaire (7 questions)
 */

import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils';
import { DailyCheckInForm } from '@/components/athlete/DailyCheckInForm';
import { getTranslations } from '@/i18n/server';

export default async function CheckInPage() {
  const t = await getTranslations('pages.checkIn');
  const { clientId } = await requireAthleteOrCoachInAthleteMode();

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4 sm:px-6">
      <div className="mb-10 text-center animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className="text-4xl font-black mb-4 tracking-tighter text-slate-900 dark:text-white uppercase transition-colors">
          {t('titlePrefix')} <span className="text-blue-600 dark:text-blue-500 transition-colors">{t('titleAccent')}</span>
        </h1>
        <p className="text-slate-600 dark:text-slate-400 font-medium max-w-md mx-auto transition-colors">
          {t('description')}
        </p>
      </div>

      <DailyCheckInForm clientId={clientId} variant="glass" />
    </div>
  );
}
