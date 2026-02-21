// app/(business)/[businessSlug]/athlete/settings/ai-info/page.tsx
import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import AthleteAIInfoPage from '@/app/athlete/settings/ai-info/page'

interface BusinessAthleteAIInfoPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessAthleteAIInfoWrapper({ params }: BusinessAthleteAIInfoPageProps) {
  const { businessSlug } = await params
  const { user } = await requireAthleteOrCoachInAthleteMode()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  return <AthleteAIInfoPage />
}
