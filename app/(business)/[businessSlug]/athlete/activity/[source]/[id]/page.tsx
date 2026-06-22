import { notFound } from 'next/navigation'

import { ActivityDetailPage } from '@/components/athlete/activity/ActivityDetailPage'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'

interface BusinessActivityDetailPageProps {
  params: Promise<{ businessSlug: string; source: string; id: string }>
}

export default async function BusinessActivityDetailPage({ params }: BusinessActivityDetailPageProps) {
  const { businessSlug, source, id } = await params
  const { user } = await requireAthleteOrCoachInAthleteMode()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  return <ActivityDetailPage source={source} id={id} basePath={`/${businessSlug}`} />
}
