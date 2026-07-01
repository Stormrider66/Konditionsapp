// app/(business)/[businessSlug]/athlete/concept2/page.tsx
import { notFound } from 'next/navigation'
import { Waves } from 'lucide-react'
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
      <div className="mb-6 flex items-start gap-4">
        <div className="p-3 bg-orange-100 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-2xl shadow-xl shadow-orange-500/5 transition-colors">
          <Waves className="h-8 w-8 text-orange-600 dark:text-orange-400 transition-colors" />
        </div>
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold italic uppercase tracking-tight leading-none mb-1 text-slate-900 dark:text-white transition-colors">Concept2</h1>
          <p className="text-slate-600 dark:text-slate-400 font-medium transition-colors">
            {t('description')}
          </p>
        </div>
      </div>

      <Concept2Dashboard clientId={clientId} />
    </div>
  )
}
