import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { getTranslations } from '@/i18n/server'
import { TeamChatPanel } from '@/components/coach/teams/TeamChatPanel'
import { MessageCircle } from 'lucide-react'
import { RolePageFrame, RolePageHeader } from '@/components/layouts/role-shell/RolePage'

interface PageProps {
  params: Promise<{
    businessSlug: string
    teamId: string
  }>
}

export default async function TeamChatPage({ params }: PageProps) {
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

  return (
    <RolePageFrame contentClassName="max-w-4xl">
      <RolePageHeader
        eyebrow={team.name}
        title={(
          <span className="inline-flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">
              <MessageCircle className="h-5 w-5" />
            </span>
            {t('chat.title')}
          </span>
        )}
        description={t('chat.subtitle')}
      />
      <TeamChatPanel teamId={teamId} businessSlug={businessSlug} />
    </RolePageFrame>
  )
}
