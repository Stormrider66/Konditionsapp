// app/(business)/[businessSlug]/athlete/video-analysis/page.tsx
import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { AthleteVideoAnalysisView } from '@/app/athlete/video-analysis/video-analysis-view'

interface BusinessVideoAnalysisPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessVideoAnalysisPage({ params }: BusinessVideoAnalysisPageProps) {
  const { businessSlug } = await params
  const { user, clientId } = await requireAthleteOrCoachInAthleteMode()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  return (
    <AthleteVideoAnalysisView
      clientId={clientId}
      basePath={`/${businessSlug}`}
    />
  )
}
