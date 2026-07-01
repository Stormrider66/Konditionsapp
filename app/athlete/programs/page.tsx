// app/athlete/programs/page.tsx
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { getUserPrimaryBusinessSlug } from '@/lib/business-context'
import { AthleteProgramsView } from './programs-view'

export default async function AthleteProgramsPage() {
  const { user, clientId } = await requireAthleteOrCoachInAthleteMode()
  const businessSlug = await getUserPrimaryBusinessSlug(user.id)

  return (
    <AthleteProgramsView
      clientId={clientId}
      basePath={businessSlug ? `/${businessSlug}` : ''}
      showImport={!!businessSlug}
    />
  )
}
