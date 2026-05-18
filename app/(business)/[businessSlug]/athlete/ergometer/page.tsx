// app/(business)/[businessSlug]/athlete/ergometer/page.tsx
import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { ErgometerDashboard } from '@/components/athlete/ErgometerDashboard'
import { getTranslations } from '@/i18n/server'

export async function generateMetadata() {
  const t = await getTranslations('metadata.athlete.ergometer')

  return {
    title: t('title'),
    description: t('description'),
  }
}

interface BusinessErgometerPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessErgometerPage({ params }: BusinessErgometerPageProps) {
  const { businessSlug } = await params
  const { user, clientId } = await requireAthleteOrCoachInAthleteMode()
  const t = await getTranslations('pages.athlete.ergometer')

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  return (
    <div className="container mx-auto py-4 sm:py-6 px-4 sm:px-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">
          {t('subtitle')}
        </p>
      </div>

      <ErgometerDashboard clientId={clientId} />
    </div>
  )
}
