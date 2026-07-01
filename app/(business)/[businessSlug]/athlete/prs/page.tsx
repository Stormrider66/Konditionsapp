// app/(business)/[businessSlug]/athlete/prs/page.tsx
/**
 * Business athlete-side "My PRs" page
 *
 * Read-only view of the athlete's own OneRepMaxHistory entries. Pairs
 * with the coach-side strength PR system: when the coach prescribes
 * "% av 1RM", that resolves against values the athlete can now
 * actually see and verify here.
 */

import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { AthleteStrengthPRTable } from '@/components/athlete/strength/AthleteStrengthPRTable'
import { getTranslations } from '@/i18n/server'

export async function generateMetadata() {
  const t = await getTranslations('athletePages.prs')
  return {
    title: t('metadataTitle'),
    description: t('metadataDescription'),
  }
}

export const dynamic = 'force-dynamic'

interface BusinessPrsPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessAthletePrsPage({ params }: BusinessPrsPageProps) {
  const { businessSlug } = await params
  const auth = await requireAthleteOrCoachInAthleteMode()

  const membership = await validateBusinessMembership(auth.user.id, businessSlug)
  if (!membership) {
    notFound()
  }

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
