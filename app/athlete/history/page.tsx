// app/athlete/history/page.tsx
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { getUserPrimaryBusinessSlug } from '@/lib/business-context'
import { AthleteHistoryView } from './history-view'

interface HistoryPageProps {
  searchParams: Promise<{
    timeframe?: string
    type?: string
  }>
}

export default async function WorkoutHistoryPage({ searchParams }: HistoryPageProps) {
  const { user, clientId } = await requireAthleteOrCoachInAthleteMode()
  const params = await searchParams

  // Ensure links can route correctly in business-scoped setups
  const businessSlug = await getUserPrimaryBusinessSlug(user.id)

  return (
    <AthleteHistoryView
      userId={user.id}
      clientId={clientId}
      timeframeParam={params.timeframe}
      typeParam={params.type}
      basePath={businessSlug ? `/${businessSlug}` : ''}
    />
  )
}
