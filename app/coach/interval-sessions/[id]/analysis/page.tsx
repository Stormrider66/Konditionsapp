/**
 * Legacy Interval Session Analysis Page (non-business coaches)
 */

import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { getSession } from '@/lib/interval-session/session-service'
import { IntervalAnalysisView } from '@/components/coach/interval-session/IntervalAnalysisView'
import { Button } from '@/components/ui/button'
import { ArrowLeft, BarChart3 } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function IntervalSessionAnalysisPage({ params }: PageProps) {
  const user = await requireCoach()
  const { id } = await params

  const session = await getSession(id)

  if (!session || session.coachId !== user.id) {
    notFound()
  }

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/coach/interval-sessions/${id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 dark:text-white">
            <BarChart3 className="h-6 w-6" />
            {session.name || 'Intervallsession'} - Analys
          </h1>
          <p className="text-sm text-muted-foreground">
            {session.teamName && `${session.teamName} | `}
            {new Date(session.startedAt).toLocaleDateString('sv-SE')}
            {session.participantCount > 0 && ` | ${session.participantCount} atleter`}
          </p>
        </div>
      </div>

      <IntervalAnalysisView sessionId={id} />
    </div>
  )
}
