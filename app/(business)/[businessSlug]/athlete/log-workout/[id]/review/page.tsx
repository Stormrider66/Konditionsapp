// app/(business)/[businessSlug]/athlete/log-workout/[id]/review/page.tsx
import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import ReviewPage from '@/app/athlete/log-workout/[id]/review/page'

interface BusinessReviewPageProps {
  params: Promise<{ businessSlug: string; id: string }>
}

export default async function BusinessReviewPage({ params }: BusinessReviewPageProps) {
  const { businessSlug, id } = await params
  const { user } = await requireAthleteOrCoachInAthleteMode()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  return <ReviewPage params={Promise.resolve({ id })} />
}
