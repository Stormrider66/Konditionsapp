import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getAccessibleTeam } from '@/lib/coach/team-access'
import { TeamWorkoutMonitor } from '@/components/coach/teams/TeamWorkoutMonitor'
import { TeamLeaderboard } from '@/components/coach/leaderboards'

interface TeamFollowUpPageProps {
  params: Promise<{
    businessSlug: string
    teamId: string
  }>
}

// Adherence used to be split between four server-rendered stat cards and the
// TeamWorkoutMonitor panel — two queries with different windows, workout-type
// coverage and completion definitions, which produced contradictory headline
// numbers. The monitor is the canonical source (all broadcast types + interval
// sessions, team-scoped, windowed, with a per-player breakdown), so the cards
// were removed; the monitor now owns the headline stats and the missed-session
// follow-up.
export default async function TeamFollowUpPage({ params }: TeamFollowUpPageProps) {
  const { businessSlug, teamId } = await params
  const user = await requireCoach()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const accessibleTeam = await getAccessibleTeam(user.id, teamId, businessSlug)
  if (!accessibleTeam) {
    notFound()
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <TeamWorkoutMonitor teamId={teamId} businessSlug={businessSlug} />

      <div className="mt-8">
        <TeamLeaderboard teamId={teamId} />
      </div>
    </div>
  )
}
