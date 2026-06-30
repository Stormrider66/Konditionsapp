import { notFound } from 'next/navigation'

import { TeamCaptureControlRoom } from '@/components/coach/team-capture/TeamCaptureControlRoom'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getAccessibleTeamCaptureSession } from '@/lib/team-capture/service'
import { resolveAthleteHrZones, type LiveHrZones } from '@/lib/cardio/athlete-hr-zones'

interface PageProps {
  params: Promise<{
    businessSlug: string
    teamId: string
    sessionId: string
  }>
}

export default async function TeamCaptureSessionPage({ params }: PageProps) {
  const { businessSlug, teamId, sessionId } = await params
  const user = await requireCoach()
  const locale: 'en' | 'sv' = user.language === 'sv' ? 'sv' : 'en'

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) notFound()

  const session = await getAccessibleTeamCaptureSession(user.id, sessionId, businessSlug)
  if (!session || session.teamId !== teamId) notFound()

  // Resolve each athlete's HR zones once (they don't change mid-session) so the
  // live grid can map bpm → zone for the HR target cue. Best-effort per athlete.
  const uniqueClientIds = [...new Set(session.participants.map((p) => p.clientId))]
  const hrZoneEntries = await Promise.all(
    uniqueClientIds.map(async (clientId) => {
      const zones = await resolveAthleteHrZones(clientId).catch(() => null)
      return [clientId, zones] as const
    }),
  )
  const hrZonesByClient: Record<string, LiveHrZones | null> = Object.fromEntries(hrZoneEntries)

  return (
    <TeamCaptureControlRoom
      businessSlug={businessSlug}
      teamId={teamId}
      locale={locale}
      initialSession={serialize(session)}
      hrZonesByClient={hrZonesByClient}
    />
  )
}

function serialize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
