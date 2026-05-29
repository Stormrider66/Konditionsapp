import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Users, Calendar, ShieldAlert } from 'lucide-react'
import { TeamDashboardClient } from '@/components/coach/teams/TeamDashboardClient'
import { TeamDayPrintButton } from '@/components/coach/teams/TeamDayPrintButton'
import { CreateTeamPlanDialog } from '@/components/coach/teams/CreateTeamPlanDialog'
import { AddPlayersDialog } from '@/components/coach/teams/AddPlayersDialog'
import { TeamTabNav } from '@/components/coach/teams/TeamTabNav'
import { getTranslations } from '@/i18n/server'
import { getSportLabelKey } from '@/lib/sports/catalog'

interface TeamLayoutProps {
  children: React.ReactNode
  params: Promise<{
    businessSlug: string
    teamId: string
  }>
}

export default async function TeamLayout({ children, params }: TeamLayoutProps) {
  const { businessSlug, teamId } = await params
  const t = await getTranslations('coach.pages.teamDetail')
  const tSports = await getTranslations('sports')
  const user = await requireCoach()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const accessibleTeam = await getAccessibleTeam(user.id, teamId, businessSlug)
  if (!accessibleTeam) {
    notFound()
  }

  const team = await prisma.team.findFirst({
    where: { id: teamId },
    select: {
      id: true,
      name: true,
      sportType: true,
      organization: { select: { name: true } },
      _count: { select: { members: true } },
    },
  })

  if (!team) {
    notFound()
  }

  const basePath = `/${businessSlug}/coach/teams`
  const teamBase = `${basePath}/${teamId}`
  const sportLabelKey = getSportLabelKey(team.sportType)

  return (
    <div>
      <div className="container mx-auto px-4 pt-8">
        <Link href={basePath}>
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('backToTeams')}
          </Button>
        </Link>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold dark:text-white">{team.name}</h1>
              {team.sportType && (
                <Badge variant="secondary" className="text-sm">
                  {sportLabelKey ? tSports(sportLabelKey) : team.sportType}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {t('playerCount', { count: team._count.members })}
              </span>
              {team.organization && (
                <span className="flex items-center gap-1">
                  <span className="text-sm">{team.organization.name}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline">
              <Link href={`${teamBase}/medical`}>
                <ShieldAlert className="mr-2 h-4 w-4" />
                Medical
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`${teamBase}/calendar`}>
                <Calendar className="mr-2 h-4 w-4" />
                {t('actions.teamCalendar')}
              </Link>
            </Button>
            <TeamDayPrintButton
              teamId={teamId}
              teamName={team.name}
              coachBasePath={`/${businessSlug}/coach`}
            />
            <AddPlayersDialog
              teamId={teamId}
              teamName={team.name}
              basePath={`/${businessSlug}/coach`}
              importPath={`${teamBase}/import`}
            />
            <CreateTeamPlanDialog
              teamId={teamId}
              teamName={team.name}
              businessSlug={businessSlug}
            />
            <TeamDashboardClient teamId={teamId} basePath={`/${businessSlug}`} />
          </div>
        </div>
      </div>

      <TeamTabNav base={teamBase} />

      {children}
    </div>
  )
}
