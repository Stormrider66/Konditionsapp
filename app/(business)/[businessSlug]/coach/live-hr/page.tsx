// app/(business)/[businessSlug]/coach/live-hr/page.tsx
/**
 * Business-scoped Live HR Dashboard Page
 */

import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import { Skeleton } from '@/components/ui/skeleton'
import { Radio } from 'lucide-react'
import { LiveHRSessionList } from '@/app/coach/live-hr/SessionList'

interface PageProps {
  params: Promise<{
    businessSlug: string
  }>
}

export default async function BusinessLiveHRPage({ params }: PageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  // Fetch coach's teams
  const teams = await prisma.team.findMany({
    where: { userId: user.id },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3 dark:text-white">
          <Radio className="h-8 w-8" />
          Live HR Streaming
        </h1>
        <p className="text-muted-foreground mt-1">
          Övervaka atleters puls i realtid under träningspass
        </p>
      </div>

      <Suspense fallback={<SessionListSkeleton />}>
        <LiveHRSessionList teams={teams} />
      </Suspense>
    </div>
  )
}

function SessionListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    </div>
  )
}
