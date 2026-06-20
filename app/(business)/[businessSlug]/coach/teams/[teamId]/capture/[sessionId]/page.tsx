import { notFound } from 'next/navigation'

import { TeamCaptureControlRoom } from '@/components/coach/team-capture/TeamCaptureControlRoom'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getAccessibleTeamCaptureSession } from '@/lib/team-capture/service'

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

  return (
    <TeamCaptureControlRoom
      businessSlug={businessSlug}
      teamId={teamId}
      locale={locale}
      initialSession={serialize(session)}
    />
  )
}

function serialize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
