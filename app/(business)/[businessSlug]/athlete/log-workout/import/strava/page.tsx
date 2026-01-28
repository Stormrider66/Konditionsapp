// app/(business)/[businessSlug]/athlete/log-workout/import/strava/page.tsx
import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import StravaImportPage from '@/app/athlete/log-workout/import/strava/page'

interface BusinessStravaImportPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessStravaImportPage({ params }: BusinessStravaImportPageProps) {
  const { businessSlug } = await params
  const { user } = await requireAthleteOrCoachInAthleteMode()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  return <StravaImportPage />
}
