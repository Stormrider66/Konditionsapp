import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { getTeamRosterStatus } from '@/lib/coach/team-roster-status'
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
} from '@/components/ui/GlassCard'
import { Users } from 'lucide-react'
import { TeamRosterTable } from '@/components/coach/teams/TeamRosterTable'
import { getTranslations } from '@/i18n/server'

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

  const accessibleTeam = await getAccessibleTeam(user.id, teamId, businessSlug)
  if (!accessibleTeam) {
    notFound()
  }

  const members = await getTeamRosterStatus(teamId)

  return (
    <div className="container mx-auto py-8 px-4">
      <GlassCard glow="purple">
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2 dark:text-white">
            <Users className="h-5 w-5" />
            {t('roster.title', { count: members.length })}
          </GlassCardTitle>
          <GlassCardDescription>
            {t('roster.description')}
          </GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent>
          <TeamRosterTable
            teamId={teamId}
            businessSlug={businessSlug}
            members={members}
          />
        </GlassCardContent>
      </GlassCard>
    </div>
  )
}
