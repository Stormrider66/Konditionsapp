import { notFound } from 'next/navigation'

import OutdoorRunPage from '@/app/athlete/log-workout/run/page'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'

interface BusinessOutdoorRunPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessOutdoorRunPage({ params }: BusinessOutdoorRunPageProps) {
  const { businessSlug } = await params
  const { user } = await requireAthleteOrCoachInAthleteMode()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  return <OutdoorRunPage />
}
