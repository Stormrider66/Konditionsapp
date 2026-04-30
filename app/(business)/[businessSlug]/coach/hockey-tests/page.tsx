import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { prisma } from '@/lib/prisma'
import { getStaffPermissions } from '@/lib/permissions/assistant-coach'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HockeyTestForm } from '@/components/coach/hockey-tests/HockeyTestForm'
import { HockeyTestResults } from '@/components/coach/hockey-tests/HockeyTestResults'
import { Button } from '@/components/ui/button'
import { BarChart3, FlaskConical, Shield } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ businessSlug: string }>
}

export default async function HockeyTestsPage({ params }: PageProps) {
  const { businessSlug } = await params
  const user = await requireCoach()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) notFound()

  const permissions = await getStaffPermissions(user.id, businessSlug)

  // Get teams and clients the user can access
  const teamFilter = permissions.isTeamScoped && permissions.assignedTeamIds.length > 0
    ? { id: { in: permissions.assignedTeamIds } }
    : { userId: user.id }

  const teams = await prisma.team.findMany({
    where: teamFilter,
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  const clients = await prisma.client.findMany({
    where: permissions.isTeamScoped
      ? { teamId: { in: permissions.assignedTeamIds } }
      : { userId: user.id },
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
            Fysiska tester - Ishockey
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Hockeysession med MuscleLab, styrka, hopp, beep test och istester
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/${businessSlug}/coach/test-overview`}>
            <Button variant="outline" size="sm">
              <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
              Testöversikt
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
          {canRunTests && <TabsTrigger value="new">Nytt test</TabsTrigger>}
          <TabsTrigger value="results">Resultat</TabsTrigger>
        </TabsList>

        {canRunTests && (
          <TabsContent value="new">
            <HockeyTestForm clients={clients} teams={teams} />
          </TabsContent>
        )}

        <TabsContent value="results">
          <HockeyTestResults teams={teams} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
