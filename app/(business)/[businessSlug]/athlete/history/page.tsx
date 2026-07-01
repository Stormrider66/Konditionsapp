// app/(business)/[businessSlug]/athlete/history/page.tsx
import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { AthleteHistoryView } from '@/app/athlete/history/history-view'

interface BusinessHistoryPageProps {
  params: Promise<{ businessSlug: string }>
  searchParams: Promise<{
    timeframe?: string
    type?: string
  }>
}

export default async function BusinessWorkoutHistoryPage({ params, searchParams }: BusinessHistoryPageProps) {
  const { businessSlug } = await params
  const sp = await searchParams
  const { user, clientId } = await requireAthleteOrCoachInAthleteMode()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  return (
    <AthleteHistoryView
      userId={user.id}
      clientId={clientId}
      timeframeParam={sp.timeframe}
      typeParam={sp.type}
      basePath={`/${businessSlug}`}
    />
  )
}
