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
import { RolePageFrame, RolePageHeader } from '@/components/layouts/role-shell/RolePage'
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
    <RolePageFrame contentClassName="max-w-5xl">
      <RolePageHeader
        eyebrow="Coach"
        title={
          <span className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-300" />
            {session.name || (isSv ? 'Intervallsession' : 'Interval session')} - {isSv ? 'Analys' : 'Analysis'}
          </span>
        }
        description={
          <>
            {session.teamName && `${session.teamName} | `}
            {new Date(session.startedAt).toLocaleDateString(isSv ? 'sv-SE' : 'en-US')}
            {session.participantCount > 0 &&
              ` | ${session.participantCount} ${isSv ? 'atleter' : session.participantCount === 1 ? 'athlete' : 'athletes'}`}
          </>
        }
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={`/${businessSlug}/coach/interval-sessions/${id}`}>
              <ArrowLeft className="h-4 w-4" />
              {isSv ? 'Till session' : 'Back to session'}
            </Link>
          </Button>
        }
      />

      <IntervalAnalysisView sessionId={id} />
    </RolePageFrame>
  )
}
