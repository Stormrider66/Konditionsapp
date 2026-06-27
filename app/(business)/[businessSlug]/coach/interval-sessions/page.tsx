/**
 * Business-scoped Interval Sessions List Page
 */

import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getAccessibleTeamWhere } from '@/lib/coach/team-access'
import { prisma } from '@/lib/prisma'
import { Skeleton } from '@/components/ui/skeleton'
import { Timer } from 'lucide-react'
import { RolePageFrame, RolePageHeader } from '@/components/layouts/role-shell/RolePage'
import { IntervalSessionList } from '@/components/coach/interval-session/IntervalSessionList'
import { CreateIntervalSessionDialog } from '@/components/coach/interval-session/CreateIntervalSessionDialog'

interface PageProps {
  params: Promise<{
    businessSlug: string
  }>
  searchParams: Promise<{ teamId?: string }>
}

export default async function IntervalSessionsPage({ params, searchParams }: PageProps) {
  const { businessSlug } = await params
  const { teamId } = await searchParams
  const user = await requireCoach()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const teamWhere = await getAccessibleTeamWhere(user.id, businessSlug)
  const teams = await prisma.team.findMany({
    where: teamWhere,
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <RolePageFrame maxWidth="wide">
      <RolePageHeader
        eyebrow="Coach"
        title={
          <span className="flex items-center gap-2">
            <Timer className="h-6 w-6 text-blue-600 dark:text-blue-300" />
            Intervallsessioner
          </span>
        }
        description="Tidtagning av intervaller med laguppstallning och laktatregistrering"
        actions={
          <CreateIntervalSessionDialog
            teams={teams}
            businessSlug={businessSlug}
            defaultTeamId={teamId}
            autoOpen={!!teamId}
          />
        }
      />

      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        }
      >
        <IntervalSessionList businessSlug={businessSlug} />
      </Suspense>
    </RolePageFrame>
  )
}
