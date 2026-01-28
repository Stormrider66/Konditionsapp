// app/(business)/[businessSlug]/athlete/messages/page.tsx
import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import AthleteMessagesPage from '@/app/athlete/messages/page'

interface BusinessMessagesPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessMessagesPage({ params }: BusinessMessagesPageProps) {
  const { businessSlug } = await params
  const { user } = await requireAthleteOrCoachInAthleteMode()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  return <AthleteMessagesPage />
}
