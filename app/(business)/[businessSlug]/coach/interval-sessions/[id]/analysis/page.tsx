/**
 * Interval Session Analysis Page
 *
 * Post-session charts and comparison tables.
 */

import { notFound } from 'next/navigation'
import { requireCoach } from '@/lib/auth-utils'
import { validateBusinessMembership } from '@/lib/business-context'
import { getSession } from '@/lib/interval-session/session-service'
import { IntervalAnalysisView } from '@/components/coach/interval-session/IntervalAnalysisView'
import { Button } from '@/components/ui/button'
import { getLocale, type Locale } from '@/i18n/server'
import { ArrowLeft, BarChart3 } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  params: Promise<{
    businessSlug: string
    id: string
  }>
}

export default async function IntervalSessionAnalysisPage({ params }: PageProps) {
  const { businessSlug, id } = await params
  const locale = (await getLocale()) as Locale
  const isSv = locale === 'sv'
  const user = await requireCoach()

  const membership = await validateBusinessMembership(user.id, businessSlug)
  if (!membership) {
    notFound()
  }

  const session = await getSession(id)

  if (!session || session.coachId !== user.id) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${businessSlug}/coach/interval-sessions/${id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 dark:text-white">
            <BarChart3 className="h-6 w-6" />
            {session.name || (isSv ? 'Intervallsession' : 'Interval session')} - {isSv ? 'Analys' : 'Analysis'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {session.teamName && `${session.teamName} | `}
            {new Date(session.startedAt).toLocaleDateString(isSv ? 'sv-SE' : 'en-US')}
            {session.participantCount > 0 &&
              ` | ${session.participantCount} ${isSv ? 'atleter' : session.participantCount === 1 ? 'athlete' : 'athletes'}`}
          </p>
        </div>
      </div>

      <IntervalAnalysisView sessionId={id} />
    </div>
  )
}
