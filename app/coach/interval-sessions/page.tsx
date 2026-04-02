/**
 * Legacy Interval Sessions List Page (non-business coaches)
 */

import { Suspense } from 'react'
import { requireCoach } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { Skeleton } from '@/components/ui/skeleton'
import { Timer } from 'lucide-react'
import { IntervalSessionList } from '@/components/coach/interval-session/IntervalSessionList'
import { CreateIntervalSessionDialog } from '@/components/coach/interval-session/CreateIntervalSessionDialog'

interface PageProps {
  searchParams: Promise<{ teamId?: string }>
}

export default async function IntervalSessionsPage({ searchParams }: PageProps) {
  const user = await requireCoach()
  const { teamId } = await searchParams

  const teams = await prisma.team.findMany({
    where: { userId: user.id },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 sm:gap-3 dark:text-white">
            <Timer className="h-6 w-6 sm:h-8 sm:w-8 shrink-0" />
            Intervallsessioner
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Tidtagning av intervaller med laguppstallning och laktatregistrering
          </p>
        </div>
        <CreateIntervalSessionDialog
          teams={teams}
          defaultTeamId={teamId}
          autoOpen={!!teamId}
        />
      </div>

      <Suspense
        fallback={
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        }
      >
        <IntervalSessionList />
      </Suspense>
    </div>
  )
}
