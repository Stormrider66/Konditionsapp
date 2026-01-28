// app/(business)/[businessSlug]/athlete/log-workout/text/page.tsx
import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import TextInputPage from '@/app/athlete/log-workout/text/page'

interface BusinessTextInputPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessTextInputPage({ params }: BusinessTextInputPageProps) {
  const { businessSlug } = await params
  const { user } = await requireAthleteOrCoachInAthleteMode()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  return <TextInputPage />
}
