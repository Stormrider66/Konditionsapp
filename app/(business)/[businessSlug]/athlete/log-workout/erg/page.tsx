import { notFound } from 'next/navigation'

import QuickErgSessionPage from '@/app/athlete/log-workout/erg/page'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'

interface BusinessQuickErgSessionPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessQuickErgSessionPage({ params }: BusinessQuickErgSessionPageProps) {
  const { businessSlug } = await params
  const { user } = await requireAthleteOrCoachInAthleteMode()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  return <QuickErgSessionPage />
}
