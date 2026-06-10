import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { getTranslations } from '@/i18n/server'
import { TeamChatPanel } from '@/components/coach/teams/TeamChatPanel'

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
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold dark:text-white">{t('chat.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('chat.subtitle')}</p>
      </div>
      <TeamChatPanel teamId={teamId} businessSlug={businessSlug} />
    </div>
  )
}
