import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Activity } from 'lucide-react'
import { TeamTestsClient } from '@/components/coach/teams/TeamTestsClient'

interface TestsPageProps {
  params: Promise<{
    businessSlug: string
    teamId: string
  }>
}

export default async function TeamTestsPage({ params }: TestsPageProps) {
  const { businessSlug, teamId } = await params
  const user = await requireCoach()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const team = await getAccessibleTeam(user.id, teamId, businessSlug)

  if (!team) {
    notFound()
  }

  const basePath = `/${businessSlug}/coach`

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <Link href={`${basePath}/teams/${teamId}`}>
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tillbaka till lag
        </Button>
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <Activity className="h-6 w-6 text-purple-500" />
        <h1 className="text-2xl sm:text-3xl font-bold dark:text-white">Tester</h1>
        <Badge variant="secondary">{team.name}</Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Importera testpass från en testtabell, eller granska tidigare loggade tester.
      </p>

      <TeamTestsClient
        teamId={teamId}
        teamName={team.name}
        basePath={basePath}
        businessSlug={businessSlug}
      />
    </div>
  )
}
