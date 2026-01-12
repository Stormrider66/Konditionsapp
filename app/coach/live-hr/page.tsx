/**
 * Live HR Dashboard Page
 *
 * Displays list of sessions or allows creating a new one.
 */

import { Suspense } from 'react'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Radio, Users, Clock } from 'lucide-react'
import Link from 'next/link'
import { LiveHRSessionList } from './SessionList'

export default async function LiveHRPage() {
  const user = await requireCoach()

  // Fetch coach's teams
  const teams = await prisma.team.findMany({
    where: { userId: user.id },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
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
