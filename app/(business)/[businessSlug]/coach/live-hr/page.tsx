// app/(business)/[businessSlug]/coach/live-hr/page.tsx
/**
 * Business-scoped Live HR Dashboard Page
 */

import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getCoachScopedIds } from '@/lib/coach/scoping'
import { getAccessibleTeamWhere } from '@/lib/coach/team-access'
import { prisma } from '@/lib/prisma'
import { Skeleton } from '@/components/ui/skeleton'
import { Radio } from 'lucide-react'
import { LiveHRSessionList } from '@/components/coach/live-hr/SessionList'
import { getTranslations } from '@/i18n/server'
import { RolePageFrame, RolePageHeader, roleSkeletonClass } from '@/components/layouts/role-shell/RolePage'

interface PageProps {
  params: Promise<{
    businessSlug: string
  }>
}

export default async function BusinessLiveHRPage({ params }: PageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()
  const t = await getTranslations('coach.pages.liveHr')

  // Validate business membership
  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  // Fetch coach's teams
  const teamWhere = await getAccessibleTeamWhere(user.id, businessSlug)
  const teams = await prisma.team.findMany({
    where: teamWhere,
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
  const coachIds = await getCoachScopedIds(user.id, membership.businessId, membership.role)
  const teamIds = teams.map((team) => team.id)
  const athletes = await prisma.client.findMany({
    where: {
      businessId: membership.businessId,
      OR: [
        { userId: { in: coachIds } },
        ...(teamIds.length > 0 ? [{ teamId: { in: teamIds } }] : []),
      ],
    },
    select: {
      id: true,
      name: true,
      team: { select: { name: true } },
    },
    orderBy: { name: 'asc' },
  })

  return (
    <RolePageFrame maxWidth="wide">
      <RolePageHeader
        eyebrow={t('eyebrow')}
        title={(
          <span className="inline-flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md border border-red-100 bg-red-50 text-red-600 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              <Radio className="h-5 w-5" />
            </span>
            {t('title')}
          </span>
        )}
        description={t('description')}
      />

      <Suspense fallback={<SessionListSkeleton />}>
        <LiveHRSessionList teams={teams} athletes={athletes} />
      </Suspense>
    </RolePageFrame>
  )
}

function SessionListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Skeleton className={roleSkeletonClass('h-10 w-40')} />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className={roleSkeletonClass('h-32')} />
        ))}
      </div>
    </div>
  )
}
