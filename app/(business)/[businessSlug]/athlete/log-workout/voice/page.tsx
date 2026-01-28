// app/(business)/[businessSlug]/athlete/log-workout/voice/page.tsx
import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import VoiceInputPage from '@/app/athlete/log-workout/voice/page'

interface BusinessVoiceInputPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessVoiceInputPage({ params }: BusinessVoiceInputPageProps) {
  const { businessSlug } = await params
  const { user } = await requireAthleteOrCoachInAthleteMode()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  return <VoiceInputPage />
}
