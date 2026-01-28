// app/(business)/[businessSlug]/athlete/log-workout/manual/page.tsx
import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import ManualFormPage from '@/app/athlete/log-workout/manual/page'

interface BusinessManualFormPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessManualFormPage({ params }: BusinessManualFormPageProps) {
  const { businessSlug } = await params
  const { user } = await requireAthleteOrCoachInAthleteMode()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  return <ManualFormPage />
}
