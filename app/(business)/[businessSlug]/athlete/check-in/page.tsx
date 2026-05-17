// app/(business)/[businessSlug]/athlete/check-in/page.tsx
/**
 * Daily Check-In Page (Business Athlete Portal)
 *
 * Quick daily check-in (<2 minutes) for:
 * - HRV (optional)
 * - RHR (optional)
 * - Wellness questionnaire (7 questions)
 */

import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { DailyCheckInForm } from '@/components/athlete/DailyCheckInForm'
import { getTranslations } from '@/i18n/server'

interface BusinessCheckInPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessCheckInPage({ params }: BusinessCheckInPageProps) {
  const { businessSlug } = await params
  const t = await getTranslations('athletePages.checkIn')
  const { user, clientId } = await requireAthleteOrCoachInAthleteMode()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const basePath = `/${businessSlug}`

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4 sm:px-6">
      <div className="mb-10 text-center animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className="text-2xl sm:text-4xl font-black mb-4 tracking-tighter text-slate-900 dark:text-white uppercase transition-colors">
          {t('titlePrefix')} <span className="text-blue-600 dark:text-blue-500 transition-colors">{t('titleAccent')}</span>
        </h1>
        <p className="text-slate-600 dark:text-slate-400 font-medium max-w-md mx-auto transition-colors">
          {t('description')}
        </p>
      </div>

      <DailyCheckInForm clientId={clientId} variant="glass" basePath={basePath} />
    </div>
  )
}
