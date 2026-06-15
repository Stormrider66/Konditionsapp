import { notFound } from 'next/navigation'

import { QuickErgSessionDetailPage } from '@/components/athlete/quick-erg/QuickErgSessionDetailPage'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'

interface BusinessQuickErgSessionPageProps {
  params: Promise<{
    businessSlug: string
    id: string
  }>
}

export default async function BusinessQuickErgSessionPage({ params }: BusinessQuickErgSessionPageProps) {
  const { businessSlug, id } = await params
  const { user } = await requireAthleteOrCoachInAthleteMode()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  return <QuickErgSessionDetailPage id={id} basePath={`/${businessSlug}`} />
}
