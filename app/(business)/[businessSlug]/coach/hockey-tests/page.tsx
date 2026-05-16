import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import { getStaffPermissions } from '@/lib/permissions/assistant-coach'
import { getStaffRolePreview } from '@/lib/permissions/role-preview-server'
import { getAccessibleTeamWhere } from '@/lib/coach/team-access'
import { getCoachScopedIds } from '@/lib/coach/scoping'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HockeyTestForm } from '@/components/coach/hockey-tests/HockeyTestForm'
import { HockeyTestResults } from '@/components/coach/hockey-tests/HockeyTestResults'
import { Button } from '@/components/ui/button'
import { BarChart3, FlaskConical, Shield } from 'lucide-react'
import Link from 'next/link'
import { getTranslations } from '@/i18n/server'

interface PageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function HockeyTestsPage({ params }: PageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()
  const t = await getTranslations('coach.pages.hockeyTests')

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) notFound()

  const previewRole = await getStaffRolePreview(user.id)
  const permissions = await getStaffPermissions(user.id, businessSlug, { roleOverride: previewRole })

  const coachIds = await getCoachScopedIds(user.id, membership.businessId, membership.role)
  const teamFilter = await getAccessibleTeamWhere(user.id, businessSlug)

  const teams = await prisma.team.findMany({
    where: teamFilter,
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  const clients = await prisma.client.findMany({
    where: permissions.isTeamScoped
      ? {
          teamId: { in: permissions.assignedTeamIds },
          businessId: membership.businessId,
        }
      : {
          businessId: membership.businessId,
          userId: { in: coachIds },
        },
    select: { id: true, name: true, teamId: true },
    orderBy: { name: 'asc' },
  })

  const canRunTests = permissions.canRunTests

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-5xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 dark:text-white">
            <Shield className="h-5 w-5 sm:h-6 sm:w-6" />
            {t('title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('description')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/${businessSlug}/coach/test-overview`}>
            <Button variant="outline" size="sm">
              <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
              {t('testOverview')}
            </Button>
          </Link>
          {teams[0] && (
            <Link href={`/${businessSlug}/coach/teams/${teams[0].id}/multivariate`}>
              <Button variant="outline" size="sm">
                <FlaskConical className="h-3.5 w-3.5 mr-1.5" />
                MVA/SIMCA
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Tabs defaultValue={canRunTests ? 'new' : 'results'} className="space-y-4">
        <TabsList>
          {canRunTests && <TabsTrigger value="new">{t('tabs.new')}</TabsTrigger>}
          <TabsTrigger value="results">{t('tabs.results')}</TabsTrigger>
        </TabsList>

        {canRunTests && (
          <TabsContent value="new">
            <HockeyTestForm clients={clients} teams={teams} businessSlug={businessSlug} />
          </TabsContent>
        )}

        <TabsContent value="results">
          <HockeyTestResults teams={teams} businessSlug={businessSlug} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
