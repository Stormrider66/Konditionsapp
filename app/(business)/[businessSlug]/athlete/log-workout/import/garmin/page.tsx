// app/(business)/[businessSlug]/athlete/log-workout/import/garmin/page.tsx
import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import GarminImportPage from '@/app/athlete/log-workout/import/garmin/page'

interface BusinessGarminImportPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessGarminImportPage({ params }: BusinessGarminImportPageProps) {
  const { businessSlug } = await params
  const { user } = await requireAthleteOrCoachInAthleteMode()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  return <GarminImportPage />
}
