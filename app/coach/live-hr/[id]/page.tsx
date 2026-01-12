/**
 * Live HR Session Detail Page
 *
 * Displays real-time HR monitoring for a specific session.
 */

import { requireCoach } from '@/lib/auth-utils'
import { getSession, getAvailableClients } from '@/lib/live-hr/session-service'
import { getSessionStreamData } from '@/lib/live-hr/reading-service'
import { LiveHRDashboard } from '@/components/coach/live-hr/LiveHRDashboard'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function LiveHRSessionPage({ params }: PageProps) {
  const user = await requireCoach()
  const { id } = await params

  // Get session data
  const session = await getSession(id)

  if (!session) {
    notFound()
  }

  // Verify ownership
  if (session.coachId !== user.id) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-lg font-medium">Åtkomst nekad</h2>
            <p className="text-muted-foreground mb-4">Du har inte behörighet att visa denna session.</p>
            <Link href="/coach/live-hr">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Tillbaka
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Get stream data for initial render
  const streamData = await getSessionStreamData(id)
  if (!streamData) {
    notFound()
  }

  // Get available clients
  const availableClients = await getAvailableClients(id, user.id)

  return (
    <div className="container mx-auto py-8">
      <LiveHRDashboard
        sessionId={id}
        initialData={streamData}
        initialAvailableClients={availableClients}
      />
    </div>
  )
}
