import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { getTeamRosterStatus } from '@/lib/coach/team-roster-status'
import { Users } from 'lucide-react'
import { TeamRosterTable } from '@/components/coach/teams/TeamRosterTable'
import { AddPlayersDialog } from '@/components/coach/teams/AddPlayersDialog'
import { getTranslations } from '@/i18n/server'
import { RolePageFrame, RolePageHeader, RolePanel } from '@/components/layouts/role-shell/RolePage'

interface TeamRosterPageProps {
  params: Promise<{
    businessSlug: string
    teamId: string
  }>
}

export default async function TeamRosterPage({ params }: TeamRosterPageProps) {
  const { businessSlug, teamId } = await params
  const t = await getTranslations('coach.pages.teamDetail')
  const user = await requireCoach()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const team = await getAccessibleTeam(user.id, teamId, businessSlug)
  if (!team) {
    notFound()
  }

  const members = await getTeamRosterStatus(teamId)

  return (
    <RolePageFrame>
      <RolePageHeader
        eyebrow={team.name}
        title={(
          <span className="inline-flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md border border-violet-100 bg-violet-50 text-violet-600 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300">
              <Users className="h-5 w-5" />
            </span>
            {t('roster.title', { count: members.length })}
          </span>
        )}
        description={t('roster.description')}
        actions={(
          <AddPlayersDialog
            teamId={teamId}
            teamName={team.name}
            basePath={`/${businessSlug}/coach`}
            importPath={`/${businessSlug}/coach/teams/${teamId}/import`}
          />
        )}
      />

      <RolePanel className="p-4 sm:p-6">
        <TeamRosterTable
          teamId={teamId}
          businessSlug={businessSlug}
          members={members}
        />
      </RolePanel>
    </RolePageFrame>
  )
}
