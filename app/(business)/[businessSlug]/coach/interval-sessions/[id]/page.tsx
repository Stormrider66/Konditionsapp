/**
 * Live Interval Session Page
 *
 * Main timing interface for running interval sessions.
 */

import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import {
  getSession,
  getSessionStreamData,
  getAvailableClients,
} from '@/lib/interval-session/session-service'
import { IntervalSessionDashboard } from '@/components/coach/interval-session/IntervalSessionDashboard'

interface PageProps {
  params: Promise<{
    businessSlug: string
    id: string
  }>
}

export default async function IntervalSessionPage({ params }: PageProps) {
  const { businessSlug, id } = await params
  const user = await requireCoach()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const session = await getSession(id)

  if (!session || session.coachId !== user.id) {
    notFound()
  }

  const streamData = await getSessionStreamData(id)
  const availableClients = await getAvailableClients(id, user.id)

  if (!streamData) {
    notFound()
  }

  return (
    <div className="container mx-auto py-4 px-2 sm:px-4 max-w-5xl">
      <IntervalSessionDashboard
        sessionId={id}
        businessSlug={businessSlug}
        initialData={streamData}
        initialAvailableClients={availableClients}
      />
    </div>
  )
}
