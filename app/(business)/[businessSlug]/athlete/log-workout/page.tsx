// app/(business)/[businessSlug]/athlete/log-workout/page.tsx
/**
 * Log Workout Page (Business Athlete Portal)
 *
 * Business-specific implementation that wraps the client component
 * with the correct basePath context.
 */

import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { BasePathProvider } from '@/lib/contexts/BasePathContext'
import LogWorkoutPage from '@/app/athlete/log-workout/page'

interface BusinessLogWorkoutPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessLogWorkoutPage({ params }: BusinessLogWorkoutPageProps) {
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
      <LogWorkoutPage />
    </BasePathProvider>
  )
}
