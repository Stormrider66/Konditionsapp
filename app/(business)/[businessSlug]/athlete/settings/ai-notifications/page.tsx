// app/(business)/[businessSlug]/athlete/settings/ai-notifications/page.tsx
/**
 * AI Notification Settings Page (Business Athlete Portal)
 *
 * Business-specific implementation that wraps the client component
 * with the correct basePath context.
 */

import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { BasePathProvider } from '@/lib/contexts/BasePathContext'
import AINotificationSettingsPage from '@/app/athlete/settings/ai-notifications/page'

interface BusinessAINotificationSettingsPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessAINotificationSettingsWrapper({ params }: BusinessAINotificationSettingsPageProps) {
  const { businessSlug } = await params
  const { user } = await requireAthleteOrCoachInAthleteMode()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const basePath = `/${businessSlug}`

  return (
    <BasePathProvider basePath={basePath}>
      <AINotificationSettingsPage />
    </BasePathProvider>
  )
}
