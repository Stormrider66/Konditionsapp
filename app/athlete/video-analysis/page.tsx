// app/athlete/video-analysis/page.tsx
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { getUserPrimaryBusinessSlug } from '@/lib/business-context'
import { AthleteVideoAnalysisView } from './video-analysis-view'

export default async function AthleteVideoAnalysisPage() {
  const { user, clientId } = await requireAthleteOrCoachInAthleteMode()
  const businessSlug = await getUserPrimaryBusinessSlug(user.id)

  return (
    <AthleteVideoAnalysisView
      clientId={clientId}
      basePath={businessSlug ? `/${businessSlug}` : ''}
    />
  )
}
