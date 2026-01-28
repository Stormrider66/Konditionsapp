// app/(business)/[businessSlug]/athlete/wod/[id]/page.tsx
/**
 * WOD Execution Page (Business Athlete Portal)
 *
 * Business-specific implementation that wraps the client component
 * with the correct basePath context.
 */

import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { BasePathProvider } from '@/lib/contexts/BasePathContext'
import WODExecutionPage from '@/app/athlete/wod/[id]/page'

interface BusinessWODExecutionPageProps {
  params: Promise<{
    businessSlug: string
    id: string
  }>
}

export default async function BusinessWODExecutionWrapper({ params }: BusinessWODExecutionPageProps) {
  const { businessSlug, id } = await params
  const { user } = await requireAthleteOrCoachInAthleteMode()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const basePath = `/${businessSlug}`

  // Pass params as a Promise to the client component
  return (
    <BasePathProvider basePath={basePath}>
      <WODExecutionPage params={Promise.resolve({ id })} />
    </BasePathProvider>
  )
}
