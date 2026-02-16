// app/(business)/[businessSlug]/athlete/hybrid/page.tsx
/**
 * Business Athlete Hybrid Workouts Page
 *
 * Shows assigned hybrid workouts, benchmark library, and workout history.
 */

import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { requireAthleteOrCoachInAthleteMode } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import { AthleteHybridClient } from '@/components/athlete/hybrid/AthleteHybridClient'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata = {
  title: 'Hybrid Pass | Trainomics',
  description: 'Dina CrossFit, HYROX och funktionella pass',
}

interface BusinessHybridPageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function BusinessHybridPage({ params }: BusinessHybridPageProps) {
  const { businessSlug } = await params
  const { user, clientId } = await requireAthleteOrCoachInAthleteMode()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const basePath = `/${businessSlug}`

  // Get subscription from User model
  const subscription = await prisma.subscription.findUnique({
    where: { userId: user.id },
    select: { tier: true },
  })
  const subscriptionTier = subscription?.tier || 'FREE'

  // Check if athlete can access templates (PRO or higher)
  const canAccessTemplates = ['PRO', 'ENTERPRISE'].includes(subscriptionTier)

  return (
    <div className="container mx-auto py-6 px-4">
      <Suspense fallback={<HybridSkeleton />}>
        <AthleteHybridClient
          clientId={clientId}
          canAccessTemplates={canAccessTemplates}
          basePath={basePath}
        />
      </Suspense>
    </div>
  )
}

function HybridSkeleton() {
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
