// app/(business)/[businessSlug]/coach/hybrid-studio/page.tsx
/**
 * Business-scoped Hybrid Studio Page
 *
 * Main page for creating and managing hybrid workouts (CrossFit, HYROX, functional fitness).
 */

import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { HybridStudioClient } from '@/components/hybrid-studio/HybridStudioClient'
import { Skeleton } from '@/components/ui/skeleton'

interface PageProps {
  params: Promise<{
    businessSlug: string
  }>
}

export default async function BusinessHybridStudioPage({ params }: PageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <Suspense fallback={<HybridStudioSkeleton />}>
        <HybridStudioClient />
      </Suspense>
    </div>
  )
}

function HybridStudioSkeleton() {
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
