// app/(business)/[businessSlug]/athlete/log-workout/photo/page.tsx
import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import PhotoInputPage from '@/app/athlete/log-workout/photo/page'

interface BusinessPhotoInputPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessPhotoInputPage({ params }: BusinessPhotoInputPageProps) {
  const { businessSlug } = await params
  const { user } = await requireAthleteOrCoachInAthleteMode()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  return <PhotoInputPage />
}
