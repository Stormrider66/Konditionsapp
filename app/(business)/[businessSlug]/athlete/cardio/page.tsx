// app/(business)/[businessSlug]/athlete/cardio/page.tsx
/**
 * Business Athlete Cardio Sessions Page
 *
 * Shows assigned cardio sessions, system templates, and session history.
 * Athletes can view their assigned sessions, browse templates (PRO+),
 * and start Focus Mode for execution.
 */

import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { getAthleteSelfServiceAccess } from '@/lib/auth/tier-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { AthleteCardioClient } from '@/components/athlete/cardio/AthleteCardioClient'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata = {
  title: 'Cardio Pass | Trainomics',
  description: 'Dina löppass, cykelpass och simpass',
}

interface BusinessCardioPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessCardioPage({ params }: BusinessCardioPageProps) {
  const { businessSlug } = await params
  const { user, clientId } = await requireAthleteOrCoachInAthleteMode()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const { enabled: canAccessTemplates } = await getAthleteSelfServiceAccess(clientId)

  return (
    <div className="container mx-auto py-6 px-4">
      <Suspense fallback={<CardioSkeleton />}>
        <AthleteCardioClient
          clientId={clientId}
          canAccessTemplates={canAccessTemplates}
        />
      </Suspense>
    </div>
  )
}

function CardioSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    </div>
  )
}
