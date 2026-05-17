// app/(business)/[businessSlug]/athlete/injury-prevention/page.tsx
import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { InjuryPreventionDashboard } from '@/components/athlete/injury-prevention'
import { getTranslations } from '@/i18n/server'

export async function generateMetadata() {
  const t = await getTranslations('athletePages.injuryPrevention')
  return {
    title: t('metadataTitle'),
    description: t('metadataDescription'),
  }
}

interface BusinessInjuryPreventionPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessInjuryPreventionPage({ params }: BusinessInjuryPreventionPageProps) {
  const { businessSlug } = await params
  const { user } = await requireAthleteOrCoachInAthleteMode()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  return (
    <div className="container max-w-4xl py-8">
      <InjuryPreventionDashboard />
    </div>
  )
}
