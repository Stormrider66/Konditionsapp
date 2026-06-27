import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getWritableTeam } from '@/lib/coach/team-access'
import { ImportRosterClient } from '@/components/coach/teams/ImportRosterClient'
import { getTranslations } from '@/i18n/server'
import { RolePageFrame, RolePageHeader } from '@/components/layouts/role-shell/RolePage'

interface PageProps {
  params: Promise<{ businessSlug: string; teamId: string }>
}

export default async function ImportRosterPage({ params }: PageProps) {
  const { businessSlug, teamId } = await params
  const user = await requireCoach()
  const t = await getTranslations('coach.pages.teamImport')

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) notFound()

  const team = await getWritableTeam(user.id, teamId, businessSlug, 'roster')
  if (!team) notFound()

  const teamPath = `/${businessSlug}/coach/teams/${teamId}`

  return (
    <RolePageFrame contentClassName="max-w-5xl">
      <RolePageHeader
        eyebrow={team.name}
        title={t('title')}
        description={t('description', { teamName: team.name })}
      />

      <ImportRosterClient
        teamId={team.id}
        teamName={team.name}
        teamPath={teamPath}
        businessSlug={businessSlug}
      />
    </RolePageFrame>
  )
}
