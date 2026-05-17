// app/(business)/[businessSlug]/athlete/concept2/page.tsx
import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { Concept2Dashboard } from '@/components/athlete/Concept2Dashboard'
import { getTranslations } from '@/i18n/server'

export async function generateMetadata() {
  const t = await getTranslations('athletePages.concept2')
  return {
    title: t('metadataTitle'),
    description: t('metadataDescription'),
  }
}

interface BusinessConcept2PageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessConcept2Page({ params }: BusinessConcept2PageProps) {
  const { businessSlug } = await params
  const t = await getTranslations('athletePages.concept2')
  const { user, clientId } = await requireAthleteOrCoachInAthleteMode()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  return (
    <div className="container mx-auto py-4 sm:py-6 px-4 sm:px-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Concept2</h1>
        <p className="text-muted-foreground text-sm">
          {t('description')}
        </p>
      </div>

      <Concept2Dashboard clientId={clientId} />
    </div>
  )
}
