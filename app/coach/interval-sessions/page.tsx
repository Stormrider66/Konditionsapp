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

export default async function IntervalSessionsPage() {
  const user = await requireCoach()

  const teams = await prisma.team.findMany({
    where: { userId: user.id },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 dark:text-white">
            <Timer className="h-8 w-8" />
            Intervallsessioner
          </h1>
          <p className="text-muted-foreground mt-1">
            Tidtagning av intervaller med laguppstallning och laktatregistrering
          </p>
        </div>
        <CreateIntervalSessionDialog teams={teams} />
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
