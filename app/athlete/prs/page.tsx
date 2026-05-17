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

  return (
    <div className="container mx-auto py-6 px-4 max-w-3xl">
      <AthleteStrengthPRTable />
    </div>
  )
}
