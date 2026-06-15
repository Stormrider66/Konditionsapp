import { notFound } from 'next/navigation'

import { QuickErgHistoryPage } from '@/components/athlete/quick-erg/QuickErgHistoryPage'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'

interface BusinessQuickErgHistoryPageProps {
  params: Promise<{
    businessSlug: string
  }>
}

export default async function BusinessQuickErgHistoryPage({ params }: BusinessQuickErgHistoryPageProps) {
  const { businessSlug } = await params
  const { user } = await requireAthleteOrCoachInAthleteMode()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  return <QuickErgHistoryPage basePath={`/${businessSlug}`} />
}
