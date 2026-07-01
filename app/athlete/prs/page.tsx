// app/athlete/prs/page.tsx
/**
 * Legacy athlete-side "My PRs" page (no business slug). Mirrors the
 * business-scoped variant — same component, same data source, just
 * skips the business membership validation.
 */

import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { AthleteStrengthPRTable } from '@/components/athlete/strength/AthleteStrengthPRTable'
import { getTranslations } from '@/i18n/server'

export async function generateMetadata() {
  const t = await getTranslations('metadata.athlete.prs')

  return {
    title: t('title'),
    description: t('description'),
  }
}

export const dynamic = 'force-dynamic'

export default async function AthletePrsPage() {
  await requireAthleteOrCoachInAthleteMode()
  const t = await getTranslations('athletePages.prs')

  return (
    <div className="container mx-auto py-6 px-4 max-w-3xl">
      <div className="mb-10 space-y-2 animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white tracking-tight uppercase italic leading-none">
          {t('titlePrefix')}<span className="text-orange-600 dark:text-orange-500"> {t('titleAccent')}</span>
        </h1>
        <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px]">
          {t('description')}
        </p>
      </div>
      <AthleteStrengthPRTable />
    </div>
  )
}
