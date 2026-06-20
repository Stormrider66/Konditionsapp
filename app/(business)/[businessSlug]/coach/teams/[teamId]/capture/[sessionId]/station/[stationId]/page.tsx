import { notFound } from 'next/navigation'

import { TeamCaptureStationReceiver } from '@/components/coach/team-capture/TeamCaptureStationReceiver'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getAccessibleTeamCaptureSession } from '@/lib/team-capture/service'

interface PageProps {
  params: Promise<{
    businessSlug: string
    teamId: string
    sessionId: string
    stationId: string
  }>
}

export default async function TeamCaptureStationPage({ params }: PageProps) {
  const { businessSlug, teamId, sessionId, stationId } = await params
  const user = await requireCoach()
  const locale: 'en' | 'sv' = user.language === 'sv' ? 'sv' : 'en'

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) notFound()

  const session = await getAccessibleTeamCaptureSession(user.id, sessionId, businessSlug)
  if (!session || session.teamId !== teamId) notFound()

  const station = session.stations.find((item) => item.id === stationId)
  if (!station) notFound()

  return (
    <TeamCaptureStationReceiver
      businessSlug={businessSlug}
      teamId={teamId}
      locale={locale}
      initialSession={serialize(session)}
      station={serialize(station)}
    />
  )
}

function serialize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
