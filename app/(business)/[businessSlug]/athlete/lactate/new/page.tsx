// app/(business)/[businessSlug]/athlete/lactate/new/page.tsx
/**
 * Self-Reported Lactate Entry Page (Business Athlete Portal)
 *
 * Business-specific implementation with basePath.
 */

import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { SelfReportedLactateForm } from '@/components/athlete/lactate/SelfReportedLactateForm'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info } from 'lucide-react'
import { getTranslations } from '@/i18n/server'

interface BusinessLactateNewPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessLactateNewPage({ params }: BusinessLactateNewPageProps) {
  const { businessSlug } = await params
  const t = await getTranslations('athletePages.lactateNew')
  const { user, clientId } = await requireAthleteOrCoachInAthleteMode()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const basePath = `/${businessSlug}`

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
        <p className="text-muted-foreground">
          {t('description')}
        </p>
      </div>

      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <p className="font-medium mb-1">{t('tips.title')}</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>{t('tips.stageLength')}</li>
            <li>{t('tips.measureAfterStage')}</li>
            <li>{t('tips.increaseGradually')}</li>
            <li>{t('tips.minimumStages')}</li>
            <li>{t('tips.photoVerification')}</li>
          </ul>
        </AlertDescription>
      </Alert>

      <SelfReportedLactateForm clientId={clientId} basePath={basePath} />
    </div>
  )
}
