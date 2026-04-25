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

export const metadata = {
  title: 'Mina PR | Athlete',
  description: 'Aktuella 1RM per övning',
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

  return (
    <div className="container mx-auto py-6 px-4 max-w-3xl">
      <AthleteStrengthPRTable />
    </div>
  )
}
