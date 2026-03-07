/**
 * Legacy Live Interval Session Page (non-business coaches)
 */

import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import {
  getSession,
  getSessionStreamData,
  getAvailableClients,
} from '@/lib/interval-session/session-service'
import { IntervalSessionDashboard } from '@/components/coach/interval-session/IntervalSessionDashboard'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function IntervalSessionPage({ params }: PageProps) {
  const user = await requireCoach()
  const { id } = await params

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
        initialData={streamData}
        initialAvailableClients={availableClients}
      />
    </div>
  )
}
