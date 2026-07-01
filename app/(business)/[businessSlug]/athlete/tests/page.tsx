// app/(business)/[businessSlug]/athlete/tests/page.tsx
import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { AthleteTestsView } from '@/app/athlete/tests/tests-view'

interface BusinessTestsPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessAthleteTestsPage({ params }: BusinessTestsPageProps) {
  const { businessSlug } = await params
  const { user, clientId } = await requireAthleteOrCoachInAthleteMode()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  return (
    <AthleteTestsView
      clientId={clientId}
      basePath={`/${businessSlug}`}
    />
  )
}
