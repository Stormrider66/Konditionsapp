import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import { getStaffPermissions } from '@/lib/permissions/assistant-coach'
import { getAccessibleTeamWhere } from '@/lib/coach/team-access'
import { TestOverviewClient } from '@/components/coach/test-overview/TestOverviewClient'
import { BarChart3 } from 'lucide-react'

interface PageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function TestOverviewPage({ params }: PageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) notFound()

  const permissions = await getStaffPermissions(user.id, businessSlug)

  // Get teams the user can access
  const teamFilter = await getAccessibleTeamWhere(user.id, businessSlug)

  const teams = await prisma.team.findMany({
    where: teamFilter,
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  // SIMCA access: OWNER, ADMIN, COACH, PHYSICAL_TRAINER
  const canAccessSimca = ['OWNER', 'ADMIN', 'COACH', 'PHYSICAL_TRAINER'].includes(permissions.role)

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 dark:text-white">
          <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6" />
          Testöversikt
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Resultat, jämförelser och utveckling över tid
        </p>
      </div>

      <TestOverviewClient
        teams={teams}
        businessSlug={businessSlug}
        canAccessSimca={canAccessSimca}
      />
    </div>
  )
}
