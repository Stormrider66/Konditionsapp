// app/athlete/tests/page.tsx
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { getUserPrimaryBusinessSlug } from '@/lib/business-context'
import { AthleteTestsView } from './tests-view'

export default async function AthleteTestsPage() {
  const { user, clientId } = await requireAthleteOrCoachInAthleteMode()
  const businessSlug = await getUserPrimaryBusinessSlug(user.id)

  return (
    <AthleteTestsView
      clientId={clientId}
      basePath={businessSlug ? `/${businessSlug}` : ''}
    />
  )
}
